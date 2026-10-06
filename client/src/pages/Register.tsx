import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CircleAlert, LockKeyhole, ShoppingBag, Store } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { setPageSeo } from "@/lib/seo";
import { PageFrame } from "@/components/storefront";

const staticDemo = import.meta.env.VITE_STATIC_DEMO === "true";

export default function Register() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [error, setError] = useState("");
  const register = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation(role === "seller" ? "/seller" : "/account");
    },
    onError: mutationError => setError(mutationError.message || "Chưa thể tạo tài khoản.")
  });

  useEffect(() => setPageSeo({ title: "Tạo tài khoản – ShoeHub", description: "Tạo tài khoản người mua hoặc người bán trên ShoeHub.", noindex: true }), []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    register.mutate({ name, email, password, role });
  };

  return <PageFrame><main className="container login-page"><section className="login-card register-card">
    <p className="eyebrow">ShoeHub account</p><h1>Tạo tài khoản của bạn.</h1><p>Chọn loại tài khoản phù hợp. Mỗi tài khoản dùng một địa chỉ email riêng.</p>
    {staticDemo ? <div className="auth-notice" role="status"><CircleAlert size={18} /><span>Bản GitHub Pages chỉ là giao diện demo và không có máy chủ/cơ sở dữ liệu để lưu tài khoản. Hãy triển khai bản full-stack cùng MySQL để bật đăng ký thật.</span></div> : <form className="auth-form" onSubmit={submit}>
      <fieldset className="account-type-picker"><legend>Loại tài khoản</legend>
        <button type="button" className={role === "buyer" ? "account-type account-type--active" : "account-type"} onClick={() => setRole("buyer")}><ShoppingBag size={18} /><span><strong>Người mua</strong><small>Mua hàng và theo dõi đơn của bạn</small></span></button>
        <button type="button" className={role === "seller" ? "account-type account-type--active" : "account-type"} onClick={() => setRole("seller")}><Store size={18} /><span><strong>Người bán</strong><small>Tài khoản riêng cho kênh người bán</small></span></button>
      </fieldset>
      <label>Họ và tên<input autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Nguyễn Văn A" /></label>
      <label>Email<input type="email" autoComplete="email" required maxLength={320} value={email} onChange={event => setEmail(event.target.value)} placeholder="ban@example.com" /></label>
      <label>Mật khẩu<input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} placeholder="Ít nhất 10 ký tự" /></label>
      <label>Nhập lại mật khẩu<input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Nhập lại mật khẩu" /></label>
      <label className="terms-check"><input type="checkbox" required /><span>Tôi đồng ý với <Link href="/policies/terms">điều khoản sử dụng</Link> và <Link href="/policies/privacy">chính sách bảo mật</Link>.</span></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="button button--dark button--wide" type="submit" disabled={register.isPending}>{register.isPending ? "Đang tạo tài khoản…" : <>Tạo tài khoản {role === "seller" ? "người bán" : "người mua"} <ArrowRight size={17} /></>}</button>
      <p className="auth-security"><LockKeyhole size={15} /> Mật khẩu được băm ở máy chủ; không lưu dạng văn bản.</p>
      <p className="auth-legal">Chưa có xác minh email hoặc khôi phục mật khẩu tự động. Dùng email bạn có thể truy cập.</p>
    </form>}
    <p className="auth-switch">Đã có tài khoản? <Link href="/login">Đăng nhập</Link></p>
  </section></main></PageFrame>;
}
