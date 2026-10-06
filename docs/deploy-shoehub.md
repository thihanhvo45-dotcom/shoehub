# Triển khai ShoeHub

## GitHub Pages – bản frontend demo

Workflow `.github/workflows/deploy-pages.yml` build frontend vào `dist/public`, tạo `404.html` cho fallback route SPA và publish bằng GitHub Pages. Build bật `VITE_STATIC_DEMO`, nên trang đăng nhập/đăng ký thông báo rõ rằng tài khoản thật không được lưu.

Bản Pages dùng catalog demo trong `shared/catalog.ts` và fallback tRPC trong `client/src/lib/static-trpc.ts`. Có thể xem sản phẩm, lọc, thêm giỏ và mô phỏng checkout. GitHub Pages không chạy Express, không có database, không lưu tài khoản/đơn hàng thật.

## Full-stack – tài khoản và dữ liệu thật

Chạy `pnpm db:migrate`, sau đó `pnpm build`/`pnpm start` trên hosting hỗ trợ Node.js và MySQL-compatible database. Cấu hình tối thiểu:

| Biến | Mục đích |
|---|---|
| `DATABASE_URL` | Kết nối MySQL production |
| `PUBLIC_ORIGIN` | URL HTTPS canonical |
| `MANUS_JWT_SECRET` | Bắt buộc để ký session cookie cho đăng nhập email/mật khẩu; cũng dùng cho Manus login |
| `VNPAY_*` | Chỉ cần khi bật VNPay |
| `MOMO_*` | Chỉ cần khi bật MoMo |

Đăng ký tại `/register` tạo buyer hoặc seller riêng theo email; đăng nhập tại `/login`. Mật khẩu được băm bằng scrypt, session dùng cookie HttpOnly/Secure, và server tự kiểm tra vai trò. `admin` không phải lựa chọn đăng ký. `/seller` chỉ cho role seller; trang seller hiện ở mức hồ sơ/onboarding, chưa có catalog đa nhà bán.

Migration `0004_email_password_accounts.sql` mở rộng role, thêm `passwordHash` nullable và unique index trên email. Trước migration database hiện có, kiểm tra email trùng (kể cả khác hoa/thường), xử lý nếu cần, rồi backup database.

**Chưa có xác minh email hoặc quên/đặt lại mật khẩu.** Cần bổ sung email provider và quy trình phục hồi, cùng chính sách duyệt người bán, trước khi mở đăng ký cho khách ngoài. Không commit `.env`, merchant secret, dữ liệu thẻ hoặc thông tin cá nhân.
