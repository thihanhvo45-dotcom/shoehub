import { useEffect, useState } from "react";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag, Truck } from "lucide-react";
import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { addToCart, formatVnd } from "@/lib/store";
import { PageFrame, ProductGrid, type StoreCategory } from "@/components/storefront";
import { setPageSeo } from "@/lib/seo";

export default function ProductDetail() {
  const [, params] = useRoute("/products/:slug");
  const slug = params?.slug ?? "";
  const productQuery = trpc.catalog.bySlug.useQuery({ slug });
  const categoriesQuery = trpc.catalog.categories.useQuery();
  const product = productQuery.data;
  const relatedQuery = trpc.catalog.list.useQuery({ category: product?.categorySlug, pageSize: 4, sort: "featured" }, { enabled: Boolean(product?.categorySlug) });
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  useEffect(() => { if (product) setPageSeo({ title: `${product.name} – ShoeHub`, description: product.seoDescription ?? product.shortDescription, image: product.images[0]?.url }); }, [product]);
  if (productQuery.isLoading) return <PageFrame categories={categoriesQuery.data as StoreCategory[] | undefined}><main className="container private-page"><p className="loading-block">Đang tải sản phẩm…</p></main></PageFrame>;
  if (!product) return <PageFrame categories={categoriesQuery.data as StoreCategory[] | undefined}><div className="container detail-not-found"><p className="eyebrow">404</p><h1>Không tìm thấy sản phẩm</h1><p>Có thể sản phẩm đã được đổi tên hoặc tạm hết hàng.</p><Link className="button button--dark" href="/">Quay lại menu <ArrowLeft size={16} /></Link></div></PageFrame>;
  const variant = product.variants[0];
  const add = () => { if (!variant || variant.stock < 1) return; addToCart({ variantId: variant.id, productId: product.id, slug: product.slug, name: product.name, image: product.images[0]?.url ?? "", size: variant.size, color: variant.color, price: variant.price, quantity }); setAdded(true); window.setTimeout(() => setAdded(false), 1800); };
  return <PageFrame categories={categoriesQuery.data as StoreCategory[] | undefined}><main className="container detail-page"><Link href={`/collections/${product.categorySlug ?? "all"}`} className="back-link"><ArrowLeft size={15} /> {product.categoryName ?? "Menu"}</Link><div className="detail-layout"><div className="detail-gallery"><img src={product.images[0]?.url} alt={product.images[0]?.alt ?? product.name} /></div><section className="detail-info"><p className="eyebrow">{product.categoryName ?? "ShoeHub"}</p><h1>{product.name}</h1><p className="detail-price">{formatVnd(product.price)} {product.compareAtPrice && <del>{formatVnd(product.compareAtPrice)}</del>}</p><p className="detail-description">{product.description}</p><div className="detail-selector"><span>Quy cách</span><strong>{variant?.size ?? "41"}</strong><small>{variant?.stock ? `Còn ${variant.stock} đôi` : "Tạm hết sản phẩm"}</small></div><div className="add-row"><div className="quantity-stepper"><button disabled={!variant} onClick={() => setQuantity(value => Math.max(1, value - 1))} aria-label="Giảm số lượng"><Minus size={15} /></button><span>{quantity}</span><button disabled={!variant} onClick={() => setQuantity(value => Math.min(variant?.stock ?? 20, value + 1))} aria-label="Tăng số lượng"><Plus size={15} /></button></div><button className={added ? "button button--accent add-button add-button--added" : "button button--accent add-button"} onClick={add} disabled={!variant || variant.stock < 1}>{added ? <><Check size={18} /> Đã thêm</> : <><ShoppingBag size={18} /> Thêm vào đơn</>}</button></div><div className="product-perks"><div><Truck size={18} /><span><strong>Giao toàn quốc</strong>Phí từ 30.000đ</span></div><div><Check size={18} /><span><strong>Đổi size 7 ngày</strong>Đóng gói cẩn thận</span></div></div></section></div>{relatedQuery.data?.products.filter(item => item.id !== product.id).length ? <section className="related-products"><div className="section-heading"><div><p className="eyebrow">Có thể bạn sẽ thích</p><h2>Thử thêm một vị.</h2></div></div><ProductGrid products={relatedQuery.data.products.filter(item => item.id !== product.id).slice(0, 3)} /></section> : null}</main></PageFrame>;
}
