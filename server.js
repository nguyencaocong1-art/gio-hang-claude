const express = require("express");
const app = express();
const path = require("path");

// Cho phép máy chủ đọc được dữ liệu JSON gửi lên từ client qua req.body
app.use(express.json());

// Khai báo danh sách sản phẩm (Dữ liệu gốc trên Server - nguồn chân lý về giá)
const danhSachSanPham = [
  {
    id: 1,
    ten: "SSD Samsung 1TB",
    gia: 1300000,
  },
  {
    id: 2,
    ten: "RAM Kingston 16GB",
    gia: 1200000,
  },
  {
    id: 3,
    ten: "CPU Intel I5",
    gia: 5000000,
  },
];

// Mảng tạm lưu trữ đơn hàng trên server (sẽ mất khi khởi động lại server)
const danhSachDonHang = [];

// API trả về danh sách sản phẩm cho frontend
app.get("/api/san-pham", function (req, res) {
  res.json(danhSachSanPham);
});

// ======================================================
// API NHẬN VÀ XỬ LÝ ĐƠN HÀNG (POST)
// ======================================================
app.post("/api/don-hang", function (req, res) {
  const duLieuGuiLen = req.body;

  // Kiểm tra thông tin khách hàng
  const khach = duLieuGuiLen.khach;
  if (!khach || !khach.ten || !khach.sdt || !khach.diaChi) {
    return res
      .status(400)
      .json({ loi: "Vui lòng điền đầy đủ tên, số điện thoại và địa chỉ!" });
  }

  // Kiểm tra giỏ hàng có dữ liệu hay không
  const gioHang = duLieuGuiLen.gioHang;
  if (!gioHang || !Array.isArray(gioHang) || gioHang.length === 0) {
    return res.status(400).json({ loi: "Giỏ hàng đang trống!" });
  }

  // Duyệt qua từng sản phẩm trong giỏ để kiểm tra tính hợp lệ và tự tính tiền phía server
  let tongTienServer = 0;
  const chiTietDonHang = [];

  for (let item of gioHang) {
    // Kiểm tra số lượng phải là số nguyên lớn hơn 0
    if (!Number.isInteger(item.soLuong) || item.soLuong <= 0) {
      return res
        .status(400)
        .json({ loi: `Số lượng của sản phẩm (ID: ${item.id}) không hợp lệ!` });
    }

    // Tìm sản phẩm trong danh sách gốc của máy chủ theo ID
    const sanPhamGoc = danhSachSanPham.find(function (sp) {
      return sp.id === item.id;
    });

    if (!sanPhamGoc) {
      return res
        .status(400)
        .json({
          loi: `Sản phẩm với ID ${item.id} không tồn tại trên hệ thống!`,
        });
    }

    // Tự động lấy giá chuẩn từ máy chủ (Bất chấp client có gửi giá khác lên)
    const thanhTien = sanPhamGoc.gia * item.soLuong;
    tongTienServer += thanhTien;

    // Lưu lại thông tin dòng đơn hàng đã được kiểm duyệt
    chiTietDonHang.push({
      id: sanPhamGoc.id,
      ten: sanPhamGoc.ten,
      giaGoc: sanPhamGoc.gia,
      soLuong: item.soLuong,
      thanhTien: thanhTien,
    });
  }

  // Tạo mã đơn hàng ngẫu nhiên (hoặc dùng thời gian hiện tại)
  const maDonHang = "DH" + Date.now();

  const donHangMoi = {
    maDonHang: maDonHang,
    khachHang: khach,
    sanPham: chiTietDonHang,
    tongTien: tongTienServer,
    thoiGian: new Date(),
  };

  // Lưu vào mảng danhSachDonHang của máy chủ
  danhSachDonHang.push(donHangMoi);

  // Trả kết quả thành công về cho client
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
