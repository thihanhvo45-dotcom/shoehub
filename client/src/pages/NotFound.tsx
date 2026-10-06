import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { setPageSeo } from "@/lib/seo";
import { PageFrame } from "@/components/storefront";

export default function NotFound() {
  useEffect(() => setPageSeo({ title: "Không tìm thấy – ShoeHub", description: "Trang bạn tìm kiếm không tồn tại.", noindex: true }), []);
  return <PageFrame><main className="container not-found"><p className="eyebrow">404 / Not found</p><h1>Trang này đã đi mất.</h1><p>Hãy quay lại cửa hàng và tìm một đôi khác hợp với bạn.</p><Link className="button button--dark" href="/"><ArrowLeft size={16} /> Về trang chủ</Link></main></PageFrame>;
}
