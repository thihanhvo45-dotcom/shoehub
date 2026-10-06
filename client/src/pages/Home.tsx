import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ExternalLink, MapPin, Minus, Plus, ShoppingBag, Store, Truck } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { addToCart, cartTotal, formatVnd, loadCart, newIdempotencyKey, removeFromCart, saveCart, updateCartQuantity, type CartLine } from "@/lib/store";
import { setPageSeo } from "@/lib/seo";
import { LoadingBlock, PageFrame } from "@/components/storefront";

type Fulfillment = "delivery" | "pickup";
type Payment = "cod" | "manual";

export default function Home() {
  const [, setLocation] = useLocation();
  const categoriesQuery = trpc.catalog.categories.useQuery();
  const productsQuery = trpc.catalog.list.useQuery({ sort: "featured", pageSize: 24 });
  const [lines, setLines] = useState<CartLine[]>(() => loadCart());
  const [form, setForm] = useState({ name: "", phone: "", address: "", mapsUrl: "", fulfillment: "delivery" as Fulfillment, payment: "cod" as Payment });
  const [error, setError] = useState("");
  const [orderKey] = useState(() => newIdempotencyKey());
  const orderMutation = trpc.checkout.createOrder.useMutation({ onSuccess: result => { saveCart([]); setLocation(`/order-success/${result.orderNumber}`); }, onError: mutationError => setError(mutationError.message || "Không thể tạo đơn, vui lòng thử lại.") });
  useEffect(() => setPageSeo({ title: "ShoeHub – Đặt hàng online", description: "giày làm mới mỗi ngày. Chọn sản phẩm, cập nhật số lượng và đặt giao tận nơi hoặc nhận tại cửa hàng." }), []);
  useEffect(() => { const update = () => setLines(loadCart()); window.addEventListener("shoehub-cart-updated", update); return () => window.removeEventListener("shoehub-cart-updated", update); }, []);
  const products = productsQuery.data?.products ?? [];
  const subtotal = cartTotal(lines);
  const selectedCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const shipping = form.fulfillment === "pickup" || subtotal >= 3000000 ? 0 : 30000;
  const total = subtotal + shipping;
  const getLine = (productId: number) => lines.find(line => line.productId === productId);
  const setQuantity = (product: (typeof products)[number], quantity: number) => {
    const variant = product.variants[0];
    if (!variant) return;
    const line = getLine(product.id);
    if (!line && quantity > 0) { const next = addToCart({ variantId: variant.id, productId: product.id, slug: product.slug, name: product.name, image: product.images[0]?.url ?? "", size: variant.size, color: variant.color, price: variant.price, quantity }); setLines(next); return; }
    setLines(updateCartQuantity(variant.id, quantity));
  };
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (lines.length === 0) { setError("Hãy chọn ít nhất một sản phẩm trước khi đặt hàng."); return; }
    if (form.name.trim().length < 2) { setError("Vui lòng nhập họ tên."); return; }
    if (!/^((03|05|07|08|09)[0-9]{8}|\+84[0-9]{9})$/.test(form.phone.replace(/[\s.-]/g, ""))) { setError("Số điện thoại chưa đúng định dạng Việt Nam."); return; }
    if (form.fulfillment === "delivery" && form.address.trim().length < 5) { setError("Vui lòng nhập địa chỉ giao hàng."); return; }
    orderMutation.mutate({ recipientName: form.name, phone: form.phone, addressLine: form.fulfillment === "pickup" ? "Nhận tại cửa hàng ShoeHub" : form.address, province: "Hồ Chí Minh", mapsUrl: form.mapsUrl.trim() || undefined, fulfillmentMethod: form.fulfillment, paymentMethod: form.payment, idempotencyKey: orderKey, items: lines.map(line => ({ variantId: line.variantId, quantity: line.quantity })) });
  };

  return <PageFrame categories={categoriesQuery.data} className="shoehub-order-page">
    <main className="shoehub-shell">
      <section className="shoehub-intro"><div><p className="eyebrow">ShoeHub · đặt online</p><h1>Chọn đôi,<br /><span>đi theo cách riêng.</span></h1><p>Chọn size, tổng tiền tự cập nhật. Giao hàng toàn quốc hoặc nhận tại cửa hàng.</p></div><div className="shoehub-intro__image"><img src={`${import.meta.env.BASE_URL}assets/shoehub-hero.jpg`} alt="ShoeHub – bộ sưu tập sneaker" /><span>đi xa<br />hơn mỗi ngày</span></div></section>
      <div className="shoehub-order-grid"><section className="shoehub-menu" aria-label="Danh sách sản phẩm giày"><div className="shoehub-section-head"><div><p className="eyebrow">01 / bộ sưu tập hôm nay</p><h2>Sản phẩm của bạn</h2></div><span>{products.length} sản phẩm</span></div>{productsQuery.isLoading ? <LoadingBlock label="Đang tải bộ sưu tập" /> : products.length === 0 ? <div className="shoehub-empty">Bộ sưu tập đang được chuẩn bị. Vui lòng quay lại sau.</div> : <div className="shoehub-product-list">{products.map((product, index) => { const variant = product.variants[0]; const line = getLine(product.id); const qty = line?.quantity ?? 0; return <article className={product.availableStock === 0 ? "shoehub-item shoehub-item--sold" : "shoehub-item"} key={product.id}><div className="shoehub-item__visual">{product.images[0]?.url ? <img src={product.images[0].url} alt={product.images[0].alt} /> : <span>{["👟", "🥾", "🥿", "👞"][index % 4]}</span>}</div><div className="shoehub-item__copy"><strong>{product.name}</strong><p>{product.shortDescription}</p><span className="shoehub-price">{formatVnd(product.price)}</span>{product.availableStock === 0 ? <small className="shoehub-sold">Tạm hết sản phẩm</small> : <small>{product.availableStock} đôi sẵn sàng</small>}</div><div className="shoehub-qty"><button type="button" disabled={!variant || product.availableStock === 0 || qty <= 0} onClick={() => setQuantity(product, qty - 1)} aria-label={`Giảm ${product.name}`}><Minus size={16} /></button><input aria-label={`Số lượng ${product.name}`} inputMode="numeric" value={qty} onChange={event => setQuantity(product, Math.min(20, Math.max(0, Number(event.target.value) || 0)))} /><button type="button" disabled={!variant || product.availableStock === 0 || qty >= Math.min(20, product.availableStock)} onClick={() => setQuantity(product, qty + 1)} aria-label={`Tăng ${product.name}`}><Plus size={16} /></button></div></article>; })}</div>}</section>
        <aside className="shoehub-order-card" aria-label="Đơn hàng của bạn"><div className="shoehub-card-title"><div><p className="eyebrow">02 / đơn hàng</p><h2>Đơn hàng của bạn</h2></div><ShoppingBag size={20} /></div>{lines.length === 0 ? <p className="shoehub-empty shoehub-empty--small">Chưa có sản phẩm nào. Chọn sản phẩm ở bên trái nhé.</p> : <div className="shoehub-summary-lines">{lines.map(line => <div className="shoehub-summary-line" key={line.variantId}><div><strong>{line.name}</strong><span>{line.quantity} × {formatVnd(line.price)}</span></div><b>{formatVnd(line.quantity * line.price)}</b><button type="button" onClick={() => setLines(removeFromCart(line.variantId))} aria-label={`Xóa ${line.name}`}>×</button></div>)}</div>}<div className="shoehub-total"><span>Tổng cộng</span><strong>{formatVnd(total)}</strong></div><form onSubmit={submit} className="shoehub-form"><p className="eyebrow">03 / thông tin nhận hàng</p><label>Họ tên<input required value={form.name} onChange={event => update("name", event.target.value)} placeholder="Nguyễn Văn A" autoComplete="name" /></label><label>Số điện thoại<input required value={form.phone} onChange={event => update("phone", event.target.value)} placeholder="090 123 4567" inputMode="tel" autoComplete="tel" /><small>Số hợp lệ Việt Nam: 10 số, đầu 03/05/07/08/09 hoặc +84.</small></label><fieldset><legend>Hình thức nhận hàng *</legend><label className={form.fulfillment === "delivery" ? "shoehub-option shoehub-option--active" : "shoehub-option"}><input type="radio" checked={form.fulfillment === "delivery"} onChange={() => setForm({ ...form, fulfillment: "delivery" })} /> <Truck size={16} /> Giao tận nơi</label><label className={form.fulfillment === "pickup" ? "shoehub-option shoehub-option--active" : "shoehub-option"}><input type="radio" checked={form.fulfillment === "pickup"} onChange={() => setForm({ ...form, fulfillment: "pickup" })} /> <Store size={16} /> Nhận tại cửa hàng</label></fieldset>{form.fulfillment === "delivery" && <><label>Địa chỉ giao hàng<textarea required value={form.address} onChange={event => update("address", event.target.value)} placeholder="Số nhà, đường, phường/xã" rows={2} autoComplete="street-address" /></label><label>Vị trí Google Maps <span className="label-muted">(không bắt buộc)</span><input value={form.mapsUrl} onChange={event => update("mapsUrl", event.target.value)} placeholder="Dán link Chia sẻ từ Google Maps" inputMode="url" /></label>{form.mapsUrl && <a className="shoehub-map-link" href={form.mapsUrl} target="_blank" rel="noreferrer"><MapPin size={14} /> Xem vị trí đã chọn <ExternalLink size={12} /></a>}</>}<fieldset><legend>Thanh toán *</legend><label className={form.payment === "cod" ? "shoehub-option shoehub-option--active" : "shoehub-option"}><input type="radio" checked={form.payment === "cod"} onChange={() => setForm({ ...form, payment: "cod" })} /> Tiền mặt khi nhận hàng</label><label className={form.payment === "manual" ? "shoehub-option shoehub-option--active" : "shoehub-option"}><input type="radio" checked={form.payment === "manual"} onChange={() => setForm({ ...form, payment: "manual" })} /> Chuyển khoản / QR demo</label></fieldset>{form.payment === "manual" && <div className="shoehub-payment-note">Thông tin chuyển khoản/QR thật sẽ được chủ shop cập nhật trước khi mở bán.</div>}{error && <div className="form-error" role="alert">{error}</div>}<button className="shoehub-submit" type="submit" disabled={orderMutation.isPending || lines.length === 0}>{orderMutation.isPending ? "Đang tạo đơn…" : <>Đặt hàng · {formatVnd(total)} <Check size={17} /></>}</button><p className="shoehub-privacy">Thông tin chỉ dùng để xử lý đơn hàng. Không lưu dữ liệu thẻ.</p></form></aside>
      </div>
    </main>
  </PageFrame>;
}
