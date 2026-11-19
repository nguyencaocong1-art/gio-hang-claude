# Ứng dụng Quản lý Bán hàng & Đơn hàng Full-Stack

Ứng dụng web bán hàng và quản trị đơn hàng xây dựng bằng Node.js, Express và SQLite (`better-sqlite3`), gồm trang mua sắm phía khách hàng và khu vực quản trị đơn hàng phía người bán.

## Tính năng chính
- **Bán hàng & Giỏ hàng:** Xem sản phẩm, thêm/tăng/giảm/xóa sản phẩm, lưu giỏ hàng bằng `localStorage` và đặt hàng thông qua SQLite transaction.
- **Trang Quản trị (`/quan-tri`):**
  - Xác thực HTTP Basic Auth kết hợp `crypto.timingSafeEqual` và giới hạn tần suất đăng nhập sai (`express-rate-limit`).
  - Cập nhật trạng thái đơn hàng (`moi`, `da_xac_nhan`, `dang_giao`, `da_giao`, `da_huy`) theo danh sách chuyển tiếp hợp lệ từ máy chủ.
  - Kiểm soát đồng thời lạc quan (`UPDATE ... WHERE id = ? AND trang_thai = ?`, trả mã `409` khi có xung đột) và tự đồng bộ lại danh sách khi xảy ra lỗi.
  - Giao diện tương thích màn hình điện thoại (bảng cuộn ngang, liên kết gọi điện `tel:`, cảnh báo mất kết nối/lỗi tải dữ liệu).
- **Bảo mật & Sao lưu:** Tích hợp `helmet`, `express-rate-limit`, cấu hình `TRUST_PROXY`, kiểm tra cấu hình bắt buộc khi khởi động, xử lý lỗi tập trung trả JSON và tự động sao lưu SQLite an toàn (`db.backup`) giữ 7 bản gần nhất.

## Yêu cầu hệ thống
- **Node.js:** Phiên bản `20.6` trở lên (để hỗ trợ tùy chọn `--env-file` khi chạy).
- **npm:** Đi kèm khi cài đặt Node.js.

## Hướng dẫn cài đặt và chạy trên máy

1. **Mở thư mục dự án** trong terminal hoặc VS Code.

2. **Cài đặt thư viện:**
   ```bash
   npm install