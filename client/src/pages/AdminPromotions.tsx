import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { formatVnd } from "@/lib/store";
import { LoadingBlock, PageFrame } from "@/components/storefront";

export default function AdminPromotions() {
  const auth = useAuth();
  const enabled = auth.user?.role === "admin";
  const coupons = trpc.admin.coupons.useQuery(undefined, { enabled });
  const create = trpc.admin.createCoupon.useMutation({ onSuccess: () => { setForm({ code: "", type: "percent", value: "10", minSubtotal: "500000", usageLimit: "" }); coupons.refetch(); } });
  const [form, setForm] = useState({ code: "", type: "percent" as "percent" | "fixed", value: "10", minSubtotal: "500000", usageLimit: "" });
  useEffect(() => { document.title = "Khuyến mãi – ShoeHub"; }, []);
  if (!enabled) return <PageFrame><main className="container private-page"><div className="private-card"><p className="eyebrow">Admin only</p><h1>Không có quyền truy cập.</h1><Link href="/admin" className="button button--dark">Về admin</Link></div></main></PageFrame>;
  const submit = (event: FormEvent) => { event.preventDefault(); create.mutate({ code: form.code, type: form.type, value: Number(form.value), minSubtotal: Number(form.minSubtotal), usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined }); };
  return <PageFrame><main className="container admin-page"><Link className="back-link" href="/admin"><ArrowLeft size={15} /> Quản trị</Link><div className="admin-heading"><div><p className="eyebrow">Promotions</p><h1>Mã giảm giá.</h1><p>Tạo coupon được validate và ghi audit log ở backend.</p></div></div><form className="admin-coupon-form" onSubmit={submit}><label>Mã coupon<input required value={form.code} onChange={event => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="WELCOME10" /></label><label>Loại<select value={form.type} onChange={event => setForm({ ...form, type: event.target.value as "percent" | "fixed" })}><option value="percent">Phần trăm</option><option value="fixed">Số tiền</option></select></label><label>Giá trị<input required type="number" min="1" value={form.value} onChange={event => setForm({ ...form, value: event.target.value })} /></label><label>Đơn tối thiểu<input type="number" min="0" value={form.minSubtotal} onChange={event => setForm({ ...form, minSubtotal: event.target.value })} /></label><label>Giới hạn lượt dùng<input type="number" min="1" value={form.usageLimit} onChange={event => setForm({ ...form, usageLimit: event.target.value })} placeholder="Không giới hạn" /></label><button className="button button--dark" disabled={create.isPending}><Plus size={15} /> {create.isPending ? "Đang tạo…" : "Tạo coupon"}</button>{create.error && <p className="form-error">{create.error.message}</p>}</form><div className="admin-table">{coupons.isLoading ? <LoadingBlock /> : coupons.data?.map(coupon => <div className="admin-row" key={coupon.id}><div><strong>{coupon.code}</strong><span>{coupon.active ? "Đang hoạt động" : "Đã tắt"} · {coupon.usageCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : " lượt"}</span></div><div><b>{coupon.type === "percent" ? `${coupon.value}%` : formatVnd(coupon.value)}</b><span>từ {formatVnd(coupon.minSubtotal)}</span></div></div>)}</div></main></PageFrame>;
}
