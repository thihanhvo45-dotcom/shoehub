import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router, sellerProcedure } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { consumeAuthAttempt, hashPassword, verifyPassword } from "./password-auth";
import { createPasswordUser, getUserByEmail } from "./db";
import {
  createOrder,
  createCoupon,
  createPaymentTransaction,
  adjustInventory,
  getAdminAnalytics,
  getAdminCoupons,
  getAdminCustomers,
  getAdminInventory,
  getAdminOrders,
  getAdminSummary,
  getCategories,
  getOrderForGuest,
  getOrderForUser,
  getOrdersForUser,
  getProductBySlug,
  listAdminProducts,
  listCatalog,
  updateOrderStatus,
  updateProduct,
} from "./commerce";
import { buildMomoPayment, buildVnpayPaymentUrl, paymentProviderStatus } from "./payment";

const catalogInput = z.object({
  category: z.string().trim().max(128).optional(),
  search: z.string().trim().max(100).optional(),
  size: z.string().trim().max(16).optional(),
  color: z.string().trim().max(50).optional(),
  minPrice: z.number().int().min(0).max(100000000).optional(),
  maxPrice: z.number().int().min(0).max(100000000).optional(),
  sort: z.enum(["featured", "newest", "price-asc", "price-desc"]).optional(),
  featured: z.boolean().optional(),
  page: z.number().int().min(1).max(1000).optional(),
  pageSize: z.number().int().min(1).max(48).optional(),
});

