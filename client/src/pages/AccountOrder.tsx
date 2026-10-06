import { useEffect } from "react";
import { ArrowLeft, PackageCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { formatVnd } from "@/lib/store";
import { setPageSeo } from "@/lib/seo";
import { LoadingBlock, PageFrame } from "@/components/storefront";

export default function AccountOrder() {
  const [location] = useLocation();
  const auth = useAuth();
  const orderNumber = decodeURIComponent(location.split("/")[3] ?? "");
  const orderQuery = trpc.account.order.useQuery({ orderNumber }, { enabled: Boolean(auth.user && orderNumber) });
  useEffect(() => setPageSeo({ title: `Đơn ${orderNumber} – ShoeHub`, description: "Chi tiết đơn hàng ShoeHub.", noindex: true }), [orderNumber]);
  if (!auth.user) return <PageFrame><main className="container private-page"><div className="private-card"><p className="eyebrow">ShoeHub account</p><h1>Đăng nhập để xem đơn.</h1><Link className="button button--dark" href="/login">Đăng nhập</Link></div></main></PageFrame>;
  if (orderQuery.isLoading) return <PageFrame><main className="container private-page"><LoadingBlock label="Đang tải chi tiết đơn" /></main></PageFrame>;
  const order = orderQuery.data;
  if (!order) return <PageFrame><main className="container private-page"><div className="private-card"><p className="eyebrow">Không tìm thấy</p><h1>Đơn hàng không tồn tại.</h1><Link className="button button--dark" href="/account/orders">Về lịch sử đơn</Link></div></main></PageFrame>;
  return <PageFrame><main className="container account-page"><Link className="back-link" href="/account/orders"><ArrowLeft size={15} /> Lịch sử đơn</Link><div className="account-head account-head--detail"><div><p className="eyebrow">Đơn hàng</p><h1>{order.orderNumber}</h1><p>{new Date(order.createdAt).toLocaleDateString("vi-VN")} · <span className={`status-pill status-pill--${order.orderStatus}`}>{order.orderStatus}</span></p></div><PackageCheck size={30} /></div><div className="order-detail-layout"><section className="account-panel"><h2>Sản phẩm</h2><div className="order-detail-items">{order.items.map(item => <div className="order-detail-item" key={item.id}><div><strong>{item.productNameSnapshot}</strong><span>Size {item.size} · {item.color} · SL {item.quantity}</span></div><b>{formatVnd(item.unitPrice * item.quantity)}</b></div>)}</div></section><aside className="account-panel account-panel--muted"><h3>Thông tin nhận hàng</h3><p>{order.recipientName}<br />{order.phone}<br />{order.addressLine}{order.district ? `, ${order.district}` : ""}, {order.province}</p><div className="price-summary"><div><span>Tạm tính</span><strong>{formatVnd(order.subtotal)}</strong></div><div><span>Vận chuyển</span><strong>{order.shippingFee ? formatVnd(order.shippingFee) : "Miễn phí"}</strong></div><div className="price-summary__total"><span>Tổng cộng</span><strong>{formatVnd(order.total)}</strong></div></div></aside></div></main></PageFrame>;
}
