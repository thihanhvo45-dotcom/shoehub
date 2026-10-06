import { Check, Package, ArrowRight, Radio, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { setPageSeo } from "@/lib/seo";
import { PageFrame } from "@/components/storefront";

type Tracking = { orderNumber: string; orderStatus: string; paymentStatus: string; updatedAt: string; events: Array<{ id: number; orderStatus: string; paymentStatus: string; message: string; createdAt: string }> };

const labels: Record<string, string> = { pending: "Đã tiếp nhận", confirmed: "Đã xác nhận", packing: "Đang soạn sản phẩm", shipping: "Đang giao", completed: "Đã hoàn tất", cancelled: "Đã hủy", refunded: "Đã hoàn tiền" };

export default function OrderSuccess() {
  const [location] = useLocation();
  const orderNumber = decodeURIComponent(location.split("/")[2]?.split("?")[0] ?? "");
  const [phone, setPhone] = useState("");
  const [trackingPhone, setTrackingPhone] = useState("");
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [trackingError, setTrackingError] = useState("");
  useEffect(() => setPageSeo({ title: "Đặt hàng thành công – ShoeHub", description: "Đơn hàng của bạn đã được tiếp nhận.", noindex: true }), []);
  useEffect(() => {
    if (!trackingPhone) return;
    const source = new EventSource(`/api/orders/${encodeURIComponent(orderNumber)}/events?phone=${encodeURIComponent(trackingPhone)}`);
    source.addEventListener("order", event => { setTracking(JSON.parse((event as MessageEvent).data) as Tracking); setTrackingError(""); });
    source.onerror = () => setTrackingError("Không kết nối được realtime. Hãy thử lại sau ít giây.");
    return () => source.close();
  }, [orderNumber, trackingPhone]);
  const connect = () => { setTracking(null); setTrackingError(""); setTrackingPhone(phone.trim()); };
  return <PageFrame><main className="container success-page"><div className="success-card"><div className="success-icon"><Check size={25} /></div><p className="eyebrow">Cảm ơn bạn đã đặt hàng</p><h1>Đơn hàng đã được tiếp nhận.</h1><p>Chúng tôi sẽ gọi xác nhận trong thời gian sớm nhất. Bạn có thể theo dõi trạng thái đơn bằng số điện thoại đặt hàng.</p><div className="success-order"><span>Mã đơn hàng</span><strong>{orderNumber}</strong></div><div className="tracking-connect"><label>Số điện thoại đặt hàng<input value={phone} onChange={event => setPhone(event.target.value)} placeholder="090 123 4567" inputMode="tel" /></label><button className="button button--accent button--wide" onClick={connect} disabled={phone.trim().length < 8}><Radio size={16} /> Theo dõi realtime</button>{trackingError && <p className="form-error">{trackingError}</p>}</div>{tracking && <section className="tracking-card"><div className="tracking-card__head"><div><p className="eyebrow">Cập nhật trực tiếp</p><h2>{labels[tracking.orderStatus] ?? tracking.orderStatus}</h2></div><RefreshCw size={18} /></div><p className="tracking-payment">Thanh toán: {tracking.paymentStatus === "paid" ? "Đã thanh toán" : tracking.paymentStatus === "failed" ? "Thất bại" : "Đang chờ"}</p><div className="tracking-timeline">{tracking.events.map(event => <div className="tracking-event" key={event.id}><span className="tracking-event__dot" /><div><strong>{event.message}</strong><small>{new Date(event.createdAt).toLocaleString("vi-VN")}</small></div></div>)}</div></section>}<div className="success-actions"><Link className="button button--dark" href="/collections/all">Tiếp tục mua sắm <ArrowRight size={16} /></Link><Link className="button button--ghost" href="/account/orders"><Package size={16} /> Xem đơn hàng</Link></div></div></main></PageFrame>;
}