const orderInput = z.object({
  email: z.string().trim().email().max(320).optional(),
  recipientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[0-9+()\-\s]{8,30}$/),
  addressLine: z.string().trim().min(2).max(255),
  ward: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  province: z.string().trim().min(2).max(120),
  note: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["cod", "manual", "vnpay", "momo"]).default("cod"),
  fulfillmentMethod: z.enum(["delivery", "pickup"]).default("delivery"),
  mapsUrl: z.string().trim().url().max(500).optional(),
  couponCode: z.string().trim().max(64).optional(),
  idempotencyKey: z.string().trim().min(16).max(100),
  items: z.array(z.object({
    variantId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(50),
});

function publicCheckoutMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const allowed = ["Giỏ hàng", "Một sản phẩm", "Số lượng", "Sản phẩm", "Mã giảm giá", "Tồn kho", "Không thể tạo"];
  return allowed.some(prefix => message.startsWith(prefix)) ? message : "Không thể tạo đơn hàng, vui lòng thử lại.";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      const { passwordHash: _passwordHash, ...publicUser } = ctx.user;
      return publicUser;
    }),
    register: publicProcedure.input(z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(320).transform(value => value.toLowerCase()),
      password: z.string().min(10).max(128),
      role: z.enum(["buyer", "seller"]),
    })).mutation(async ({ input, ctx }) => {
      if (!consumeAuthAttempt(`register:${ctx.req.ip}`, 5)) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Bạn đã tạo quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút." });
      const existing = await getUserByEmail(input.email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email này đã có tài khoản. Hãy đăng nhập hoặc dùng email khác." });
      let user;
      try {
        user = await createPasswordUser({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password), role: input.role });
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "Email này đã có tài khoản. Hãy đăng nhập hoặc dùng email khác." });
        throw error;
      }
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: ONE_YEAR_MS });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
      const { passwordHash: _passwordHash, ...publicUser } = user;
      return publicUser;
    }),
    login: publicProcedure.input(z.object({
      email: z.string().trim().email().max(320).transform(value => value.toLowerCase()),
      password: z.string().min(1).max(128),
    })).mutation(async ({ input, ctx }) => {
      const email = input.email.toLowerCase();
      if (!consumeAuthAttempt(`login:${ctx.req.ip}:${email}`, 10)) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút." });
      const user = await getUserByEmail(email);
      const valid = user?.passwordHash ? await verifyPassword(input.password, user.passwordHash) : false;
      if (!user || !valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email hoặc mật khẩu không đúng." });
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "", expiresInMs: ONE_YEAR_MS });
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
      const { passwordHash: _passwordHash, ...publicUser } = user;
      return publicUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    categories: publicProcedure.query(() => getCategories()),
    list: publicProcedure.input(catalogInput.optional()).query(({ input }) => listCatalog(input ?? {})),
    bySlug: publicProcedure.input(z.object({ slug: z.string().trim().min(1).max(160) })).query(({ input }) => getProductBySlug(input.slug)),
  }),
  checkout: router({
    providers: publicProcedure.query(() => paymentProviderStatus()),
    createOrder: publicProcedure.input(orderInput).mutation(async ({ input, ctx }) => {
      try {
        return await createOrder({
          userId: ctx.user?.id,
          guestEmail: input.email ?? ctx.user?.email ?? undefined,
          recipientName: input.recipientName,
          phone: input.phone,
          addressLine: input.addressLine,
          ward: input.ward,
          district: input.district,
          province: input.province,
          note: input.note,
          paymentMethod: input.paymentMethod,
          fulfillmentMethod: input.fulfillmentMethod,
          mapsUrl: input.mapsUrl,
          couponCode: input.couponCode,
          idempotencyKey: input.idempotencyKey,
          items: input.items,
        });
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: publicCheckoutMessage(error) });
      }
    }),
    createPayment: publicProcedure.input(orderInput.extend({ paymentMethod: z.enum(["vnpay", "momo"]) })).mutation(async ({ input, ctx }) => {
      try {
        const status = paymentProviderStatus();
        if (!status[input.paymentMethod]) throw new Error(`${input.paymentMethod === "vnpay" ? "VNPay" : "MoMo"} chưa được cấu hình`);
        const order = await createOrder({ ...input, userId: ctx.user?.id, guestEmail: input.email ?? ctx.user?.email ?? undefined });
        await createPaymentTransaction({ orderNumber: order.orderNumber, provider: input.paymentMethod, providerOrderId: order.orderNumber, amount: order.total });
        const payment = input.paymentMethod === "vnpay"
          ? { paymentUrl: buildVnpayPaymentUrl({ orderNumber: order.orderNumber, amount: order.total, ipAddress: ctx.req.ip }), provider: "vnpay" as const }
          : { ...(await buildMomoPayment({ orderNumber: order.orderNumber, amount: order.total, recipientName: input.recipientName, phone: input.phone, email: input.email })), provider: "momo" as const };
        return { ...order, ...payment };
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: publicCheckoutMessage(error) });
      }
    }),
  }),
  orders: router({
    lookup: publicProcedure.input(z.object({
      orderNumber: z.string().trim().min(6).max(40),
      phone: z.string().trim().regex(/^[0-9+()\-\s]{8,30}$/),
    })).query(async ({ input }) => {
      const order = await getOrderForGuest(input.orderNumber, input.phone);
      return order ? { found: true as const, order } : { found: false as const, order: null };
    }),
  }),
  account: router({
    orders: protectedProcedure.query(({ ctx }) => getOrdersForUser(ctx.user)),
    order: protectedProcedure.input(z.object({ orderNumber: z.string().trim().min(3).max(40) })).query(({ ctx, input }) => getOrderForUser(ctx.user, input.orderNumber)),
  }),
  seller: router({
    profile: sellerProcedure.query(({ ctx }) => {
      const { passwordHash: _passwordHash, ...profile } = ctx.user;
      return profile;
    }),
  }),
  admin: router({
    summary: adminProcedure.query(() => getAdminSummary()),
    analytics: adminProcedure.input(z.object({ days: z.number().int().min(1).max(31).optional() }).optional()).query(({ input }) => getAdminAnalytics(input?.days ?? 14)),
    orders: adminProcedure.query(() => getAdminOrders()),
    products: adminProcedure.query(() => listAdminProducts()),
    inventory: adminProcedure.query(() => getAdminInventory()),
    customers: adminProcedure.query(() => getAdminCustomers()),
    coupons: adminProcedure.query(() => getAdminCoupons()),
    updateOrderStatus: adminProcedure.input(z.object({
      orderId: z.number().int().positive(),
      orderStatus: z.enum(["pending", "confirmed", "packing", "shipping", "completed", "cancelled", "refunded"]),
    })).mutation(({ input, ctx }) => updateOrderStatus(ctx.user, input.orderId, input.orderStatus)),
    updateProduct: adminProcedure.input(z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(2).max(200).optional(),
      price: z.number().int().positive().max(100000000).optional(),
      featured: z.boolean().optional(),
      status: z.enum(["active", "draft", "archived"]).optional(),
    })).mutation(({ input, ctx }) => updateProduct(ctx.user, input)),
    adjustInventory: adminProcedure.input(z.object({ variantId: z.number().int().positive(), onHand: z.number().int().min(0).max(1000000), lowStockThreshold: z.number().int().min(0).max(1000000) })).mutation(({ input, ctx }) => adjustInventory(ctx.user, input)),
    createCoupon: adminProcedure.input(z.object({
      code: z.string().trim().min(3).max(64),
      type: z.enum(["percent", "fixed"]),
      value: z.number().int().positive().max(100000000),
      minSubtotal: z.number().int().min(0).max(100000000).default(0),
      usageLimit: z.number().int().positive().max(1000000).optional(),
    })).mutation(({ input, ctx }) => createCoupon(ctx.user, input)),
  }),
});

export type AppRouter = typeof appRouter;
