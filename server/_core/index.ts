import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { applyPaymentResult, getCategories, getOrderTracking, getProductBySlug, listCatalog } from "../commerce";
import { verifyMomoIpn, verifyVnpayReturn } from "../payment";

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

async function startServer() {
  const app = express();
  const server = createServer(app);
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
      const result = verifyMomoIpn(Object.fromEntries(Object.entries(req.query).map(([key, value]) => [key, String(value ?? "")])))
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
  app.get("/api/orders/:orderNumber/events", async (req, res) => {
    const orderNumber = String(req.params.orderNumber || "");
    const phone = String(req.query.phone || "");
    const initial = await getOrderTracking(orderNumber, phone);
    if (!initial) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.flushHeaders();
    res.write("retry: 5000\n\n");
    let previous = "";
    const send = (payload: unknown) => {
      const serialized = JSON.stringify(payload);
      if (serialized === previous) return;
      previous = serialized;
      res.write(`event: order\ndata: ${serialized}\n\n`);
    };
    send(initial);
    const timer = setInterval(async () => {
      try {
        const latest = await getOrderTracking(orderNumber, phone);
        if (!latest) {
          clearInterval(timer);
          res.end();
          return;
        }
        send(latest);
      } catch {
        res.write(": heartbeat\n\n");
      }
    }, 3000);
    req.on("close", () => clearInterval(timer));
  });
  app.get("/sitemap.xml", async (_req, res) => {
    const origin = process.env.PUBLIC_ORIGIN?.replace(/\/$/, "");
    res.type("application/xml").set("Cache-Control", "public, max-age=300");
    if (!origin) {
      res.send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
      return;
    }
    const [categoryRows, catalog] = await Promise.all([getCategories(), listCatalog({ pageSize: 48 })]);
    const urls = ["/", "/policies/privacy", "/policies/terms", "/policies/shipping", "/policies/returns", ...categoryRows.map(category => `/collections/${category.slug}`), ...catalog.products.map(product => `/products/${product.slug}`)];
    res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${origin}${path}</loc></url>`).join("")}</urlset>`);
  });
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
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  app.use("/api", (_req, res) => res.status(404).json({ error: "API route not found" }));
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
