import { useEffect } from "react";
import { ArrowRight, LogIn, LogOut, ShieldAlert, Store } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LoadingBlock, PageFrame } from "@/components/storefront";

const staticDemo = import.meta.env.VITE_STATIC_DEMO === "true";

export default function Seller() {
  const auth = useAuth();
  const sellerProfile = trpc.seller.profile.useQuery(undefined, { enabled: Boolean(auth.user?.role === "seller") && !staticDemo });
  useEffect(() => { document.title = "Kênh người bán – ShoeHub"; }, []);

  if (staticDemo) return <PageFrame><main className="container private-page"><div className="private-card"><Store size={28} /><p className="eyebrow">Kênh người bán</p><h1>Bản demo tĩnh.</h1><p>GitHub Pages không có backend để đăng nhập hay lưu hồ sơ người bán. Hãy dùng bản full-stack của ShoeHub để tạo tài khoản thật.</p><Link className="button button--dark" href="/register">Tạo tài khoản <ArrowRight size={16} /></Link></div></main></PageFrame>;
  if (auth.loading) return <PageFrame><main className="container private-page"><LoadingBlock label="Đang kiểm tra tài khoản" /></main></PageFrame>;
  if (!auth.user) return <PageFrame><main className="container private-page"><div className="private-card"><Store size={28} /><p className="eyebrow">Kênh người bán</p><h1>Đăng nhập để tiếp tục.</h1><p>Người mua và người bán dùng tài khoản riêng biệt.</p><Link className="button button--dark" href="/login"><LogIn size={17} /> Đăng nhập</Link><p className="auth-switch">Chưa có tài khoản người bán? <Link href="/register">Đăng ký người bán</Link></p></div></main></PageFrame>;
  if (auth.user.role !== "seller") return <PageFrame><main className="container private-page"><div className="private-card"><ShieldAlert size={28} /><p className="eyebrow">Tài khoản người mua</p><h1>Kênh người bán dùng tài khoản riêng.</h1><p>Đang đăng nhập bằng {auth.user.email || "tài khoản người mua"}. Hãy đăng xuất rồi tạo tài khoản người bán bằng email riêng.</p><button className="button button--dark" onClick={() => auth.logout()}><LogOut size={16} /> Đăng xuất</button><p className="auth-switch">Cần tài khoản người mua? <Link href="/account">Vào tài khoản</Link></p></div></main></PageFrame>;

  return <PageFrame><main className="container seller-page"><div className="account-head"><div><p className="eyebrow">ShoeHub · Kênh người bán</p><h1>Xin chào, {sellerProfile.data?.name || auth.user.name || "người bán"}.</h1><p>{sellerProfile.data?.email || auth.user.email} · Tài khoản người bán</p></div><button className="text-button" onClick={() => auth.logout()}><LogOut size={15} /> Đăng xuất</button></div><section className="seller-welcome"><div className="seller-welcome__icon"><Store size={22} /></div><p className="eyebrow">Hồ sơ người bán</p><h2>Tài khoản người bán đã sẵn sàng.</h2><p>Đây là vai trò riêng, không có quyền quản trị viên. ShoeHub hiện đang chạy mô hình cửa hàng đơn; công cụ đăng sản phẩm riêng của từng nhà bán chưa được bật.</p><Link className="button button--ghost" href="/">Xem cửa hàng <ArrowRight size={16} /></Link></section></main></PageFrame>;
}
