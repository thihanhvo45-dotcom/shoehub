# ShoeHub – cửa hàng sneaker trực tuyến

ShoeHub là storefront React/Vite cho cửa hàng giày, gồm catalog sản phẩm, lọc theo size/màu, giỏ hàng, checkout, tra cứu đơn và khu vực quản trị. Backend hiện có Express/tRPC/Drizzle để chạy full-stack khi kết nối MySQL.

## Chạy local

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Các lệnh kiểm tra:

```bash
pnpm check
pnpm test
pnpm build
```

## GitHub Pages

GitHub Pages chỉ phục vụ file tĩnh. Dự án có sẵn workflow tại `.github/workflows/deploy-pages.yml` để build frontend từ `dist/public` và publish tự động khi push lên `main`.

Bản Pages dùng catalog demo trong `shared/catalog.ts` và fallback tRPC ở `client/src/lib/static-trpc.ts`, vì vậy có thể xem sản phẩm, lọc, thêm giỏ và mô phỏng checkout mà không cần server. Dữ liệu đơn hàng không được lưu thật trên GitHub Pages.

Sau khi push repository:

1. Mở **Settings → Pages** trên GitHub.
2. Chọn **Source → GitHub Actions**.
3. Chờ workflow `Deploy ShoeHub to GitHub Pages` chạy xong.
4. Với repository dạng `username.github.io` hoặc custom domain, đặt `VITE_BASE_PATH=/` trong workflow; repository dạng project site dùng `/<repo-name>/`.

## Full-stack production

Để nhận đơn thật, cần deploy server/Express cùng MySQL và cấu hình `DATABASE_URL`, `PUBLIC_ORIGIN` cùng credentials thanh toán nếu dùng VNPay/MoMo. Không đưa secret vào frontend hoặc GitHub Pages.

## Ghi chú thương hiệu

Ảnh trong catalog hiện là ảnh demo nguyên bản được tạo cho ShoeHub. Trước khi mở bán, thay bằng ảnh sản phẩm thật, cập nhật số điện thoại/địa chỉ/chính sách và kiểm tra migration database.
