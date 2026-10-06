import { shoeCatalog, shoeCategories, type CatalogProduct } from "@shared/catalog";

type RequestInput = RequestInfo | URL;

type StaticOrderInput = {
  items?: Array<{ variantId: number; quantity: number }>;
};

function requestUrl(input: RequestInput) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function unwrap(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return "json" in record ? record.json : value;
}

function readOperationInputs(url: URL, body: BodyInit | null | undefined) {
  if (body && typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  const raw = url.searchParams.get("input");
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function operationInput(parsed: Record<string, unknown>, index: number) {
  const entry = parsed[String(index)] ?? parsed;
  return unwrap(entry) as Record<string, unknown>;
}

function sortProducts(products: CatalogProduct[], sort: string | undefined) {
  return [...products].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    return Number(b.featured) - Number(a.featured) || b.createdAt.localeCompare(a.createdAt);
  });
}

function withBasePath(product: CatalogProduct): CatalogProduct {
  return {
    ...product,
    images: product.images.map(image => ({
      ...image,
      url: image.url.startsWith("/") ? `${import.meta.env.BASE_URL}${image.url.slice(1)}` : image.url,
    })),
  };
}

function listProducts(input: Record<string, unknown>) {
  const search = typeof input.search === "string" ? input.search.trim().toLowerCase() : "";
  const category = typeof input.category === "string" ? input.category : undefined;
  const size = typeof input.size === "string" ? input.size : undefined;
  const color = typeof input.color === "string" ? input.color : undefined;
  const minPrice = typeof input.minPrice === "number" ? input.minPrice : undefined;
  const maxPrice = typeof input.maxPrice === "number" ? input.maxPrice : undefined;
  const featured = input.featured === true;
  const page = Math.max(1, typeof input.page === "number" ? input.page : 1);
  const pageSize = Math.min(48, Math.max(1, typeof input.pageSize === "number" ? input.pageSize : 12));
  const filtered = shoeCatalog.filter(product => {
    if (category && product.categorySlug !== category) return false;
    if (featured && !product.featured) return false;
    if (search && ![product.name, product.brand, product.shortDescription, product.tags.join(" ")].join(" ").toLowerCase().includes(search)) return false;
    if (size && !product.variants.some(variant => variant.size === size && variant.stock > 0)) return false;
    if (color && !product.variants.some(variant => variant.color === color && variant.stock > 0)) return false;
    if (minPrice !== undefined && product.price < minPrice) return false;
    if (maxPrice !== undefined && product.price > maxPrice) return false;
    return product.availableStock > 0;
  });
  const sorted = sortProducts(filtered, typeof input.sort === "string" ? input.sort : undefined);
  return { products: sorted.slice((page - 1) * pageSize, page * pageSize), total: sorted.length, page, pageSize };
}

function orderResponse(input: StaticOrderInput) {
  const subtotal = (input.items ?? []).reduce((total, item) => {
    const product = shoeCatalog.find(candidate => candidate.variants.some(variant => variant.id === item.variantId));
    const variant = product?.variants.find(candidate => candidate.id === item.variantId);
    return total + (variant?.price ?? 0) * item.quantity;
  }, 0);
  const shippingFee = subtotal >= 3000000 ? 0 : 30000;
  return {
    orderNumber: `SH-DEMO-${Date.now().toString(36).toUpperCase()}`,
    orderStatus: "pending",
    paymentStatus: "pending",
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
  };
}

function staticData(operation: string, input: Record<string, unknown>, method: string) {
  if (operation === "catalog.categories") return shoeCategories;
  if (operation === "catalog.list") {
    const result = listProducts(input);
    return { ...result, products: result.products.map(withBasePath) };
  }
  if (operation === "catalog.bySlug") {
    const product = shoeCatalog.find(candidate => candidate.slug === input.slug);
    return product ? withBasePath(product) : null;
  }
  if (operation === "checkout.providers") return { vnpay: false, momo: false };
  if (operation === "checkout.createOrder" || operation === "checkout.createPayment") return orderResponse(input as StaticOrderInput);
  if (operation === "orders.lookup") return { found: false, order: null };
  if (operation === "auth.me") return null;
  if (operation === "account.orders") return [];
  if (operation.startsWith("admin.")) return operation === "admin.summary" || operation === "admin.analytics" ? {} : [];
  if (method === "GET") return null;
  return {};
}

export function staticTrpcResponse(input: RequestInput, init?: RequestInit) {
  const url = new URL(requestUrl(input), window.location.origin);
  const path = url.pathname.split("/api/trpc/")[1] ?? "";
  const operations = path.split(",").filter(Boolean);
  const parsed = readOperationInputs(url, init?.body);
  const payload = operations.map((operation, index) => ({ result: { data: { json: staticData(operation, operationInput(parsed, index), init?.method ?? "GET") } } }));
  return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json", "trpc-accept": "application/json" } });
}

export async function fetchWithStaticFallback(input: RequestInput, init?: RequestInit) {
  try {
    const response = await globalThis.fetch(input, init);
    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && contentType.includes("json")) return response;
    return staticTrpcResponse(input, init);
  } catch {
    return staticTrpcResponse(input, init);
  }
}
