import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import {
  auditLogs,
  categories,
  coupons,
  couponUsages,
  inventory,
  orderItems,
  orderEvents,
  orders,
  paymentTransactions,
  productImages,
  productVariants,
  products,
  users,
  type User,
} from "../drizzle/schema";
import { shoeCatalog, shoeCategories } from "../shared/catalog";

export type CatalogProduct = {
  id: number;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  brand: string;
  categoryId: number | null;
  categorySlug?: string;
  categoryName?: string;
  status: "active" | "draft" | "archived";
  featured: boolean;
  tags: string[];
  images: Array<{ url: string; alt: string }>;
  variants: Array<{
    id: number;
    sku: string;
    size: string;
    color: string;
    price: number;
    compareAtPrice: number | null;
    stock: number;
  }>;
  price: number;
  compareAtPrice: number | null;
  availableStock: number;
  createdAt: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type CatalogFilters = {
  category?: string;
  search?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "featured" | "newest" | "price-asc" | "price-desc";
  featured?: boolean;
  page?: number;
  pageSize?: number;
};

const fallbackProducts = shoeCatalog;

function toIso(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function normalizeTags(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
}

async function hydrateRows(rows: Array<typeof products.$inferSelect>) {
  const db = await getDb();
  if (!db || rows.length === 0) return [] as CatalogProduct[];
  const productIds = rows.map(row => row.id);
  const [variantRows, imageRows, categoryRows] = await Promise.all([
    db
      .select()
      .from(productVariants)
      .where(and(inArray(productVariants.productId, productIds), eq(productVariants.active, 1)))
      .orderBy(asc(productVariants.size)),
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.sortOrder)),
    db
      .select()
      .from(categories)
      .where(
        inArray(
          categories.id,
          rows
            .map(row => row.categoryId)
            .filter((id): id is number => id !== null)
        )
      ),
  ]);
  const variantIds = variantRows.map(row => row.id);
  const inventoryRows =
    variantIds.length > 0
      ? await db
          .select()
          .from(inventory)
          .where(inArray(inventory.variantId, variantIds))
      : [];
  const stockByVariant = new Map(
    inventoryRows.map(row => [
      row.variantId,
      Math.max(0, row.onHand - row.reserved),
    ])
  );
  const categoryById = new Map(categoryRows.map(row => [row.id, row]));

  return rows.map(row => {
    const rowVariants = variantRows
      .filter(variant => variant.productId === row.id)
      .map(variant => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        stock: stockByVariant.get(variant.id) ?? 0,
      }));
    const rowImages = imageRows
      .filter(image => image.productId === row.id)
      .map(image => ({ url: image.url, alt: image.alt }));
    const price =
      rowVariants.length > 0
        ? Math.min(...rowVariants.map(variant => variant.price))
        : 0;
    const compareAtPrice =
      rowVariants.find(variant => variant.compareAtPrice !== null)
        ?.compareAtPrice ?? null;
    const category = row.categoryId
      ? categoryById.get(row.categoryId)
      : undefined;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      shortDescription: row.shortDescription ?? "",
      description: row.description ?? "",
      brand: row.brand,
      categoryId: row.categoryId,
      categorySlug: category?.slug,
      categoryName: category?.name,
      status: row.status,
      featured: Boolean(row.featured),
      tags: normalizeTags(row.tags),
      images: rowImages,
      variants: rowVariants,
      price,
      compareAtPrice,
      availableStock: rowVariants.reduce(
        (sum, variant) => sum + variant.stock,
        0
      ),
      createdAt: toIso(row.createdAt),
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
    } satisfies CatalogProduct;
  });
}

