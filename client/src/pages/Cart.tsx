import { useEffect, useState } from "react";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { cartTotal, formatVnd, loadCart, removeFromCart, updateCartQuantity, type CartLine } from "@/lib/store";
import { setPageSeo } from "@/lib/seo";
import { EmptyState, PageFrame, PriceSummary, type StoreCategory } from "@/components/storefront";

export default function Cart() {
  const categoriesQuery = trpc.catalog.categories.useQuery();
  const [lines, setLines] = useState<CartLine[]>(() => loadCart());
  useEffect(() => { setPageSeo({ title: "Giỏ hàng – ShoeHub", description: "Kiểm tra sản phẩm và hoàn tất đơn hàng ShoeHub." }); const handle = () => setLines(loadCart()); window.addEventListener("shoehub-cart-updated", handle); return () => window.removeEventListener("shoehub-cart-updated", handle); }, []);
  const subtotal = cartTotal(lines);
  return <PageFrame categories={categoriesQuery.data as StoreCategory[] | undefined}>
    <main className="container cart-page"><div className="page-title page-title--small"><p className="eyebrow">ShoeHub checkout</p><h1>Giỏ hàng <span>{lines.length ? `(${lines.length})` : ""}</span></h1></div>
      {lines.length === 0 ? <EmptyState title="Giỏ hàng đang trống" body="Chọn một sản phẩm giày để bắt đầu đơn hàng." action={<Link className="button button--dark" href="/collections/all">Xem menu <ArrowRight size={16} /></Link>} /> : <div className="cart-layout"><div className="cart-lines">{lines.map(line => <article className="cart-line" key={line.variantId}><img src={line.image} alt={line.name} /><div className="cart-line__info"><Link href={`/products/${line.slug}`} className="cart-line__name">{line.name}</Link><p>Quy cách {line.size} · {line.color}</p><strong>{formatVnd(line.price)}</strong><div className="cart-line__mobile-actions"><Quantity line={line} onChange={next => setLines(updateCartQuantity(line.variantId, next))} /><button className="text-button" onClick={() => setLines(removeFromCart(line.variantId))}><Trash2 size={15} /> Xóa</button></div></div><div className="cart-line__desktop-actions"><Quantity line={line} onChange={next => setLines(updateCartQuantity(line.variantId, next))} /><strong>{formatVnd(line.price * line.quantity)}</strong><button className="icon-button" onClick={() => setLines(removeFromCart(line.variantId))} aria-label={`Xóa ${line.name}`}><Trash2 size={17} /></button></div></article>)}</div><aside className="cart-summary"><h2>Tóm tắt đơn hàng</h2><PriceSummary subtotal={subtotal} /><Link href="/checkout" className="button button--accent button--wide">Tiếp tục đặt hàng <ArrowRight size={17} /></Link><p className="cart-summary__note">Bạn có thể thanh toán khi nhận hàng. Mã giảm giá áp dụng ở bước tiếp theo.</p><Link className="continue-link" href="/collections/all">← Tiếp tục mua sắm</Link></aside></div>}
    </main>
  </PageFrame>;
}

function Quantity({ line, onChange }: { line: CartLine; onChange: (quantity: number) => void }) { return <div className="quantity-stepper"><button aria-label="Giảm số lượng" onClick={() => onChange(line.quantity - 1)}><Minus size={14} /></button><span>{line.quantity}</span><button aria-label="Tăng số lượng" onClick={() => onChange(line.quantity + 1)}><Plus size={14} /></button></div>; }
