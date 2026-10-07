import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { publicPlatformScript } from "./_core/publicConfig";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { applyPaymentResult, getCategories, getOrderTracking, getProductBySlug, listCatalog } from "./commerce";
import { verifyMomoIpn, verifyVnpayReturn } from "./payment";

function apiRateLimit(windowMs = 60_000, max = 180) {
  const buckets = new Map<string, { startedAt: number; count: number }>();
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || now - current.startedAt > windowMs) {
      buckets.set(key, { startedAt: now, count: 1 });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    return next();
  };
}

function sameOriginMutation(req: express.Request) {
  const origin = req.get("origin") ?? req.get("referer");
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host;
    const forwardedHost = (req.get("x-forwarded-host") ?? req.get("host") ?? "").split(",")[0]?.trim();
    return originHost === forwardedHost;
  } catch {
    return false;
  }
}

export async function createApp(): Promise<Express> {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  app.use("/api", apiRateLimit());
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const isPaymentCallback = req.path.startsWith("/payments/");
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !isPaymentCallback && !sameOriginMutation(req)) {
      res.status(403).json({ error: "Cross-site mutation blocked" });
      return;
    }
    next();
  });
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  const redirectToOrder = (res: express.Response, orderNumber: string, payment: string) => {
    const origin = process.env.PUBLIC_ORIGIN?.replace(/\/$/, "") || "";
    res.redirect(302, `${origin}/order-success/${encodeURIComponent(orderNumber)}?payment=${encodeURIComponent(payment)}`);
  };
  app.get("/api/payments/vnpay/return", async (req, res) => {
    try {
      const result = verifyVnpayReturn(Object.fromEntries(Object.entries(req.query).map(([key, value]) => [key, String(value ?? "")])));
      if (!result.valid) {
        redirectToOrder(res, result.orderNumber || "unknown", "invalid-signature");
        return;
      }
      await applyPaymentResult({ provider: "vnpay", providerOrderId: result.orderNumber, providerTransactionId: result.providerTransactionId, amount: result.amount, success: result.success, responseCode: result.responseCode });
      redirectToOrder(res, result.orderNumber, result.success ? "success" : "failed");
    } catch {
      redirectToOrder(res, String(req.query.vnp_TxnRef || "unknown"), "failed");
    }
  });
  app.get("/api/payments/momo/return", async (req, res) => {
    try {
      const result = verifyMomoIpn(Object.fromEntries(Object.entries(req.query).map(([key, value]) => [key, String(value ?? "")])));
      if (!result.valid) {
        redirectToOrder(res, result.orderNumber || "unknown", "invalid-signature");
        return;
      }
      await applyPaymentResult({ provider: "momo", providerOrderId: result.orderNumber, providerTransactionId: result.providerTransactionId, amount: result.amount, success: result.success, responseCode: result.responseCode });
      redirectToOrder(res, result.orderNumber, result.success ? "success" : "failed");
    } catch {
      redirectToOrder(res, String(req.query.orderId || "unknown"), "failed");
    }
  });
  app.post("/api/payments/momo/ipn", async (req, res) => {
    try {
      const result = verifyMomoIpn(req.body as Record<string, unknown>);
      if (!result.valid) {
        res.status(400).json({ resultCode: 4, message: "Invalid signature" });
        return;
      }
      await applyPaymentResult({ provider: "momo", providerOrderId: result.orderNumber, providerTransactionId: result.providerTransactionId, amount: result.amount, success: result.success, responseCode: result.responseCode });
      res.status(200).json({ resultCode: 0, message: "Success" });
    } catch {
      res.status(200).json({ resultCode: 1, message: "Payment processing failed" });
    }
  });
  // Short JSON responses work on serverless hosts; long-lived SSE connections do not.
  app.get("/api/orders/:orderNumber/events", async (req, res) => {
    const orderNumber = String(req.params.orderNumber || "");
    const phone = String(req.query.phone || "");
    const tracking = await getOrderTracking(orderNumber, phone);
    if (!tracking) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.set("Cache-Control", "no-store").json(tracking);
  });
  const sitemapHandler: express.RequestHandler = async (_req, res) => {
    const origin = process.env.PUBLIC_ORIGIN?.replace(/\/$/, "");
    res.type("application/xml").set("Cache-Control", "public, max-age=300");
    if (!origin) {
      res.send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
      return;
    }
    const [categoryRows, catalog] = await Promise.all([getCategories(), listCatalog({ pageSize: 48 })]);
    const urls = ["/", "/policies/privacy", "/policies/terms", "/policies/shipping", "/policies/returns", ...categoryRows.map(category => `/collections/${category.slug}`), ...catalog.products.map(product => `/products/${product.slug}`)];
    res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${origin}${path}</loc></url>`).join("")}</urlset>`);
  };
  app.get(["/sitemap.xml", "/api/sitemap.xml"], sitemapHandler);
  app.get("/products/:slug", async (req, res, next) => {
    const product = await getProductBySlug(req.params.slug);
    if (!product) {
      res.status(404).type("html").send("<!doctype html><html lang=\"vi\"><head><title>Không tìm thấy sản phẩm – ShoeHub</title><meta name=\"robots\" content=\"noindex,nofollow\"></head><body><h1>Không tìm thấy sản phẩm</h1></body></html>");
      return;
    }
    next();
  });
  app.get("/collections/:slug", async (req, res, next) => {
    if (req.params.slug === "all") { next(); return; }
    const category = (await getCategories()).find(item => item.slug === req.params.slug);
    if (!category) {
      res.status(404).type("html").send("<!doctype html><html lang=\"vi\"><head><title>Không tìm thấy danh mục – ShoeHub</title><meta name=\"robots\" content=\"noindex,nofollow\"></head><body><h1>Không tìm thấy danh mục</h1></body></html>");
      return;
    }
    next();
  });
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));
  return app;
}