function filterProducts(
  productsToFilter: CatalogProduct[],
  filters: CatalogFilters
) {
  const search = filters.search?.trim().toLowerCase();
  const filtered = productsToFilter.filter(product => {
    if (filters.category && product.categorySlug !== filters.category)
      return false;
    if (filters.featured && !product.featured) return false;
    if (
      search &&
      ![
        product.name,
        product.brand,
        product.shortDescription,
        product.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    )
      return false;
    if (
      filters.size &&
      !product.variants.some(
        variant => variant.size === filters.size && variant.stock > 0
      )
    )
      return false;
    if (
      filters.color &&
      !product.variants.some(
        variant => variant.color === filters.color && variant.stock > 0
      )
    )
      return false;
    if (filters.minPrice !== undefined && product.price < filters.minPrice)
      return false;
    if (filters.maxPrice !== undefined && product.price > filters.maxPrice)
      return false;
    return product.availableStock > 0;
  });
  return filtered.sort((a, b) => {
    if (filters.sort === "price-asc") return a.price - b.price;
    if (filters.sort === "price-desc") return b.price - a.price;
    if (filters.sort === "newest")
      return b.createdAt.localeCompare(a.createdAt);
    return (
      Number(b.featured) - Number(a.featured) ||
      b.createdAt.localeCompare(a.createdAt)
    );
  });
}

export async function listCatalog(filters: CatalogFilters = {}) {
  const db = await getDb();
  if (!db) {
    const filtered = filterProducts(fallbackProducts, filters);
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12));
    return {
      products: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  let categoryId: number | undefined;
  if (filters.category) {
    const category = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, filters.category))
      .limit(1);
    categoryId = category[0]?.id;
    if (!categoryId)
      return {
        products: [],
        total: 0,
        page: 1,
        pageSize: filters.pageSize ?? 12,
      };
  }

  const conditions = [eq(products.status, "active" as const)];
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  if (filters.featured) conditions.push(eq(products.featured, 1));
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        like(products.name, term),
        like(products.brand, term),
        like(products.tags, term)
      )!
    );
  }
  const rows = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.createdAt));
  const hydrated = filterProducts(await hydrateRows(rows), filters);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12));
  return {
    products: hydrated.slice((page - 1) * pageSize, page * pageSize),
    total: hydrated.length,
    page,
    pageSize,
  };
}

export async function getProductBySlug(slug: string) {
  const fallback = fallbackProducts.find(product => product.slug === slug);
  const db = await getDb();
  if (!db) return fallback ?? null;
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.status, "active" as const)))
    .limit(1);
  if (rows.length === 0) return fallback ?? null;
  const hydrated = await hydrateRows(rows);
  return hydrated[0] ?? null;
}

export async function getCategories() {
  const db = await getDb();
  if (!db) return shoeCategories;
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
    })
    .from(categories)
    .where(eq(categories.active, 1))
    .orderBy(asc(categories.sortOrder));
}

