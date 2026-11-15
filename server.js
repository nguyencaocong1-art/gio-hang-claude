const express = require("express");
const app = express();
const path = require("path");

// 1. Khai báo danh sách sản phẩm (Dữ liệu trên Server)
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

// 2. Tạo API trả về danh sách sản phẩm 
app.get("/api/san-pham", function (req, res) {
  res.json(danhSachSanPham);
});

// 3. Phục vụ các file tĩnh trong thư mục public 
app.use(express.static(path.join(__dirname, "public")));

// 4. Lắng nghe cổng 3000
app.listen(3000, function () {
  console.log("Máy chủ chạy tại http://localhost:3000");
});