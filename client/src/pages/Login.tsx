import { useEffect } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { startLogin } from "@/const";
import { setPageSeo } from "@/lib/seo";
import { PageFrame } from "@/components/storefront";

export default function Login() { useEffect(() => setPageSeo({ title: "Đăng nhập – ShoeHub", description: "Đăng nhập tài khoản ShoeHub.", noindex: true }), []); return <PageFrame><main className="container login-page"><div className="login-card"><p className="eyebrow">ShoeHub account</p><h1>Chào mừng trở lại.</h1><p>Đăng nhập để quản lý đơn hàng và lưu lại những đôi bạn yêu thích.</p><button className="button button--dark button--wide" onClick={() => startLogin()}>Đăng nhập với Manus <ArrowRight size={17} /></button><div className="login-safe"><ShieldCheck size={17} /><span>Phiên đăng nhập được xác thực bảo mật. ShoeHub không lưu mật khẩu của bạn.</span></div></div></main></PageFrame>; }