export async function createOrder(input: {
  userId?: number;
  guestEmail?: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  province: string;
  note?: string;
  paymentMethod: "cod" | "manual" | "vnpay" | "momo";
  fulfillmentMethod: "delivery" | "pickup";
  mapsUrl?: string;
  couponCode?: string;
  idempotencyKey: string;
  items: Array<{ variantId: number; quantity: number }>;
}) {
  const db = await getDb();
  if (!db) {
    const number = `SH-DEMO-${nanoid(6).toUpperCase()}`;
    return { orderNumber: number, total: 0, demo: true };
  }
  if (input.items.length === 0) throw new Error("Giỏ hàng đang trống");
  const existing = await db
    .select({ orderNumber: orders.orderNumber, total: orders.total })
    .from(orders)
    .where(eq(orders.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing[0]) return { ...existing[0], reused: true };

  try {
    return await db.transaction(async tx => {
      const variantIds = input.items.map(item => item.variantId);
      const variants = await tx
        .select({ variant: productVariants, product: products })
        .from(productVariants)
        .innerJoin(products, eq(productVariants.productId, products.id))
        .where(
          and(
            inArray(productVariants.id, variantIds),
            eq(productVariants.active, 1),
            eq(products.status, "active" as const)
          )
        );
      const variantById = new Map(variants.map(row => [row.variant.id, row]));
      if (variants.length !== input.items.length)
        throw new Error("Một sản phẩm trong giỏ không còn khả dụng");

      let subtotal = 0;
      const snapshots = [] as Array<{
        variantId: number;
        productNameSnapshot: string;
        skuSnapshot: string;
        size: string;
        color: string;
        unitPrice: number;
        quantity: number;
      }>;
      for (const item of input.items) {
        const row = variantById.get(item.variantId);
        if (!row || item.quantity < 1 || item.quantity > 20)
          throw new Error("Số lượng sản phẩm không hợp lệ");
        const stock = await tx
          .select()
          .from(inventory)
          .where(eq(inventory.variantId, item.variantId))
          .limit(1);
        const available = stock[0] ? stock[0].onHand - stock[0].reserved : 0;
        if (available < item.quantity)
          throw new Error(`Sản phẩm ${row.product.name} không đủ tồn kho`);
        const unitPrice = row.variant.price;
        subtotal += unitPrice * item.quantity;
        snapshots.push({
          variantId: row.variant.id,
          productNameSnapshot: row.product.name,
          skuSnapshot: row.variant.sku,
          size: row.variant.size,
          color: row.variant.color,
          unitPrice,
          quantity: item.quantity,
        });
      }

      let discount = 0;
      let normalizedCoupon: string | null = null;
      let couponId: number | null = null;
      if (input.couponCode?.trim()) {
        normalizedCoupon = input.couponCode.trim().toUpperCase();
        const couponRows = await tx
          .select()
          .from(coupons)
          .where(and(eq(coupons.code, normalizedCoupon), eq(coupons.active, 1)))
          .limit(1);
        const coupon = couponRows[0];
        const now = new Date();
        if (
          coupon &&
          (!coupon.startsAt || coupon.startsAt <= now) &&
          (!coupon.endsAt || coupon.endsAt >= now) &&
          (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) &&
          subtotal >= coupon.minSubtotal
        ) {
          couponId = coupon.id;
          discount =
            coupon.type === "percent"
              ? Math.min(subtotal, Math.floor((subtotal * coupon.value) / 100))
              : Math.min(subtotal, coupon.value);
        } else {
          throw new Error("Mã giảm giá không hợp lệ hoặc đã hết hạn");
        }
      }
      const shippingFee =
        input.fulfillmentMethod === "pickup"
          ? 0
          : subtotal - discount >= 3000000
            ? 0
            : 30000;
      const total = subtotal - discount + shippingFee;
      const orderNumber = `SH-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${nanoid(6).toUpperCase()}`;
      await tx.insert(orders).values({
        orderNumber,
        userId: input.userId,
        guestEmail: input.guestEmail?.trim().toLowerCase() || null,
        recipientName: input.recipientName.trim(),
        phone: input.phone.trim(),
        addressLine: input.addressLine.trim(),
        ward: input.ward?.trim() || null,
        district: input.district?.trim() || null,
        province: input.province.trim(),
        subtotal,
        shippingFee,
        discount,
        total,
        couponCode: normalizedCoupon,
        orderStatus: "pending",
        paymentStatus: "pending",
        paymentMethod: input.paymentMethod,
        fulfillmentMethod: input.fulfillmentMethod,
        mapsUrl: input.mapsUrl?.trim() || null,
        idempotencyKey: input.idempotencyKey,
        note: input.note?.trim() || null,
      });
      const createdOrder = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);
      const orderId = createdOrder[0]?.id ?? 0;
      if (!orderId) throw new Error("Không thể tạo mã đơn hàng");
      for (const snapshot of snapshots) {
        const result = await tx
          .update(inventory)
          .set({ reserved: sql`${inventory.reserved} + ${snapshot.quantity}` })
          .where(
            and(
              eq(inventory.variantId, snapshot.variantId),
              sql`${inventory.onHand} - ${inventory.reserved} >= ${snapshot.quantity}`
            )
          );
        if ((result as { affectedRows?: number }).affectedRows !== 1)
          throw new Error("Tồn kho vừa thay đổi, vui lòng thử lại");
        await tx.insert(orderItems).values({ orderId, ...snapshot });
      }
      await tx.insert(orderEvents).values({
        orderId,
        orderStatus: "pending",
        paymentStatus: "pending",
        message: "Đơn hàng đã được tiếp nhận",
      });
      if (normalizedCoupon) {
        await tx
          .update(coupons)
          .set({ usageCount: sql`${coupons.usageCount} + 1` })
          .where(eq(coupons.code, normalizedCoupon));
        if (couponId)
          await tx
            .insert(couponUsages)
            .values({ couponId, orderId, userId: input.userId ?? null });
      }
      return {
        orderNumber,
        total,
        subtotal,
        shippingFee,
        discount,
        reused: false,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("orders_idempotency_unique") ||
      message.includes("Duplicate entry")
    ) {
      const retry = await db
        .select({ orderNumber: orders.orderNumber, total: orders.total })
        .from(orders)
        .where(eq(orders.idempotencyKey, input.idempotencyKey))
        .limit(1);
      if (retry[0]) return { ...retry[0], reused: true };
    }
    throw error;
  }
}

export async function getOrdersForUser(user: User) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));
  return rows.map(order => ({
    ...order,
    createdAt: toIso(order.createdAt),
    updatedAt: toIso(order.updatedAt),
  }));
}

