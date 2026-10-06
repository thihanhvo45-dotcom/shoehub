import { asc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { categories, coupons, inventory, productImages, productVariants, products } from "../drizzle/schema";
import { getFallbackProducts } from "./commerce";

const categorySeeds = [
  { slug: "ban-chay", name: "Bán chạy", description: "Những đôi được cộng đồng ShoeHub chọn nhiều nhất.", sortOrder: 1 },
  { slug: "hang-ngay", name: "Đi hằng ngày", description: "Sneaker dễ phối cho nhịp sống thành thị.", sortOrder: 2 },
  { slug: "chay-tap", name: "Chạy & tập", description: "Êm nhẹ, thoáng chân cho những buổi vận động.", sortOrder: 3 },
  { slug: "outdoor", name: "Outdoor", description: "Bám đường tốt cho những ngày muốn đi xa hơn.", sortOrder: 4 },
];

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  const fallback = getFallbackProducts();

  await db.transaction(async tx => {
    const currentCategories = await tx.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
    const categoryIds = new Map<string, number>();
    for (let index = 0; index < categorySeeds.length; index += 1) {
      const seed = categorySeeds[index];
      const current = currentCategories[index];
      if (current) {
        await tx.update(categories).set({ ...seed, active: 1 }).where(eq(categories.id, current.id));
        categoryIds.set(seed.slug, current.id);
      } else {
        await tx.insert(categories).values({ ...seed, active: 1 });
        const created = await tx.select({ id: categories.id }).from(categories).where(eq(categories.slug, seed.slug)).limit(1);
        if (created[0]) categoryIds.set(seed.slug, created[0].id);
      }
    }

    const currentProducts = await tx.select().from(products).orderBy(asc(products.id));
    const usedProductIds = new Set<number>();
    for (let index = 0; index < fallback.length; index += 1) {
      const product = fallback[index];
      const bySlug = currentProducts.find(row => row.slug === product.slug);
      const current = bySlug ?? currentProducts[index];
      const categoryId = product.categorySlug ? categoryIds.get(product.categorySlug) ?? null : null;
      let productId = current?.id;
      const values = { slug: product.slug, name: product.name, shortDescription: product.shortDescription, description: product.description, brand: product.brand, categoryId, status: "active" as const, featured: product.featured ? 1 : 0, tags: product.tags.join(","), seoTitle: product.seoTitle, seoDescription: product.seoDescription };
      if (productId) await tx.update(products).set(values).where(eq(products.id, productId));
      else {
        await tx.insert(products).values(values);
        const created = await tx.select({ id: products.id }).from(products).where(eq(products.slug, product.slug)).limit(1);
        productId = created[0]?.id;
      }
      if (!productId) throw new Error(`Không thể tạo sản phẩm ${product.slug}`);
      usedProductIds.add(productId);

      const oldImages = await tx.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder));
      for (let imageIndex = 0; imageIndex < product.images.length; imageIndex += 1) {
        const image = product.images[imageIndex];
        const old = oldImages[imageIndex];
        if (old) await tx.update(productImages).set({ url: image.url, alt: image.alt, sortOrder: imageIndex }).where(eq(productImages.id, old.id));
        else await tx.insert(productImages).values({ productId, url: image.url, alt: image.alt, sortOrder: imageIndex });
      }

      const oldVariants = await tx.select().from(productVariants).where(eq(productVariants.productId, productId)).orderBy(asc(productVariants.id));
      for (let variantIndex = 0; variantIndex < product.variants.length; variantIndex += 1) {
        const variant = product.variants[variantIndex];
        const oldVariant = oldVariants[variantIndex];
        let variantId = oldVariant?.id;
        if (variantId) await tx.update(productVariants).set({ sku: variant.sku, size: variant.size, color: variant.color, price: variant.price, compareAtPrice: variant.compareAtPrice, active: 1 }).where(eq(productVariants.id, variantId));
        else {
          await tx.insert(productVariants).values({ productId, sku: variant.sku, size: variant.size, color: variant.color, price: variant.price, compareAtPrice: variant.compareAtPrice, active: 1 });
          const created = await tx.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.sku, variant.sku)).limit(1);
          variantId = created[0]?.id;
        }
        if (!variantId) throw new Error(`Không thể tạo variant ${variant.sku}`);
        const currentInventory = await tx.select({ id: inventory.id }).from(inventory).where(eq(inventory.variantId, variantId)).limit(1);
        if (currentInventory[0]) await tx.update(inventory).set({ onHand: variant.stock, lowStockThreshold: 3 }).where(eq(inventory.id, currentInventory[0].id));
        else await tx.insert(inventory).values({ variantId, onHand: variant.stock, reserved: 0, lowStockThreshold: 3 });
      }
      for (const extra of oldVariants.slice(product.variants.length)) {
        await tx.update(productVariants).set({ active: 0 }).where(eq(productVariants.id, extra.id));
      }
    }
    for (const current of currentProducts) if (!usedProductIds.has(current.id)) await tx.update(products).set({ status: "archived", featured: 0 }).where(eq(products.id, current.id));

    const existingCoupon = await tx.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, "WELCOME10")).limit(1);
    if (existingCoupon[0]) await tx.update(coupons).set({ minSubtotal: 50000, active: 1 }).where(eq(coupons.id, existingCoupon[0].id));
    else await tx.insert(coupons).values({ code: "WELCOME10", type: "percent", value: 10, minSubtotal: 50000, usageLimit: 500, usageCount: 0, active: 1 });
  });

  console.log("[Seed] ShoeHub catalog, inventory and WELCOME10 coupon are ready.");
  process.exit(0);
}

main().catch(error => { console.error("[Seed] Failed:", error); process.exitCode = 1; });
