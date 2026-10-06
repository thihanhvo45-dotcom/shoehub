export type CatalogCategory = {
  id: number;
  slug: string;
  name: string;
  description: string;
};

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

const sizes = ["39", "40", "41", "42", "43"];

function variants(baseId: number, sku: string, color: string, price: number, compareAtPrice: number | null, stock: number) {
  return sizes.map((size, index) => ({
    id: baseId + index,
    sku: `${sku}-${size}`,
    size,
    color,
    price,
    compareAtPrice,
    stock,
  }));
}

export const shoeCategories: CatalogCategory[] = [
  { id: 1, slug: "ban-chay", name: "Bán chạy", description: "Những đôi được cộng đồng ShoeHub chọn nhiều nhất." },
  { id: 2, slug: "hang-ngay", name: "Đi hằng ngày", description: "Sneaker dễ phối cho nhịp sống thành thị." },
  { id: 3, slug: "chay-tap", name: "Chạy & tập", description: "Êm nhẹ, thoáng chân cho những buổi vận động." },
  { id: 4, slug: "outdoor", name: "Outdoor", description: "Bám đường tốt cho những ngày muốn đi xa hơn." },
];

export const shoeCatalog: CatalogProduct[] = [
  {
    id: 1,
    slug: "aero-cloud-runner",
    name: "Aero Cloud Runner",
    shortDescription: "Đệm êm, thân giày thoáng và nhẹ cho mọi bước chạy.",
    description: "Aero Cloud Runner cân bằng giữa độ êm và độ ổn định, phù hợp cho những buổi chạy nhẹ, đi bộ dài hoặc ngày di chuyển liên tục.",
    brand: "ShoeHub",
    categoryId: 3,
    categorySlug: "chay-tap",
    categoryName: "Chạy & tập",
    status: "active",
    featured: true,
    tags: ["chạy bộ", "nhẹ", "thoáng"],
    images: [{ url: "/assets/shoehub-cloud-runner.jpg", alt: "Aero Cloud Runner màu trắng xám" }],
    variants: variants(101, "SH-AERO", "Trắng xám", 1890000, null, 12),
    price: 1890000,
    compareAtPrice: null,
    availableStock: 60,
    createdAt: "2026-09-10",
    seoTitle: "Aero Cloud Runner – ShoeHub",
    seoDescription: "Aero Cloud Runner, sneaker chạy bộ nhẹ và êm từ ShoeHub.",
  },
  {
    id: 2,
    slug: "terra-low",
    name: "Terra Low",
    shortDescription: "Low-top màu cam đất, điểm nhấn gọn gàng cho outfit hằng ngày.",
    description: "Terra Low mang phom low-top cổ điển với phối màu cam đất và kem, dễ kết hợp cùng denim, kaki hoặc đồ thể thao tối giản.",
    brand: "ShoeHub",
    categoryId: 2,
    categorySlug: "hang-ngay",
    categoryName: "Đi hằng ngày",
    status: "active",
    featured: true,
    tags: ["low-top", "phối đồ", "cam đất"],
    images: [{ url: "/assets/shoehub-terracotta-low.jpg", alt: "Terra Low màu cam đất và kem" }],
    variants: variants(201, "SH-TERRA", "Cam đất", 2490000, 2790000, 9),
    price: 2490000,
    compareAtPrice: 2790000,
    availableStock: 45,
    createdAt: "2026-09-11",
    seoTitle: "Terra Low – ShoeHub",
    seoDescription: "Terra Low, sneaker low-top màu cam đất dành cho phong cách hằng ngày.",
  },
  {
    id: 3,
    slug: "forest-trail",
    name: "Forest Trail",
    shortDescription: "Đế bám và sắc xanh rừng cho những chuyến đi nhiều địa hình.",
    description: "Forest Trail có phần đế bám chắc, thân giày chắc chắn và phối màu xanh rừng trầm, sẵn sàng cho những ngày khám phá ngoài phố.",
    brand: "ShoeHub",
    categoryId: 4,
    categorySlug: "outdoor",
    categoryName: "Outdoor",
    status: "active",
    featured: true,
    tags: ["outdoor", "trail", "bám đường"],
    images: [{ url: "/assets/shoehub-forest-trail.jpg", alt: "Forest Trail màu xanh rừng" }],
    variants: variants(301, "SH-FOREST", "Xanh rừng", 2190000, null, 8),
    price: 2190000,
    compareAtPrice: null,
    availableStock: 40,
    createdAt: "2026-09-12",
    seoTitle: "Forest Trail – ShoeHub",
    seoDescription: "Forest Trail, sneaker outdoor màu xanh rừng với đế bám tốt.",
  },
  {
    id: 4,
    slug: "sand-canvas",
    name: "Sand Canvas",
    shortDescription: "Canvas màu cát nhẹ nhàng, càng đi càng có chất riêng.",
    description: "Sand Canvas là đôi canvas tối giản với chất liệu mềm, phom gọn và gam màu cát dễ mặc quanh năm.",
    brand: "ShoeHub",
    categoryId: 1,
    categorySlug: "ban-chay",
    categoryName: "Bán chạy",
    status: "active",
    featured: true,
    tags: ["canvas", "tối giản", "màu cát"],
    images: [{ url: "/assets/shoehub-sand-canvas.jpg", alt: "Sand Canvas màu cát" }],
    variants: variants(401, "SH-SAND", "Cát", 1590000, null, 15),
    price: 1590000,
    compareAtPrice: null,
    availableStock: 75,
    createdAt: "2026-09-13",
    seoTitle: "Sand Canvas – ShoeHub",
    seoDescription: "Sand Canvas, đôi sneaker canvas tối giản và dễ phối từ ShoeHub.",
  },
];