export async function getOrderForUser(user: User, orderNumber: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, user.id), eq(orders.orderNumber, orderNumber)))
    .limit(1);
  const order = rows[0];
  if (!order) return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  return {
    ...order,
    createdAt: toIso(order.createdAt),
    updatedAt: toIso(order.updatedAt),
    items,
  };
}

export async function getAdminSummary() {
  const db = await getDb();
  if (!db)
    return { orderCount: 0, revenue: 0, pendingCount: 0, lowStockCount: 0 };
  const orderRows = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt));
  const inventoryRows = await db.select().from(inventory);
  return {
    orderCount: orderRows.length,
    revenue: orderRows
      .filter(order =>
        ["confirmed", "packing", "shipping", "completed"].includes(
          order.orderStatus
        )
      )
      .reduce((sum, order) => sum + order.total, 0),
    pendingCount: orderRows.filter(order => order.orderStatus === "pending")
      .length,
    lowStockCount: inventoryRows.filter(
      row => row.onHand - row.reserved <= row.lowStockThreshold
    ).length,
  };
}

export async function getAdminOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
}

export async function getAdminCustomers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.lastSignedIn))
    .limit(200);
}

export async function getAdminCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.id)).limit(200);
}

export async function createCoupon(
  actor: User,
  input: {
    code: string;
    type: "percent" | "fixed";
    value: number;
    minSubtotal: number;
    usageLimit?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,64}$/.test(code))
    throw new Error("Mã giảm giá không hợp lệ");
  if (input.value <= 0 || (input.type === "percent" && input.value > 100))
    throw new Error("Giá trị giảm giá không hợp lệ");
  await db
    .insert(coupons)
    .values({
      code,
      type: input.type,
      value: input.value,
      minSubtotal: input.minSubtotal,
      usageLimit: input.usageLimit ?? null,
      usageCount: 0,
      active: 1,
    });
  await db
    .insert(auditLogs)
    .values({
      actorId: actor.id,
      action: "coupon.create",
      entity: "coupon",
      entityId: code,
      metadata: JSON.stringify({
        type: input.type,
        value: input.value,
        minSubtotal: input.minSubtotal,
      }),
    });
  return { success: true } as const;
}

