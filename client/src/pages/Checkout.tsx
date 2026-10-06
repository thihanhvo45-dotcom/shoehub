import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cartTotal, formatVnd, loadCart, newIdempotencyKey, type CartLine } from "@/lib/store";
import { setPageSeo } from "@/lib/seo";
import { EmptyState, PageFrame, PriceSummary, type StoreCategory } from "@/components/storefront";

type PaymentMethod = "cod" | "manual" | "vnpay" | "momo";

type FormState = {
  email: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  district: string;
  province: string;
  note: string;
  couponCode: string;
  paymentMethod: PaymentMethod;
  fulfillmentMethod: "delivery" | "pickup";
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const categoriesQuery = trpc.catalog.categories.useQuery();
  const providers = trpc.checkout.providers.useQuery();
  const [lines] = useState<CartLine[]>(() => loadCart());
  const [idempotencyKey] = useState(() => newIdempotencyKey());
  const [form, setForm] = useState<FormState>({ email: "", recipientName: "", phone: "", addressLine: "", district: "", province: "Hồ Chí Minh", note: "", couponCode: "", paymentMethod: "cod", fulfillmentMethod: "delivery" });
  const [error, setError] = useState("");
  const finishOrder = (result: { orderNumber: string; paymentUrl?: string }) => {
    localStorage.removeItem("shoehub-cart-v1");
    window.dispatchEvent(new CustomEvent("shoehub-cart-updated"));
    if (result.paymentUrl) window.location.assign(result.paymentUrl);
    else setLocation(`/order-success/${result.orderNumber}`);
  };
  const orderMutation = trpc.checkout.createOrder.useMutation({ onSuccess: finishOrder, onError: mutationError => setError(mutationError.message || "Không thể tạo đơn, vui lòng thử lại.") });
  const paymentMutation = trpc.checkout.createPayment.useMutation({ onSuccess: finishOrder, onError: mutationError => setError(mutationError.message || "Không thể khởi tạo thanh toán online.") });
  const subtotal = cartTotal(lines);
  const discountPreview = form.couponCode.trim().toUpperCase() === "WELCOME10" && subtotal >= 50000 ? Math.floor(subtotal * 0.1) : 0;
  useEffect(() => setPageSeo({ title: "Thanh toán – ShoeHub", description: "Hoàn tất thông tin giao hàng và đặt đơn ShoeHub." }), []);
  const canSubmit = useMemo(() => lines.length > 0 && form.recipientName.trim().length > 1 && form.phone.trim().length >= 8 && (form.fulfillmentMethod === "pickup" || form.addressLine.trim().length > 4) && form.province.trim().length > 1, [form, lines.length]);
  const pending = orderMutation.isPending || paymentMutation.isPending;

  if (lines.length === 0) return <PageFrame categories={categoriesQuery.data as StoreCategory[] | undefined}><main className="container checkout-page"><EmptyState title="Không có sản phẩm để thanh toán" body="Hãy thêm sản phẩm vào giỏ trước khi checkout." action={<Link href="/collections/all" className="button button--dark">Quay lại cửa hàng <ArrowRight size={16} /></Link>} /></main></PageFrame>;

  const update = (key: keyof FormState, value: string) => setForm(current => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!canSubmit) { setError("Vui lòng điền đủ thông tin nhận hàng."); return; }
    const payload = { ...form, addressLine: form.fulfillmentMethod === "pickup" ? "Nhận tại cửa hàng ShoeHub" : form.addressLine, idempotencyKey, items: lines.map(line => ({ variantId: line.variantId, quantity: line.quantity })) };
    if (form.paymentMethod === "vnpay" || form.paymentMethod === "momo") paymentMutation.mutate({ ...payload, paymentMethod: form.paymentMethod });
    else orderMutation.mutate(payload);
  };

  return <PageFrame categories={categoriesQuery.data as StoreCategory[] | undefined}>
    <main className="container checkout-page"><Link href="/cart" className="back-link"><ArrowLeft size={15} /> Quay lại giỏ hàng</Link><div className="checkout-heading"><div><p className="eyebrow">ShoeHub checkout</p><h1>Hoàn tất đơn hàng.</h1><p>Thông tin của bạn được gửi qua kết nối bảo mật và chỉ dùng để xử lý đơn.</p></div><div className="secure-note"><LockKeyhole size={16} /> Thanh toán an toàn</div></div>
      <div className="checkout-layout"><form className="checkout-form" onSubmit={submit}><section className="form-section"><div className="form-section__heading"><span>01</span><div><h2>Thông tin liên hệ</h2><p>Để chúng tôi gửi xác nhận đơn hàng.</p></div></div><label>Email (không bắt buộc)<input type="email" value={form.email} onChange={event => update("email", event.target.value)} placeholder="ban@example.com" /></label></section><section className="form-section"><div className="form-section__heading"><span>02</span><div><h2>Địa chỉ nhận hàng</h2><p>Giao tận nơi hoặc nhận tại cửa hàng ShoeHub.</p></div></div><div className="form-grid"><label>Họ và tên<input required value={form.recipientName} onChange={event => update("recipientName", event.target.value)} placeholder="Nguyễn Văn A" /></label><label>Số điện thoại<input required value={form.phone} onChange={event => update("phone", event.target.value)} placeholder="090 123 4567" /></label></div><div className="fulfillment-options"><label className={form.fulfillmentMethod === "delivery" ? "payment-option payment-option--active" : "payment-option"}><input type="radio" checked={form.fulfillmentMethod === "delivery"} onChange={() => update("fulfillmentMethod", "delivery")} /><span><strong>Giao tận nơi</strong><small>Phí giao mặc định 30.000đ, miễn phí từ 3.000.000đ.</small></span><Check size={17} /></label><label className={form.fulfillmentMethod === "pickup" ? "payment-option payment-option--active" : "payment-option"}><input type="radio" checked={form.fulfillmentMethod === "pickup"} onChange={() => update("fulfillmentMethod", "pickup")} /><span><strong>Nhận tại cửa hàng</strong><small>Không tính phí giao. Địa chỉ nhận sẽ được xác nhận sau.</small></span><Check size={17} /></label></div>{form.fulfillmentMethod === "delivery" && <><label>Địa chỉ<input required value={form.addressLine} onChange={event => update("addressLine", event.target.value)} placeholder="Số nhà, tên đường" /></label><div className="form-grid"><label>Quận / huyện<input value={form.district} onChange={event => update("district", event.target.value)} placeholder="Quận 1" /></label><label>Tỉnh / thành<input required value={form.province} onChange={event => update("province", event.target.value)} /></label></div></>}<label>Ghi chú đơn hàng (không bắt buộc)<textarea value={form.note} onChange={event => update("note", event.target.value)} placeholder="Giao giờ hành chính…" rows={3} /></label></section><section className="form-section"><div className="form-section__heading"><span>03</span><div><h2>Phương thức thanh toán</h2><p>Không lưu thông tin thẻ trên ShoeHub.</p></div></div><PaymentChoice active={form.paymentMethod === "cod"} value="cod" onChange={value => update("paymentMethod", value)} title="Thanh toán khi nhận hàng" detail="Kiểm tra sản phẩm rồi thanh toán cho shipper." /><PaymentChoice active={form.paymentMethod === "manual"} value="manual" onChange={value => update("paymentMethod", value)} title="Chuyển khoản thủ công" detail="Thông tin chuyển khoản sẽ được gửi sau khi đặt đơn." /><PaymentChoice active={form.paymentMethod === "vnpay"} value="vnpay" disabled={!providers.data?.vnpay} onChange={value => update("paymentMethod", value)} title="VNPay" detail={providers.data?.vnpay ? "Chuyển sang cổng VNPay bảo mật để thanh toán." : "Chưa cấu hình merchant VNPay trên server."} /><PaymentChoice active={form.paymentMethod === "momo"} value="momo" disabled={!providers.data?.momo} onChange={value => update("paymentMethod", value)} title="MoMo" detail={providers.data?.momo ? "Chuyển sang cổng MoMo để thanh toán." : "Chưa cấu hình merchant MoMo trên server."} /></section>{error && <div className="form-error" role="alert">{error}</div>}<label className="terms-check"><input type="checkbox" required /><span>Tôi đồng ý với <Link href="/policies/terms">điều khoản sử dụng</Link> và <Link href="/policies/privacy">chính sách bảo mật</Link>.</span></label><button className="button button--accent button--wide" type="submit" disabled={pending || !canSubmit}>{pending ? "Đang xử lý…" : <>Đặt hàng · {formatVnd(Math.max(0, subtotal - discountPreview + (form.fulfillmentMethod === "pickup" || subtotal - discountPreview >= 3000000 ? 0 : 30000)))} <ArrowRight size={17} /></>}</button></form><aside className="checkout-summary"><h2>Đơn hàng của bạn</h2><div className="checkout-items">{lines.map(line => <div className="checkout-item" key={line.variantId}><img src={line.image} alt="" /><div><strong>{line.name}</strong><span>Quy cách {line.size} · SL {line.quantity}</span></div><b>{formatVnd(line.price * line.quantity)}</b></div>)}</div><div className="coupon-box"><input value={form.couponCode} onChange={event => update("couponCode", event.target.value)} placeholder="Mã giảm giá" /><span>{discountPreview > 0 ? "Đã giảm 10%" : "WELCOME10"}</span></div><PriceSummary subtotal={subtotal} discount={discountPreview} /><p className="checkout-summary__secure"><LockKeyhole size={15} /> Dữ liệu checkout được xác thực ở server.</p></aside></div>
    </main>
  </PageFrame>;
}

function PaymentChoice({ active, value, title, detail, disabled, onChange }: { active: boolean; value: PaymentMethod; title: string; detail: string; disabled?: boolean; onChange: (value: PaymentMethod) => void }) {
  return <label className={`${active ? "payment-option payment-option--active" : "payment-option"}${disabled ? " payment-option--disabled" : ""}`}><input type="radio" disabled={disabled} checked={active} onChange={() => onChange(value)} /><span><strong>{title}</strong><small>{detail}</small></span><Check size={17} /></label>;
}
