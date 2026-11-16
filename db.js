const Database = require("better-sqlite3");
const db = new Database("cua-hang.db");

// Bật kiểm tra khóa ngoại (Foreign Key Constraints) cho SQLite
db.pragma("foreign_keys = ON");

// Tạo các bảng dữ liệu (sản phẩm, đơn hàng, chi tiết đơn hàng) nếu chưa tồn tại
db.exec(`
  CREATE TABLE IF NOT EXISTS san_pham (
    id INTEGER PRIMARY KEY,
    ten TEXT NOT NULL,
    gia INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS don_hang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ten_khach TEXT NOT NULL,
    sdt TEXT NOT NULL,
    dia_chi TEXT NOT NULL,
    tong_tien INTEGER NOT NULL,
    tao_luc TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS chi_tiet_don_hang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    don_hang_id INTEGER NOT NULL REFERENCES don_hang(id),
    san_pham_id INTEGER NOT NULL REFERENCES san_pham(id),
    ten_san_pham TEXT NOT NULL,
    gia_luc_mua INTEGER NOT NULL,
    so_luong INTEGER NOT NULL
  );
`);

// Kiểm tra nếu bảng đang trống thì tự động chèn dữ liệu mẫu
const soDong = db
  .prepare("SELECT COUNT(*) AS soDong FROM san_pham")
  .get().soDong;

if (soDong === 0) {
  const themSanPham = db.prepare(
    "INSERT INTO san_pham (id, ten, gia) VALUES (?, ?, ?)",
  );

  // Dùng transaction để chèn dữ liệu an toàn và hiệu quả
  const chenNhieuSanPham = db.transaction((danhSach) => {
    for (const sp of danhSach) {
      themSanPham.run(sp.id, sp.ten, sp.gia);
    }
  });

  chenNhieuSanPham([
    { id: 1, ten: "SSD Samsung 1TB", gia: 1300000 },
    { id: 2, ten: "RAM Kingston 16GB", gia: 1200000 },
    { id: 3, ten: "CPU Intel I5", gia: 5000000 },
  ]);

  console.log("Đã nạp dữ liệu mẫu vào cơ sở dữ liệu thành công!");
}

module.exports = db;