export async function updateOrderStatus(
  actor: User,
  orderId: number,
  orderStatus:
    | "pending"
    | "confirmed"
    | "packing"
    | "shipping"
    | "completed"
    | "cancelled"
    | "refunded"
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const currentRows = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    const current = currentRows[0];
    if (!current) throw new Error("Không tìm thấy đơn hàng");
    if (current.orderStatus === orderStatus) return { success: true } as const;
    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    if (
      ["cancelled", "refunded"].includes(orderStatus) &&
      !["cancelled", "refunded"].includes(current.orderStatus)
    ) {
      for (const item of items) {
        if (!item.variantId) continue;
        if (current.orderStatus === "completed") {
          const restocked = await tx
            .update(inventory)
            .set({ onHand: sql`${inventory.onHand} + ${item.quantity}` })
            .where(eq(inventory.variantId, item.variantId));
          if ((restocked as { affectedRows?: number }).affectedRows !== 1)
            throw new Error("Không thể hoàn tồn kho");
        } else {
          const released = await tx
            .update(inventory)
            .set({ reserved: sql`${inventory.reserved} - ${item.quantity}` })
            .where(
              and(
                eq(inventory.variantId, item.variantId),
                sql`${inventory.reserved} >= ${item.quantity}`
              )
            );
          if ((released as { affectedRows?: number }).affectedRows !== 1)
            throw new Error("Không thể giải phóng tồn kho");
        }
      }
    }

    if (orderStatus === "completed" && current.orderStatus !== "completed") {
      for (const item of items) {
        if (!item.variantId) continue;
        const consumed = await tx
          .update(inventory)
          .set({
            onHand: sql`${inventory.onHand} - ${item.quantity}`,
            reserved: sql`${inventory.reserved} - ${item.quantity}`,
          })
          .where(
            and(
              eq(inventory.variantId, item.variantId),
              sql`${inventory.onHand} >= ${item.quantity}`,
              sql`${inventory.reserved} >= ${item.quantity}`
            )
          );
        if ((consumed as { affectedRows?: number }).affectedRows !== 1)
          throw new Error("Không đủ tồn kho để hoàn tất đơn");
      }
    }

    await tx.update(orders).set({ orderStatus }).where(eq(orders.id, orderId));
    await tx
      .insert(auditLogs)
      .values({
        actorId: actor.id,
        action: "order.status.update",
        entity: "order",
        entityId: String(orderId),
        metadata: JSON.stringify({ from: current.orderStatus, orderStatus }),
      });
    await tx.insert(orderEvents).values({
      orderId,
      orderStatus,
      paymentStatus: current.paymentStatus,
      message: `Trạng thái đơn: ${orderStatus}`,
    });
    return { success: true } as const;
  });
}

export async function listAdminProducts() {
  const db = await getDb();
  if (!db) return fallbackProducts;
  const rows = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt))
    .limit(200);
  return hydrateRows(rows);
}

export async function updateProduct(
  actor: User,
  input: {
    id: number;
    name?: string;
    price?: number;
    featured?: boolean;
    status?: "active" | "draft" | "archived";
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const values: Record<string, unknown> = {};
  if (input.name !== undefined) values.name = input.name.trim().slice(0, 200);
  if (input.featured !== undefined) values.featured = input.featured ? 1 : 0;
  if (input.status !== undefined) values.status = input.status;
  if (Object.keys(values).length > 0) {
    const result = await db
      .update(products)
      .set(values)
      .where(eq(products.id, input.id));
    if ((result as { affectedRows?: number }).affectedRows !== 1)
      throw new Error("Không tìm thấy sản phẩm");
  } else {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, input.id))
      .limit(1);
    if (!existing[0]) throw new Error("Không tìm thấy sản phẩm");
  }
  if (input.price !== undefined) {
    await db
      .update(productVariants)
      .set({ price: input.price })
      .where(and(eq(productVariants.productId, input.id), eq(productVariants.active, 1)));
    values.price = input.price;
  }
  await db
    .insert(auditLogs)
    .values({
      actorId: actor.id,
      action: "product.update",
      entity: "product",
      entityId: String(input.id),
      metadata: JSON.stringify(values),
    });
  return { success: true } as const;
}

