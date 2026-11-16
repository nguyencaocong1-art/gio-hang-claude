const express = require("express");
const app = express();
const path = require("path");

const db = require("./db");

// Cho phép máy chủ đọc được dữ liệu JSON gửi lên từ client qua req.body
app.use(express.json());

// KHAI BÁO MẢNG LƯU ĐƠN HÀNG TẠM THỜI
const danhSachDonHang = [];

app.get("/api/san-pham", function (req, res) {
  const danhSach = db.prepare("SELECT id, ten, gia FROM san_pham").all();
  res.json(danhSach);
});

// ======================================================
// API NHẬN VÀ XỬ LÝ ĐƠN HÀNG (POST) - CÓ BẢO MẬT & XÁC THỰC
// ======================================================
app.post("/api/don-hang", function (req, res) {
  // Phòng hờ req.body là undefined nếu client không gửi JSON lên
  const duLieuGuiLen = req.body || {};

  // Kiểm tra thông tin khách hàng và chuẩn hóa
  const khach = duLieuGuiLen.khach;
  if (!khach || typeof khach !== "object") {
    return res.status(400).json({ loi: "Thông tin khách hàng không hợp lệ!" });
  }

  // Làm sạch và kiểm tra tên (phải là chuỗi và sau khi trim không được rỗng)
  const tenKhach = typeof khach.ten === "string" ? khach.ten.trim() : "";
  const diaChiKhach =
    typeof khach.diaChi === "string" ? khach.diaChi.trim() : "";
  const sdtKhach = typeof khach.sdt === "string" ? khach.sdt.trim() : "";

  if (!tenKhach || !diaChiKhach) {
    return res.status(400).json({
      loi: "Tên và địa chỉ không được để trống hoặc chỉ chứa khoảng trắng!",
    });
  }

  // Kiểm tra định dạng số điện thoại bằng Regex (0 hoặc +84 theo sau là 9-10 chữ số)
  const regexSDT = /^(0|\+84)\d{9,10}$/;
  if (!regexSDT.test(sdtKhach)) {
    return res.status(400).json({ loi: "Số điện thoại không đúng định dạng!" });
  }

  // Kiểm tra giỏ hàng
  const gioHang = duLieuGuiLen.gioHang;
  if (!gioHang || !Array.isArray(gioHang) || gioHang.length === 0) {
    return res.status(400).json({ loi: "Giỏ hàng đang trống!" });
  }

  const timSanPham = db.prepare(
    "SELECT id, ten, gia FROM san_pham WHERE id = ?",
  );

  // Duyệt qua từng sản phẩm để kiểm tra tính hợp lệ và tự tính tiền phía server
  let tongTienServer = 0;
  const chiTietDonHang = [];

  for (let item of gioHang) {
    // Kiểm tra item có phải là object hợp lệ không (tránh lỗi null)
    if (!item || typeof item !== "object") {
      return res
        .status(400)
        .json({ loi: "Sản phẩm trong giỏ hàng không hợp lệ!" });
    }

    // Không ép kiểu ngầm, giữ nguyên giá trị để kiểm tra chặt chẽ kiểu dữ liệu
    const soLuong = Number(item.soLuong);
    const idSp = Number(item.id);

    // Kiểm tra nghiêm ngặt: ID và số lượng phải là số nguyên, số lượng từ 1 đến 100
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

    // Truy vấn bằng .get(idSp)
    const sanPhamGoc = timSanPham.get(idSp);

    if (!sanPhamGoc) {
      return res
        .status(400)
        .json({ loi: `Sản phẩm với ID ${idSp} không tồn tại trên hệ thống!` });
    }

    // Lấy giá chuẩn từ server
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

  // Chỉ lưu những trường đã được làm sạch (Whitelisting)
  const khachHangChuanHoa = {
    ten: tenKhach,
    sdt: sdtKhach,
    diaChi: diaChiKhach,
  };

  const maDonHang = "DH" + Date.now();

  const donHangMoi = {
    maDonHang: maDonHang,
    khachHang: khachHangChuanHoa,
    sanPham: chiTietDonHang,
    tongTien: tongTienServer,
    thoiGian: new Date(),
  };

  danhSachDonHang.push(donHangMoi);

  res.json({
    thongBao: "Đặt hàng thành công!",
    maDonHang: maDonHang,
    tongTien: tongTienServer,
  });
});

// Phục vụ các file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, "public")));

// Lắng nghe cổng 3000
app.listen(3000, function () {
  console.log("Máy chủ chạy tại http://localhost:3000");
});
