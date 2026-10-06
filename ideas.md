# ShoeHub — Design brief

## Design direction

Tham chiếu trực tiếp website người dùng cung cấp: `https://hh6624559-hash.github.io/bao-mat/`. Bản triển khai giữ tinh thần checkout-first, compact và thân thiện mobile, nhưng xây lại độc lập trong project full-stack.

- **Design movement:** utility food ordering, rõ ràng trước đẹp cầu kỳ.
- **Core principles:** chọn sản phẩm nhanh, tổng tiền luôn nhìn thấy, form ngắn, trạng thái rõ, chạm dễ trên mobile.
- **Color philosophy:** nền xanh xám rất nhạt như giấy gói; card trắng; xanh lá đậm cho hành động; cam đỏ cho tổng tiền/điểm nhấn.
- **Layout paradigm:** hai cột list + order panel ở desktop; một cột trên mobile; order panel sticky desktop.
- **Signature elements:** card sản phẩm 3 cột emoji/ảnh + tên + quantity control; tab Mua hàng/Lịch sử/Kênh người bán; total lớn màu cam; pill trạng thái.
- **Interaction:** optimistic quantity updates ở cart; mutation checkout chờ server xác nhận; lỗi inline và toast ngắn.
- **Animation:** tối thiểu, chỉ transition hover/focus và modal xác nhận; không dùng hiệu ứng nặng.
- **Typography:** Be Vietnam Pro nếu tải được, fallback system; heading đậm vừa, số tiền đậm.
- **Brand essence/voice:** gần gũi, sạch, nhanh, “bữa nhỏ gọn cho ngày bận”.
- **Wordmark/logo:** chữ `ShoeHub` với biểu tượng tam giác giày và dải rong biển; SVG phẳng, dễ đọc ở 24px.
- **Signature brand color:** `#1f5c3f`; accent hot `#d9480f`; canvas `#f2f6f1`.

## Asset placements

- `client/public/assets/shoehub-hero.jpg`: hero/banner nhẹ ở trang mua hàng.
- `client/public/assets/shoehub-terracotta-low.jpg`, `shoehub-forest-trail.jpg`, `shoehub-sand-canvas.jpg`: ảnh card sản phẩm demo.
- `client/public/shoehub-mark.svg` và `favicon.svg`: logo/header/favicon.

## Brand boundaries

Không dùng logo, mã nguồn, payment details, copy độc quyền hoặc nhận diện của website tham chiếu. Chỉ học bố cục, flow và các trường dữ liệu công khai mà người dùng yêu cầu.
