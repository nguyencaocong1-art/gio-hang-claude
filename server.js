const express = require("express");
const app = express();
const path = require("path");
const crypto = require("crypto");

// Kiểm tra cấu hình bảo mật ngay khi khởi động (Fail-fast)
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USER || !ADMIN_PASSWORD) {
  console.error(
    "LỖI NGHIÊM TRỌNG: Thiếu cấu hình ADMIN_USER hoặc ADMIN_PASSWORD trong file .env!",
  );
  process.exit(1);
}

// Khai báo db
const db = require("./db");

const stmtDonMoiNhat = db.prepare(
  "SELECT * FROM don_hang ORDER BY id DESC LIMIT 50",
);
const stmtChiTietTheoDon = db.prepare(
  "SELECT * FROM chi_tiet_don_hang WHERE don_hang_id = ?",
);

// Hàm so sánh an toàn tuyệt đối (băm SHA-256 để cố định độ dài, chống rò rỉ thông tin)
function soSanhAnToan(a, b) {
  const hashA = crypto.createHash("sha256").update(String(a)).digest();
  const hashB = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

// Middleware bảo vệ trang/API quản trị bằng Basic Auth
function yeuCauQuanTri(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Quan tri cua hang"');
    return res.status(401).send("Cần đăng nhập để truy cập khu vực quản trị.");
  }

  const phanMa = authHeader.slice(6);
  const chuoiGiaiMa = Buffer.from(phanMa, "base64").toString("utf8");

  const viTriHaiCham = chuoiGiaiMa.indexOf(":");
  if (viTriHaiCham === -1) {
    res.set("WWW-Authenticate", 'Basic realm="Quan tri cua hang"');
    return res.status(401).send("Thông tin xác thực không hợp lệ.");
  }

  const userGuiLen = chuoiGiaiMa.slice(0, viTriHaiCham);
  const passGuiLen = chuoiGiaiMa.slice(viTriHaiCham + 1);

  const hopLeUser = soSanhAnToan(userGuiLen, ADMIN_USER);
  const hopLePass = soSanhAnToan(passGuiLen, ADMIN_PASSWORD);

  if (hopLeUser && hopLePass) {
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="Quan tri cua hang"');
  return res.status(401).send("Sai tên đăng nhập hoặc mật khẩu!");
}

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

// API lấy 50 đơn hàng mới nhất kèm chi tiết sản phẩm
app.get("/api/quan-tri/don-hang", yeuCauQuanTri, function (req, res) {
  const danhSachDon = stmtDonMoiNhat.all();

  const ketQua = danhSachDon.map(function (don) {
    return {
      ...don,
      chi_tiet: stmtChiTietTheoDon.all(don.id),
    };
  });

  res.json(ketQua);
});

// Phục vụ toàn bộ giao diện quản trị (HTML, JS, CSS) từ thư mục riêng 'quan-tri'
app.use(
  "/quan-tri",
  yeuCauQuanTri,
  express.static(path.join(__dirname, "quan-tri")),
);

// Lắng nghe cổng 3000
app.listen(3000, function () {
  console.log("Máy chủ chạy tại http://localhost:3000");
});
