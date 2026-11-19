# Ứng dụng Quản lý Bán hàng & Đơn hàng Full-Stack

Ứng dụng web bán hàng và quản trị đơn hàng xây dựng bằng Node.js, Express và SQLite (`better-sqlite3`), gồm trang mua sắm phía khách hàng và khu vực quản trị đơn hàng phía người bán.

## Tính năng chính
- **Bán hàng & Giỏ hàng:** Xem danh sách sản phẩm, thêm/tăng/giảm/xóa sản phẩm, lưu giỏ hàng qua `localStorage` và đặt hàng an toàn bằng SQLite transaction.
- **Trang Quản trị (`/quan-tri`):**
  - Xác thực bằng HTTP Basic Auth kết hợp `crypto.timingSafeEqual` và giới hạn tần suất đăng nhập sai (`express-rate-limit`).
  - Quản lý trạng thái đơn hàng (`moi`, `da_xac_nhan`, `dang_giao`, `da_giao`, `da_huy`) theo danh sách bước hợp lệ do máy chủ cung cấp.
  - Kiểm soát đồng thời lạc quan (`UPDATE ... WHERE id = ? AND trang_thai = ?`, trả mã `409` khi có xung đột) và tự đồng bộ lại danh sách khi gặp lỗi.
  - Giao diện tương thích màn hình điện thoại (bảng cuộn ngang, liên kết gọi điện `tel:`, cảnh báo khi mất kết nối/tải lỗi).
- **Bảo mật & Ổn định:** Tích hợp `helmet`, `trust proxy`, `express-rate-limit` cho đặt hàng, kiểm tra định dạng tham số/dữ liệu đầu vào và middleware xử lý lỗi chung trả JSON.

## Yêu cầu hệ thống
- **Node.js:** Phiên bản `18.x` trở lên.
- **npm:** Đi kèm khi cài đặt Node.js.

## Hướng dẫn cài đặt và chạy trên máy

1. **Mở thư mục dự án** trong terminal hoặc VS Code.

2. **Cài đặt thư viện:**
   ```bash
   npm install