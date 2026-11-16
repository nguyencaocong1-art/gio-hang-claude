const express = require("express");
const app = express();
const path = require("path");

const db = require("./db");

// Chuẩn bị sẵn toàn bộ các câu lệnh SQL ở đầu file để tái sử dụng
const stmtLayTatCaSanPham = db.prepare("SELECT id, ten, gia FROM san_pham");
const stmtTimSanPham = db.prepare(
  "SELECT id, ten, gia FROM san_pham WHERE id = ?",
);

const stmtThemDonHang = db.prepare(`
  INSERT INTO don_hang (ten_khach, sdt, dia_chi, tong_tien)
  VALUES (?, ?, ?, ?)
`);

const stmtThemChiTiet = db.prepare(`
  INSERT INTO chi_tiet_don_hang (don_hang_id, san_pham_id, ten_san_pham, gia_luc_mua, so_luong)
  VALUES (?, ?, ?, ?, ?)
`);

// Tạo sẵn hàm transaction ở ngoài để tái sử dụng
const luuDonHangTransaction = db.transaction(
  (thongTinKhach, chiTiet, tongTien) => {
    const ketQuaDonHang = stmtThemDonHang.run(
      thongTinKhach.ten,
      thongTinKhach.sdt,
      thongTinKhach.diaChi,
      tongTien,
    );

    const donHangId = ketQuaDonHang.lastInsertRowid;

    for (const item of chiTiet) {
      stmtThemChiTiet.run(
        donHangId,
        item.id,
        item.ten,
        item.giaGoc,
        item.soLuong,
      );
    }

    return "DH" + String(donHangId).padStart(6, "0");
  },
);

// Cho phép máy chủ đọc được dữ liệu JSON gửi lên từ client qua req.body
app.use(express.json());

// API lấy danh sách sản phẩm
app.get("/api/san-pham", function (req, res) {
  const danhSach = stmtLayTatCaSanPham.all();
  res.json(danhSach);
});

// ======================================================
// API NHẬN VÀ XỬ LÝ ĐƠN HÀNG (POST) - BẢO MẬT & SQLITE TRANSACTION
// ======================================================
app.post("/api/don-hang", function (req, res) {
  const duLieuGuiLen = req.body || {};

  // Kiểm tra thông tin khách hàng và chuẩn hóa
  const khach = duLieuGuiLen.khach;
  if (!khach || typeof khach !== "object") {
    return res.status(400).json({ loi: "Thông tin khách hàng không hợp lệ!" });
  }

  const tenKhach = typeof khach.ten === "string" ? khach.ten.trim() : "";
  const diaChiKhach =
    typeof khach.diaChi === "string" ? khach.diaChi.trim() : "";
  const sdtKhach = typeof khach.sdt === "string" ? khach.sdt.trim() : "";

  if (!tenKhach || !diaChiKhach) {
    return res.status(400).json({
      loi: "Tên và địa chỉ không được để trống hoặc chỉ chứa khoảng trắng!",
    });
  }

  const regexSDT = /^(0|\+84)\d{9,10}$/;
  if (!regexSDT.test(sdtKhach)) {
    return res.status(400).json({ loi: "Số điện thoại không đúng định dạng!" });
  }

  // Kiểm tra giỏ hàng
  const gioHang = duLieuGuiLen.gioHang;
  if (!gioHang || !Array.isArray(gioHang) || gioHang.length === 0) {
    return res.status(400).json({ loi: "Giỏ hàng đang trống!" });
  }

  let tongTienServer = 0;
  const chiTietDonHang = [];

  for (let item of gioHang) {
    if (!item || typeof item !== "object") {
      return res
        .status(400)
        .json({ loi: "Sản phẩm trong giỏ hàng không hợp lệ!" });
    }

    const soLuong = item.soLuong;
    const idSp = item.id;

    if (
      !Number.isInteger(idSp) ||
      !Number.isInteger(soLuong) ||
      soLuong < 1 ||
      soLuong > 100
    ) {
      return res
        .status(400)
        .json({ loi: "ID hoặc số lượng sản phẩm không hợp lệ!" });
    }

    // Dùng trực tiếp stmtTimSanPham đã chuẩn bị ở đầu file
    const sanPhamGoc = stmtTimSanPham.get(idSp);

    if (!sanPhamGoc) {
      return res
        .status(400)
        .json({ loi: `Sản phẩm với ID ${idSp} không tồn tại trên hệ thống!` });
    }

    const thanhTien = sanPhamGoc.gia * soLuong;
    tongTienServer += thanhTien;

    chiTietDonHang.push({
      id: sanPhamGoc.id,
      ten: sanPhamGoc.ten,
      giaGoc: sanPhamGoc.gia,
      soLuong: soLuong,
      thanhTien: thanhTien,
    });
  }

  let maDonHangChuoi = "";

  try {
    maDonHangChuoi = luuDonHangTransaction(
      { ten: tenKhach, sdt: sdtKhach, diaChi: diaChiKhach },
      chiTietDonHang,
      tongTienServer,
    );
  } catch (loiDb) {
    console.error("Lỗi khi lưu đơn hàng vào CSDL:", loiDb);
    return res
      .status(500)
      .json({ loi: "Lỗi máy chủ khi lưu đơn hàng, vui lòng thử lại sau!" });
  }

  res.json({
    thongBao: "Đặt hàng thành công!",
    maDonHang: maDonHangChuoi,
    tongTien: tongTienServer,
  });
});

// Phục vụ các file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, "public")));

// Lắng nghe cổng 3000
app.listen(3000, function () {
  console.log("Máy chủ chạy tại http://localhost:3000");
});
