import { useEffect } from "react";
import { ArrowRight, LogOut, Package, UserRound } from "lucide-react";
import { Link } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { formatVnd } from "@/lib/store";
import { setPageSeo } from "@/lib/seo";
import { LoadingBlock, PageFrame } from "@/components/storefront";

export default function Account() {
  const auth = useAuth();
  const ordersQuery = trpc.account.orders.useQuery(undefined, { enabled: Boolean(auth.user) });
  useEffect(() => setPageSeo({ title: "Tài khoản – ShoeHub", description: "Quản lý thông tin và đơn hàng ShoeHub.", noindex: true }), []);
  if (auth.loading) return <PageFrame><main className="container private-page"><LoadingBlock label="Đang kiểm tra tài khoản" /></main></PageFrame>;
  if (!auth.user) return <PageFrame><main className="container private-page"><div className="private-card"><div className="private-card__icon"><UserRound size={22} /></div><p className="eyebrow">ShoeHub account</p><h1>Một nơi cho những lần mua sau.</h1><p>Đăng nhập để xem đơn hàng, lưu thông tin nhận hàng và mua nhanh hơn.</p><Link className="button button--dark" href="/login">Đăng nhập <ArrowRight size={16} /></Link><p className="auth-switch">Chưa có tài khoản? <Link href="/register">Tạo tài khoản người mua</Link></p></div></main></PageFrame>;
  const roleLabel = auth.user.role === "admin" ? "Quản trị viên" : auth.user.role === "seller" ? "Người bán" : "Người mua";
  return <PageFrame><main className="container account-page"><div className="account-head"><div><p className="eyebrow">Xin chào</p><h1>{auth.user.name || auth.user.email || "bạn"}</h1><p>{auth.user.email}</p><span className={`role-tag role-tag--${auth.user.role}`}>{roleLabel}</span></div><button className="text-button" onClick={() => auth.logout()}><LogOut size={15} /> Đăng xuất</button></div><div className="account-grid"><section className="account-panel"><div className="account-panel__heading"><div><p className="eyebrow">Lịch sử</p><h2>Đơn hàng của bạn</h2></div><Package size={21} /></div>{ordersQuery.isLoading ? <LoadingBlock label="Đang tải đơn hàng" /> : ordersQuery.data?.length ? <div className="order-list">{ordersQuery.data.map(order => <div className="order-row" key={order.id}><div><strong>{order.orderNumber}</strong><span>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</span></div><div><span className={`status-pill status-pill--${order.orderStatus}`}>{order.orderStatus}</span><strong>{formatVnd(order.total)}</strong></div></div>)}</div> : <div className="account-empty"><p>Bạn chưa có đơn hàng nào.</p><Link className="text-link" href="/collections/all">Xem sản phẩm <ArrowRight size={15} /></Link></div>}</section><aside className="account-panel account-panel--muted"><p className="eyebrow">Cần trợ giúp?</p><h3>Chúng tôi ở đây để giúp.</h3><p>Theo dõi đơn hàng hoặc cần tư vấn chọn sản phẩm? Liên hệ đội ngũ ShoeHub.</p><a className="text-link" href="mailto:hello@shoehub.example">hello@shoehub.example <ArrowRight size={15} /></a></aside></div></main></PageFrame>;
}
