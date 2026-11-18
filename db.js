const Database = require("better-sqlite3");
const db = new Database("cua-hang.db");

// Bật kiểm tra khóa ngoại (Foreign Key Constraints) cho SQLite
db.pragma("foreign_keys = ON");

// Tạo các bảng dữ liệu (sản phẩm, đơn hàng, chi tiết đơn hàng) nếu chưa tồn tại
db.exec(`
  CREATE TABLE IF NOT EXISTS san_pham (
    id INTEGER PRIMARY KEY,
    ten TEXT NOT NULL,
    gia INTEGER NOT NULL,
    anh TEXT
  );

  CREATE TABLE IF NOT EXISTS don_hang (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ten_khach TEXT NOT NULL,
    sdt TEXT NOT NULL,
    dia_chi TEXT NOT NULL,
    tong_tien INTEGER NOT NULL,
    trang_thai TEXT NOT NULL DEFAULT 'moi',
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

const cotDonHang = db.prepare("PRAGMA table_info(don_hang)").all();
if (
  !cotDonHang.some(function (cot) {
    return cot.name === "trang_thai";
  })
) {
  db.exec(
    "ALTER TABLE don_hang ADD COLUMN trang_thai TEXT NOT NULL DEFAULT 'moi'",
  );
  console.log("Đã nâng cấp bảng don_hang: thêm cột 'trang_thai'.");
}

// Migration: Nâng cấp cơ sở dữ liệu cũ nếu chưa có cột 'anh'
const cotSanPham = db.prepare("PRAGMA table_info(san_pham)").all();
if (
  !cotSanPham.some(function (cot) {
    return cot.name === "anh";
  })
) {
  db.exec("ALTER TABLE san_pham ADD COLUMN anh TEXT");
  console.log("Đã nâng cấp bảng san_pham: thêm cột 'anh'.");
}

// Kiểm tra nếu bảng đang trống thì tự động chèn dữ liệu mẫu
const soDong = db
  .prepare("SELECT COUNT(*) AS soDong FROM san_pham")
  .get().soDong;

if (soDong === 0) {
  const themSanPham = db.prepare(
    "INSERT INTO san_pham (id, ten, gia, anh) VALUES (?, ?, ?, ?)",
  );

  // Dùng transaction để chèn dữ liệu an toàn và hiệu quả
  const chenNhieuSanPham = db.transaction((danhSach) => {
    for (const sp of danhSach) {
      themSanPham.run(sp.id, sp.ten, sp.gia, sp.anh);
    }
  });

  chenNhieuSanPham([
    {
      id: 1,
      ten: "SSD Samsung 1TB",
      gia: 1300000,
      anh: "/anh/ssd-samsung-1tb.jpg",
    },
    {
      id: 2,
      ten: "RAM Kingston 16GB",
      gia: 1200000,
      anh: "/anh/ram-kingston-16gb.jpg",
    },
    {
      id: 3,
      ten: "CPU Intel I5",
      gia: 5000000,
      anh: "/anh/cpu-intel-i5.jpg",
    },
  ]);

  console.log("Đã nạp dữ liệu mẫu vào cơ sở dữ liệu thành công!");
} else {
  // Gán ảnh cho các sản phẩm cũ đang bị trống cột 'anh' (không ghi đè ảnh đã có)
  const capNhatAnh = db.prepare(
    "UPDATE san_pham SET anh = ? WHERE id = ? AND anh IS NULL",
  );
  capNhatAnh.run("/anh/ssd-samsung-1tb.jpg", 1);
  capNhatAnh.run("/anh/ram-kingston-16gb.jpg", 2);
  capNhatAnh.run("/anh/cpu-intel-i5.jpg", 3);
}

// Luôn chuẩn hóa các đường dẫn cũ thiếu dấu '/' ở đầu (nếu có)
db.exec(
  "UPDATE san_pham SET anh = '/' || anh WHERE anh IS NOT NULL AND anh NOT LIKE '/%'",
);

module.exports = db;
