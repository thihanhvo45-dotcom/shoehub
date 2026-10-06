# Triển khai ShoeHub

## GitHub Pages – bản frontend demo

GitHub Pages phù hợp cho frontend tĩnh. Workflow `.github/workflows/deploy-pages.yml` chạy `pnpm run build:static`, copy `dist/public/index.html` thành `dist/public/404.html` để các route SPA không bị trắng trang, rồi publish `dist/public` bằng GitHub Pages.

Bản Pages dùng `shared/catalog.ts` và `client/src/lib/static-trpc.ts` để hiển thị catalog demo và mô phỏng checkout tại trình duyệt. Không dùng GitHub Pages để lưu đơn hàng, xác thực người dùng, database hoặc secret thanh toán.

## Full-stack – nhận đơn thật

Chạy `pnpm build`/`pnpm start` trên hosting có Node.js và MySQL-compatible database. Cấu hình tối thiểu:

| Biến | Mục đích |
|---|---|
| `DATABASE_URL` | Kết nối MySQL production |
| `PUBLIC_ORIGIN` | URL HTTPS canonical |
| `VNPAY_*` | Chỉ cần khi bật VNPay |
| `MOMO_*` | Chỉ cần khi bật MoMo |

Trước khi mở bán:

- Chạy migration và seed sau khi đã backup database.
- Thay ảnh demo, số điện thoại, địa chỉ, phí giao và chính sách.
- Kiểm tra tồn kho, checkout COD và callback thanh toán sandbox.
- Không commit `.env`, merchant secret, dữ liệu thẻ hoặc thông tin cá nhân.
- Chạy `pnpm check`, `pnpm test` và `pnpm build`.
