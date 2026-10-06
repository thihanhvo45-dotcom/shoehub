import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, PackageSearch } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatVnd } from "@/lib/store";
import { PageFrame } from "@/components/storefront";
import { setPageSeo } from "@/lib/seo";

export default function OrderLookup() {
  const [form, setForm] = useState({ orderNumber: "", phone: "" });
  const [submitted, setSubmitted] = useState<{ orderNumber: string; phone: string } | null>(null);
  const lookup = trpc.orders.lookup.useQuery(submitted ?? { orderNumber: "", phone: "" }, { enabled: Boolean(submitted) });
  useEffect(() => setPageSeo({ title: "Lịch sử đơn hàng – ShoeHub", description: "Tra cứu trạng thái đơn giày bằng mã đơn và số điện thoại.", noindex: true }), []);
  const submit = (event: FormEvent) => { event.preventDefault(); setSubmitted({ orderNumber: form.orderNumber.trim().toUpperCase(), phone: form.phone.trim() }); };
  const order = lookup.data?.found ? lookup.data.order : null;
  return <PageFrame><main className="container lookup-page"><Link href="/" className="back-link"><ArrowLeft size={15} /> Mua hàng</Link><div className="lookup-card"><div className="private-card__icon"><PackageSearch size={22} /></div><p className="eyebrow">Lịch sử đơn hàng</p><h1>Tra cứu đơn của bạn.</h1><p>Nhập mã đơn và số điện thoại đã dùng khi đặt hàng. Chúng tôi chỉ hiển thị đơn khớp cả hai thông tin.</p><form onSubmit={submit} className="lookup-form"><label>Mã đơn<input required value={form.orderNumber} onChange={event => setForm({ ...form, orderNumber: event.target.value })} placeholder="SH-20261001-ABC123" /></label><label>Số điện thoại<input required value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="090 123 4567" inputMode="tel" /></label><button className="button button--dark" type="submit">Tra cứu <PackageSearch size={16} /></button></form></div>{submitted && lookup.isLoading && <p className="lookup-status">Đang tìm đơn hàng…</p>}{submitted && !lookup.isLoading && lookup.data && !lookup.data.found && <div className="lookup-result lookup-result--error">Không tìm thấy đơn phù hợp. Kiểm tra lại mã đơn và số điện thoại.</div>}{order && <section className="lookup-result"><div className="lookup-result__head"><div><p className="eyebrow">Đã tìm thấy</p><h2>{order.orderNumber}</h2><span>{new Date(order.createdAt).toLocaleString("vi-VN")}</span></div><div className="status-pill status-pill--confirmed">{order.orderStatus}</div></div><div className="lookup-success"><CheckCircle2 size={17} /> Đơn đã được ghi nhận. ShoeHub sẽ liên hệ để xác nhận.</div><div className="lookup-items">{order.items.map(item => <div key={item.id}><span>{item.productNameSnapshot} × {item.quantity}</span><b>{formatVnd(item.unitPrice * item.quantity)}</b></div>)}</div><div className="price-summary"><div><span>Tạm tính</span><strong>{formatVnd(order.subtotal)}</strong></div><div><span>Phí giao hàng</span><strong>{order.shippingFee ? formatVnd(order.shippingFee) : "Miễn phí"}</strong></div><div className="price-summary__total"><span>Tổng cộng</span><strong>{formatVnd(order.total)}</strong></div></div></section>}</main></PageFrame>;
}
