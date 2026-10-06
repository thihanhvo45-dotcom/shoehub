import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, ChevronDown, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cartCount, formatVnd, loadCart, type CatalogProduct } from "@/lib/store";

const LOGO_URL = `${import.meta.env.BASE_URL}shoehub-mark.svg`;

export type StoreCategory = { id: number; slug: string; name: string; description?: string | null };

export function Logo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand-mark" aria-label="ShoeHub – Trang chủ"><img src={LOGO_URL} alt="" className="brand-mark__icon" /><span className={compact ? "brand-mark__text brand-mark__text--compact" : "brand-mark__text"}>Shoe<span>Hub</span></span></Link>;
}

export function StoreHeader({ categories = [] }: { categories?: StoreCategory[] }) {
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [count, setCount] = useState(() => cartCount(loadCart()));
  useEffect(() => { const update = () => setCount(cartCount(loadCart())); window.addEventListener("shoehub-cart-updated", update); return () => window.removeEventListener("shoehub-cart-updated", update); }, []);
  const go = (href: string) => { setLocation(href); setMobileOpen(false); };
  return <>
    <div className="announcement-bar"><span>Miễn phí đổi size 7 ngày</span> · Sneaker chọn kỹ · Giao hàng toàn quốc</div>
    <header className="store-header">
      <div className="container store-header__inner"><button className="icon-button store-header__menu" aria-label="Mở menu" onClick={() => setMobileOpen(value => !value)}>{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button><Logo />
        <nav className={mobileOpen ? "main-nav main-nav--open" : "main-nav"} aria-label="Điều hướng chính"><button onClick={() => go("/")}>Mua hàng</button><button onClick={() => go("/orders/lookup")}>Lịch sử đơn hàng</button><button onClick={() => go("/seller")} className="main-nav__seller">Kênh người bán</button></nav>
        <div className="store-header__actions"><Link href="/account" className="icon-button hide-mobile" aria-label="Tài khoản"><UserRound size={19} /></Link><Link href="/cart" className="icon-button bag-button" aria-label={`Giỏ hàng, ${count} sản phẩm`}><ShoppingBag size={20} />{count > 0 && <span>{count}</span>}</Link></div>
      </div>
      <div className="category-strip container" aria-label="Danh mục sản phẩm">{categories.map(category => <Link key={category.slug} href={`/collections/${category.slug}`}>{category.name}</Link>)}{categories.length === 0 && <span>giày mới · Bán chạy · Combo tiết kiệm</span>}</div>
    </header>
  </>;
}

export function PageFrame({ children, categories, className = "" }: { children: ReactNode; categories?: StoreCategory[]; className?: string }) { return <div className={`store-page ${className}`}><StoreHeader categories={categories} />{children}<StoreFooter /></div>; }

export function ProductCard({ product, priority = false }: { product: CatalogProduct; priority?: boolean }) {
  const image = product.images[0]?.url;
  return <article className="product-card"><Link href={`/products/${product.slug}`} className="product-card__image-wrap">{product.compareAtPrice && <span className="product-card__badge">Combo</span>}{image ? <img src={image} alt={product.images[0]?.alt ?? product.name} loading={priority ? "eager" : "lazy"} className="product-card__image" /> : <div className="product-card__fallback" />}<span className="product-card__quick">Xem sản phẩm <ArrowRight size={14} /></span></Link><div className="product-card__meta"><div><p className="eyebrow">{product.categoryName ?? "ShoeHub"}</p><Link href={`/products/${product.slug}`} className="product-card__name">{product.name}</Link></div><div className="product-card__price"><strong>{formatVnd(product.price)}</strong>{product.compareAtPrice && <del>{formatVnd(product.compareAtPrice)}</del>}</div></div></article>;
}

export function ProductGrid({ products, loading = false }: { products: CatalogProduct[]; loading?: boolean }) { if (loading) return <div className="product-grid">{Array.from({ length: 6 }).map((_, index) => <div className="skeleton-card" key={index}><div className="skeleton skeleton--image" /><div className="skeleton skeleton--line" /><div className="skeleton skeleton--short" /></div>)}</div>; if (products.length === 0) return <EmptyState title="Chưa có sản phẩm phù hợp" body="Thử chọn một nhóm sản phẩm khác nhé." />; return <div className="product-grid">{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 2} />)}</div>; }

export function SectionHeading({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body?: string; action?: ReactNode }) { return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{body && <p>{body}</p>}</div>{action}</div>; }
export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-state__icon"><ShoppingBag size={22} /></div><h3>{title}</h3><p>{body}</p>{action}</div>; }
export function LoadingBlock({ label = "Đang tải" }: { label?: string }) { return <div className="loading-block"><span className="spinner" />{label}</div>; }
export function StoreFooter() { return <footer className="store-footer"><div className="container store-footer__grid"><div><Logo compact /><p className="footer-lead">Đi xa hơn mỗi ngày.</p><p className="footer-copy">Sneaker được chọn kỹ, gói cẩn thận và gửi đến bạn.</p></div><div><p className="footer-title">Mua sắm</p><Link href="/">Bộ sưu tập</Link><Link href="/orders/lookup">Lịch sử đơn hàng</Link><Link href="/seller">Kênh người bán</Link></div><div><p className="footer-title">Hỗ trợ</p><Link href="/policies/shipping">Giao nhận</Link><Link href="/policies/returns">Đổi trả</Link><Link href="/policies/privacy">Bảo mật</Link></div><div><p className="footer-title">Kết nối</p><a href="tel:0900000000">0900 000 000</a><p className="footer-copy">Thứ 2 – Chủ nhật<br />07:00 – 18:00</p></div></div><div className="container footer-bottom"><span>© 2026 ShoeHub</span><span>Chọn kỹ · Đi xa</span></div></footer>; }
export function PriceSummary({ subtotal, discount = 0 }: { subtotal: number; discount?: number }) { const shipping = subtotal - discount >= 3000000 ? 0 : 30000; return <div className="price-summary"><div><span>Tạm tính</span><strong>{formatVnd(subtotal)}</strong></div><div><span>Phí giao hàng</span><strong>{shipping === 0 ? "Miễn phí" : formatVnd(shipping)}</strong></div>{discount > 0 && <div><span>Giảm giá</span><strong className="text-accent">− {formatVnd(discount)}</strong></div>}<div className="price-summary__total"><span>Tổng cộng</span><strong>{formatVnd(subtotal - discount + shipping)}</strong></div></div>; }
export function PageTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) { return <div className="page-title container">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{body && <p>{body}</p>}</div>; }
export function MobileBack({ href = "/", label = "Quay lại" }: { href?: string; label?: string }) { return <Link href={href} className="mobile-back"><ChevronDown size={16} className="rotate-90" />{label}</Link>; }
