import { useEffect } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LoadingBlock, PageFrame } from "@/components/storefront";

export default function AdminCustomers() {
  const auth = useAuth();
  const enabled = auth.user?.role === "admin";
  const customers = trpc.admin.customers.useQuery(undefined, { enabled });
  useEffect(() => { document.title = "Khách hàng – ShoeHub"; }, []);
  if (!enabled) return <PageFrame><main className="container private-page"><div className="private-card"><p className="eyebrow">Admin only</p><h1>Không có quyền truy cập.</h1><Link href="/admin" className="button button--dark">Về admin</Link></div></main></PageFrame>;
  return <PageFrame><main className="container admin-page"><Link className="back-link" href="/admin"><ArrowLeft size={15} /> Quản trị</Link><div className="admin-heading"><div><p className="eyebrow">Customers</p><h1>Khách hàng.</h1><p>Danh sách tài khoản đồng bộ từ database, không hiển thị dữ liệu nhạy cảm.</p></div></div>{customers.isLoading ? <LoadingBlock /> : <div className="admin-table">{customers.data?.map(customer => <div className="admin-row" key={customer.id}><div><strong>{customer.name || "Chưa cập nhật tên"}</strong><span>{customer.email || "Không có email"}</span></div><div><span>{customer.role}</span><span>{customer.lastSignedIn ? new Date(customer.lastSignedIn).toLocaleDateString("vi-VN") : "—"}</span></div></div>)}{customers.data?.length === 0 && <p className="account-empty"><Users size={16} /> Chưa có khách hàng.</p>}</div>}</main></PageFrame>;
}
