import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { getCategories, getProductBySlug } from "../commerce";

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
}

async function applyPublicSeo(requestUrl: string, template: string) {
  const parsed = new URL(requestUrl, "http://shoehub.local");
  let title = "ShoeHub – Sneaker chọn kỹ";
  let description = "ShoeHub tuyển chọn sneaker tối giản, dễ phối và giao hàng toàn quốc.";
  let jsonLd: Record<string, unknown> | null = null;
  if (parsed.pathname.startsWith("/products/")) {
    const product = await getProductBySlug(parsed.pathname.split("/")[2] ?? "");
    if (product) {
      title = `${product.name} – ShoeHub`;
      description = product.seoDescription ?? product.shortDescription;
      jsonLd = { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description, brand: { "@type": "Brand", name: product.brand }, image: product.images.map(image => image.url), offers: { "@type": "Offer", priceCurrency: "VND", price: product.price, availability: product.availableStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } };
    }
  } else if (parsed.pathname.startsWith("/collections/")) {
    const slug = parsed.pathname.split("/")[2];
    const category = (await getCategories()).find(item => item.slug === slug);
    if (category) { title = `${category.name} – ShoeHub`; description = category.description ?? description; }
  }
  let output = template.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`).replace(/<meta name="description" content=".*?"\s*\/>/s, `<meta name="description" content="${escapeHtml(description)}" />`);
  const origin = process.env.PUBLIC_ORIGIN?.replace(/\/$/, "");
  if (origin) output = output.replace("</head>", `<link rel="canonical" href="${escapeHtml(`${origin}${parsed.pathname}`)}" /></head>`);
  if (jsonLd) output = output.replace("</head>", `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script></head>`);
  return output;
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      template = await applyPublicSeo(url, template);
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html", "Cache-Control": "no-cache" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", async (req, res, next) => {
    res.setHeader("Cache-Control", "no-cache");
    try {
      const template = await fs.promises.readFile(path.resolve(distPath, "index.html"), "utf-8");
      res.type("html").send(await applyPublicSeo(req.originalUrl, template));
    } catch (error) {
      next(error);
    }
  });
}
