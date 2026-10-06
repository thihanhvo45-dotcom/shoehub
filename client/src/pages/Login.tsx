import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CircleAlert, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { setPageSeo } from "@/lib/seo";
import { PageFrame } from "@/components/storefront";

const staticDemo = import.meta.env.VITE_STATIC_DEMO === "true";

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const login = trpc.auth.login.useMutation({
    onSuccess: async user => {
      await utils.auth.me.invalidate();
      setLocation(user.role === "seller" ? "/seller" : "/account");
    },
    onError: mutationError => setError(mutationError.message || "Email hoặc mật khẩu không đúng.")
  });

  useEffect(() => setPageSeo({ title: "Đăng nhập – ShoeHub", description: "Đăng nhập tài khoản ShoeHub.", noindex: true }), []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    login.mutate({ email, password });
  };

  return <PageFrame><main className="container login-page"><section className="login-card">
    <p className="eyebrow">ShoeHub account</p><h1>Chào mừng trở lại.</h1><p>Đăng nhập để xem đơn hàng hoặc vào kênh người bán.</p>
    {staticDemo ? <div className="auth-notice" role="status"><CircleAlert size={18} /><span>Bản GitHub Pages chỉ là giao diện demo. Đăng nhập và đăng ký thật cần backend cùng cơ sở dữ liệu.</span></div> : <>
      <form className="auth-form" onSubmit={submit}>
        <label>Email<input type="email" autoComplete="email" required maxLength={320} value={email} onChange={event => setEmail(event.target.value)} placeholder="ban@example.com" /></label>
        <label>Mật khẩu<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} placeholder="Mật khẩu của bạn" /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="button button--dark button--wide" type="submit" disabled={login.isPending}>{login.isPending ? "Đang đăng nhập…" : <>Đăng nhập <ArrowRight size={17} /></>}</button>
      </form>
      <div className="login-safe"><ShieldCheck size={17} /><span>Mật khẩu được kiểm tra ở máy chủ và không gửi/lưu dạng văn bản.</span></div>
      <details className="legacy-login"><summary>Đăng nhập bằng Manus (tài khoản cũ)</summary><button className="button button--ghost button--wide" onClick={() => startLogin()}>Tiếp tục với Manus <ArrowRight size={16} /></button></details>
    </>}
    <p className="auth-switch">Chưa có tài khoản? <Link href="/register">Tạo tài khoản người mua hoặc người bán</Link></p>
    <p className="auth-legal"><LockKeyhole size={13} /> Nếu quên mật khẩu, hiện cần liên hệ quản trị viên để xử lý; chức năng đặt lại mật khẩu qua email chưa được cấu hình.</p>
  </section></main></PageFrame>;
}
