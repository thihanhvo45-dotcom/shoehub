# ShoeHub – cửa hàng sneaker trực tuyến

ShoeHub là storefront React/Vite với catalog sản phẩm, lọc theo size/màu, giỏ hàng, checkout, tra cứu đơn và khu vực quản trị. Backend Express/tRPC/Drizzle lưu người dùng và dữ liệu cửa hàng trong MySQL-compatible database.

## Chạy local/full-stack

```bash
pnpm install --frozen-lockfile
# Cấu hình DATABASE_URL và các biến server cần thiết trong .env
pnpm db:migrate
pnpm dev
```

Các lệnh kiểm tra:

```bash
pnpm check
pnpm test
pnpm build
```

## Tài khoản người mua và người bán

- `/register` cho phép tạo tài khoản bằng email và mật khẩu, chọn **người mua** hoặc **người bán**.
- `/login` đăng nhập bằng email/mật khẩu; tài khoản Manus cũ vẫn có lựa chọn đăng nhập tương thích.
- Mật khẩu được băm bằng scrypt trên server; hash không được gửi về trình duyệt. Mỗi email chỉ dùng cho một tài khoản.
- Vai trò người mua/người bán được lưu ở server; người dùng không thể tự nâng quyền lên admin. `/seller` được bảo vệ riêng phía server.
- Kênh người bán hiện là trang tài khoản/onboarding. Quản lý sản phẩm riêng cho từng seller chưa có vì catalog hiện theo mô hình một cửa hàng.
- Chưa cấu hình xác minh email hoặc luồng quên/đặt lại mật khẩu; cần bổ sung email provider và quy trình khôi phục trước khi mở đăng ký công khai.

Migration `drizzle/0004_email_password_accounts.sql` thêm hash mật khẩu, buyer/seller roles và unique email index. Trước khi chạy migration trên database có sẵn, kiểm tra email trùng lặp:

```sql
SELECT LOWER(email), COUNT(*) FROM users WHERE email IS NOT NULL GROUP BY LOWER(email) HAVING COUNT(*) > 1;
```

Nếu có kết quả, cần giải quyết các email trùng trước khi thêm unique index. Chạy migration bằng `pnpm db:migrate` và sao lưu database trước khi thay đổi production.

## GitHub Pages

GitHub Pages chỉ phục vụ file tĩnh. Workflow `.github/workflows/deploy-pages.yml` publish `dist/public` sau khi push lên `main`.

Bản Pages là demo: xem catalog, lọc sản phẩm, thêm giỏ và mô phỏng checkout; **đăng ký/đăng nhập tài khoản thật, lưu đơn hàng, xác thực và database không chạy trên GitHub Pages**. Trang login/register sẽ giải thích giới hạn này thay vì giả vờ tạo tài khoản. Để dùng tài khoản thật, triển khai Node/Express và MySQL theo mục trên.

Sau khi push repository:

1. Mở **Settings → Pages** trên GitHub.
2. Chọn **Source → GitHub Actions**.
3. Chờ workflow `Deploy ShoeHub to GitHub Pages` chạy xong.

## Full-stack production

Cần deploy Node.js/Express cùng MySQL-compatible database và cấu hình `DATABASE_URL`, `MANUS_JWT_SECRET` (bắt buộc để ký session cookie cho tài khoản mật khẩu), `PUBLIC_ORIGIN`, cấu hình OAuth nếu giữ Manus login, cùng credentials thanh toán nếu dùng VNPay/MoMo. Không đưa secret vào frontend hoặc GitHub Pages.

Trước khi mở bán, cần kiểm tra migration, backup database, chính sách quyền seller, khôi phục mật khẩu, xác minh email, đơn hàng COD và callback thanh toán sandbox. Ảnh catalog hiện là ảnh demo ShoeHub; thay bằng ảnh thật và cập nhật địa chỉ, số điện thoại, phí giao cùng chính sách cửa hàng.