export function getFallbackProducts() {
  return fallbackProducts;
}

export async function getOrderForGuest(orderNumber: string, phone: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber.trim().toUpperCase()))
    .limit(1);
  const order = rows[0];
  const normalizePhone = (value: string) =>
    value.replace(/[^0-9]/g, "").replace(/^84/, "0");
  if (!order || normalizePhone(order.phone) !== normalizePhone(phone))
    return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));
  return {
    ...order,
    createdAt: toIso(order.createdAt),
    updatedAt: toIso(order.updatedAt),
    items,
  };
}


export async function getAdminAnalytics(days = 14) {
  const db = await getDb();
  const safeDays = Math.min(31, Math.max(1, days));
  if (!db) return { days: safeDays, daily: [], statusCounts: {}, topProducts: [], lowStock: [] };
  const start = new Date(Date.now() - (safeDays - 1) * 24 * 60 * 60 * 1000);
  const revenueStatuses = ["confirmed", "packing", "shipping", "completed"] as const;
  const [orderRows, topProducts, lowStock] = await Promise.all([
    db.select().from(orders).where(gte(orders.createdAt, start)).orderBy(asc(orders.createdAt)),
    db
      .select({
        name: orderItems.productNameSnapshot,
        quantity: sql<number>`sum(${orderItems.quantity})`,
        revenue: sql<number>`sum(${orderItems.unitPrice} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(gte(orders.createdAt, start), inArray(orders.orderStatus, revenueStatuses)))
      .groupBy(orderItems.productNameSnapshot)
      .orderBy(desc(sql`sum(${orderItems.unitPrice} * ${orderItems.quantity})`))
      .limit(8),
    db
      .select({
        variantId: productVariants.id,
        sku: productVariants.sku,
        productName: products.name,
        onHand: inventory.onHand,
        reserved: inventory.reserved,
        available: sql<number>`${inventory.onHand} - ${inventory.reserved}`,
        threshold: inventory.lowStockThreshold,
      })
      .from(inventory)
      .innerJoin(productVariants, eq(inventory.variantId, productVariants.id))
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(sql`${inventory.onHand} - ${inventory.reserved} <= ${inventory.lowStockThreshold}`)
      .orderBy(asc(sql`${inventory.onHand} - ${inventory.reserved}`))
      .limit(30),
  ]);
  const daily = Array.from({ length: safeDays }, (_, index) => {
    const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    const rows = orderRows.filter(row => toIso(row.createdAt).slice(0, 10) === key);
    return {
      date: key,
      label: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      revenue: rows.filter(row => revenueStatuses.includes(row.orderStatus as typeof revenueStatuses[number])).reduce((sum, row) => sum + row.total, 0),
      orders: rows.length,
    };
  });
  const statusCounts = orderRows.reduce<Record<string, number>>((result, row) => {
    result[row.orderStatus] = (result[row.orderStatus] ?? 0) + 1;
    return result;
  }, {});
  return { days: safeDays, daily, statusCounts, topProducts, lowStock };
}

export async function getAdminInventory() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      variantId: productVariants.id,
      productId: products.id,
      productName: products.name,
      sku: productVariants.sku,
      price: productVariants.price,
      active: productVariants.active,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
      available: sql<number>`${inventory.onHand} - ${inventory.reserved}`,
      lowStockThreshold: inventory.lowStockThreshold,
      updatedAt: inventory.updatedAt,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(inventory, eq(inventory.variantId, productVariants.id))
    .orderBy(asc(products.name), asc(productVariants.sku));
}

export async function adjustInventory(actor: User, input: { variantId: number; onHand: number; lowStockThreshold: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (input.onHand < 0 || input.lowStockThreshold < 0) throw new Error("Tồn kho không được âm");
  const current = await db.select().from(inventory).where(eq(inventory.variantId, input.variantId)).limit(1);
  if (!current[0]) throw new Error("Không tìm thấy biến thể tồn kho");
  if (input.onHand < current[0].reserved) throw new Error("Tồn kho mới không được thấp hơn số lượng đang giữ");
  await db.update(inventory).set({ onHand: input.onHand, lowStockThreshold: input.lowStockThreshold }).where(eq(inventory.variantId, input.variantId));
  await db.insert(auditLogs).values({
    actorId: actor.id,
    action: "inventory.adjust",
    entity: "inventory",
    entityId: String(input.variantId),
    metadata: JSON.stringify({ from: { onHand: current[0].onHand, lowStockThreshold: current[0].lowStockThreshold }, to: input }),
  });
  return { success: true } as const;
}

export async function createPaymentTransaction(input: { orderNumber: string; provider: "vnpay" | "momo"; providerOrderId: string; amount: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const order = await db.select({ id: orders.id, total: orders.total }).from(orders).where(eq(orders.orderNumber, input.orderNumber)).limit(1);
  if (!order[0] || order[0].total !== input.amount) throw new Error("Số tiền thanh toán không khớp đơn hàng");
  const existing = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.provider, input.provider), eq(paymentTransactions.providerOrderId, input.providerOrderId))).limit(1);
  if (existing[0]) return existing[0];
  const inserted = await db.insert(paymentTransactions).values({ orderId: order[0].id, provider: input.provider, providerOrderId: input.providerOrderId, amount: input.amount, status: "created" });
  const created = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.provider, input.provider), eq(paymentTransactions.providerOrderId, input.providerOrderId))).limit(1);
  if (!created[0]) throw new Error("Không thể lưu giao dịch thanh toán");
  return created[0];
}

export async function applyPaymentResult(input: { provider: "vnpay" | "momo"; providerOrderId: string; providerTransactionId?: string; amount: number; success: boolean; responseCode: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.transaction(async tx => {
    const orderRows = await tx.select().from(orders).where(eq(orders.orderNumber, input.providerOrderId)).limit(1);
    const order = orderRows[0];
    if (!order || order.total !== input.amount) throw new Error("Payment order không tồn tại hoặc sai số tiền");
    const paymentRows = await tx.select().from(paymentTransactions).where(and(eq(paymentTransactions.provider, input.provider), eq(paymentTransactions.providerOrderId, input.providerOrderId))).limit(1);
    const payment = paymentRows[0];
    if (!payment) throw new Error("Không tìm thấy payment transaction");
    if (payment.status === "paid") return { success: true, duplicate: true, orderNumber: order.orderNumber } as const;
    const paymentStatus = input.success ? "paid" : "failed";
    const nextOrderStatus = input.success && order.orderStatus === "pending" ? "confirmed" : order.orderStatus;
    await tx.update(paymentTransactions).set({ status: paymentStatus, providerTransactionId: input.providerTransactionId || null, responseCode: input.responseCode, paidAt: input.success ? new Date() : null }).where(eq(paymentTransactions.id, payment.id));
    await tx.update(orders).set({ paymentStatus, orderStatus: nextOrderStatus }).where(eq(orders.id, order.id));
    await tx.insert(orderEvents).values({ orderId: order.id, orderStatus: nextOrderStatus, paymentStatus, message: input.success ? "Thanh toán online thành công" : `Thanh toán thất bại (${input.responseCode})` });
    return { success: true, duplicate: false, orderNumber: order.orderNumber, paymentStatus } as const;
  });
}

export async function getOrderTracking(orderNumber: string, phone: string) {
  const db = await getDb();
  if (!db) return null;
  const order = await getOrderForGuest(orderNumber, phone);
  if (!order) return null;
  const events = await db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(asc(orderEvents.createdAt));
  return { orderNumber: order.orderNumber, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, updatedAt: order.updatedAt, events: events.map(event => ({ ...event, createdAt: toIso(event.createdAt) })) };
}
