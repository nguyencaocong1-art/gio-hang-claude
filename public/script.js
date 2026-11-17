let danhSachSanPham = [];

// Lấy thẻ div từ HTML
const khungSanPham = document.getElementById("danh-sach-san-pham");
// Đưa khungGioHang ra biến toàn cục để dùng chung cho cả render và bắt sự kiện
const khungGioHang = document.getElementById("gio-hang");

const formDatHang = document.getElementById("form-dat-hang");
const thongBaoP = document.getElementById("thong-bao");
const btnDatHang = document.getElementById("btn-dat-hang");

// ======================================================
// HIỂN THỊ SẢN PHẨM RA TRANG
// ======================================================
function hienThiSanPham() {
  khungSanPham.replaceChildren();

  danhSachSanPham.forEach(function (sp) {
    const theSp = document.createElement("div");
    theSp.className = "san-pham";

    // Tạo ảnh sản phẩm (dùng đường dẫn gốc /anh/...)
    const img = document.createElement("img");
    img.src = sp.anh ? sp.anh : "/anh/mac-dinh.jpg";
    img.alt = sp.ten;
    img.loading = "lazy";
    img.className = "anh-san-pham";

    img.onerror = function () {
      if (!this.src.endsWith("/anh/mac-dinh.jpg")) {
        this.src = "/anh/mac-dinh.jpg";
      }
    };

    const tieuDe = document.createElement("h3");
    tieuDe.textContent = sp.ten;

    const giaP = document.createElement("p");
    giaP.textContent = `Giá: ${sp.gia.toLocaleString("vi-VN")}đ`;

    const btnThem = document.createElement("button");
    btnThem.dataset.id = sp.id;
    btnThem.textContent = "Thêm vào giỏ";

    theSp.appendChild(img);
    theSp.appendChild(tieuDe);
    theSp.appendChild(giaP);
    theSp.appendChild(btnThem);

    khungSanPham.appendChild(theSp);
  });
}

// ======================================================
// HÀM TẢI DỮ LIỆU TỪ MÁY CHỦ (API)
// ======================================================
async function taiSanPham() {
  try {
    const phanHoi = await fetch("/api/san-pham");
    if (!phanHoi.ok) {
      throw new Error("Máy chủ trả về lỗi");
    }
    danhSachSanPham = await phanHoi.json();

    // Đánh dấu đã tải xong dữ liệu thành công
    daTaiXong = true;

    // Lọc bỏ các sản phẩm đã bị gỡ khỏi hệ thống ra khỏi giỏ hàng
    gioHang = gioHang.filter(function (item) {
      return danhSachSanPham.some(function (sp) {
        return sp.id === item.id;
      });
    });

    hienThiSanPham();
    hienThiGioHang();
  } catch (loi) {
    daTaiXong = true; // Vẫn đánh dấu true để thoát trạng thái "Đang tải..."
    khungSanPham.innerHTML =
      "<p>Không tải được sản phẩm, vui lòng thử lại.</p>";
    khungGioHang.innerHTML = "<p>Không thể tải giỏ hàng.</p>";
    console.error(loi);
  }
}

// ======================================================
// HIỂN THỊ GIỎ HÀNG & LOCALSTORAGE LÊN TRANG (DOM THUẦN)
// ======================================================
let gioHang = JSON.parse(localStorage.getItem("gioHang")) || [];
let daTaiXong = false;

function luuGioHang() {
  localStorage.setItem("gioHang", JSON.stringify(gioHang));
}

function taoNutGioHang(id, action, nhanAria, kyHieu) {
  const btn = document.createElement("button");
  btn.dataset.id = id;
  btn.dataset.action = action;
  btn.setAttribute("aria-label", nhanAria);
  btn.textContent = kyHieu;
  return btn;
}

function hienThiGioHang() {
  khungGioHang.replaceChildren();

  if (!daTaiXong) {
    const pCho = document.createElement("p");
    pCho.textContent = "Đang tải giỏ hàng...";
    khungGioHang.appendChild(pCho);
    return;
  }

  luuGioHang();

  if (gioHang.length === 0) {
    const pTrong = document.createElement("p");
    pTrong.textContent = "Giỏ hàng trống";
    khungGioHang.appendChild(pTrong);
    return;
  }

  const ul = document.createElement("ul");
  let tongTien = 0;

  gioHang.forEach(function (item) {
    const sanPhamGoc = danhSachSanPham.find(function (sp) {
      return sp.id === item.id;
    });

    if (!sanPhamGoc) return;

    const thanhTien = sanPhamGoc.gia * item.soLuong;
    tongTien += thanhTien;

    const li = document.createElement("li");

    // Khối thông tin sản phẩm
    const spanThongTin = document.createElement("span");
    spanThongTin.className = "thong-tin";
    spanThongTin.append(
      `${sanPhamGoc.ten} - Đơn giá: ${sanPhamGoc.gia.toLocaleString("vi-VN")}đ - Số lượng: ${item.soLuong} - Thành tiền: `,
    );

    const strongThanhTien = document.createElement("strong");
    strongThanhTien.textContent = `${thanhTien.toLocaleString("vi-VN")}đ`;
    spanThongTin.appendChild(strongThanhTien);

    // Cụm nút điều khiển
    const divNut = document.createElement("div");
    divNut.className = "nut-dieu-khien";
    divNut.appendChild(taoNutGioHang(item.id, "tang", "Tăng số lượng", "+"));
    divNut.appendChild(taoNutGioHang(item.id, "giam", "Giảm số lượng", "-"));
    divNut.appendChild(taoNutGioHang(item.id, "xoa", "Xóa sản phẩm", "Xóa"));

    li.appendChild(spanThongTin);
    li.appendChild(divNut);
    ul.appendChild(li);
  });

  khungGioHang.appendChild(ul);

  const h3TongTien = document.createElement("h3");
  h3TongTien.textContent = `Tổng tiền: ${tongTien.toLocaleString("vi-VN")}đ`;
  khungGioHang.appendChild(h3TongTien);
}

// Gọi lần đầu để hiển thị trạng thái "Đang tải giỏ hàng..."
hienThiGioHang();

// ======================================================
// SỰ KIỆN KHI BẤM NÚT THÊM VÀO GIỎ HÀNG Ở DANH SÁCH SẢN PHẨM
// ======================================================

// Gắn sự kiện click cho khung chứa sản phẩm
khungSanPham.addEventListener("click", function (event) {
  // kiểm tra xem người dùng có bấm vào thẻ button hay không
  const nutBam = event.target;

  if (nutBam.tagName === "BUTTON") {
    // lấy id từ thuộc tính data-id đã gắn lúc tạo html(chuyển từ chuỗi sang số)
    const idSanPham = Number(nutBam.dataset.id);

    // tìm sản phẩm trong danhSachSanPham có id khớp với id vừa bấm
    const sanPhamTimThay = danhSachSanPham.find(function (sp) {
      return sp.id === idSanPham;
    });

    if (sanPhamTimThay) {
      // kiểm tra xem sản phẩm này đã có trong gioHang chưa
      const itemTrongGio = gioHang.find(function (item) {
        return item.id === idSanPham;
      });

      if (itemTrongGio) {
        // nếu đã có tăng số lượng lên 1
        itemTrongGio.soLuong += 1;
      } else {
        // Chỉ lưu id và soLuong tinh gọn
        gioHang.push({
          id: sanPhamTimThay.id,
          soLuong: 1,
        });
      }

      // sau khi cập nhật giỏ hàng, gọi hàm hiển thị lại giao diện
      hienThiGioHang();
    }
  }
});

//  Xử lý sự kiện tăng, giảm, xóa trong khung giỏ hàng
khungGioHang.addEventListener("click", function (event) {
  const nutBam = event.target;

  // Kiểm tra xem người dùng có bấm vào nút có data-action hay không
  if (nutBam.tagName === "BUTTON") {
    const idSanPham = Number(nutBam.dataset.id);
    const hanhDong = nutBam.dataset.action;

    // Tìm sản phẩm trong giỏ hàng
    const itemTrongGio = gioHang.find(function (item) {
      return item.id === idSanPham;
    });

    if (!itemTrongGio) return;

    if (hanhDong === "tang") {
      // Tăng số lượng lên 1
      itemTrongGio.soLuong += 1;
    } else if (hanhDong === "giam") {
      // Giảm số lượng đi 1
      itemTrongGio.soLuong -= 1;

      // Nếu số lượng về 0 thì tự động xóa khỏi giỏ
      if (itemTrongGio.soLuong <= 0) {
        gioHang = gioHang.filter(function (item) {
          return item.id !== idSanPham;
        });
      }
    } else if (hanhDong === "xoa") {
      // Dùng filter để loại bỏ sản phẩm có id tương ứng ra khỏi mảng
      gioHang = gioHang.filter(function (item) {
        return item.id !== idSanPham;
      });
    }

    // Sau khi thay đổi dữ liệu giỏ hàng, cập nhật lại giao diện
    hienThiGioHang();
  }
});

// ======================================================
// XỬ LÝ SỰ KIỆN GỬI FORM ĐẶT HÀNG (SUBMIT)
// ======================================================

formDatHang.addEventListener("submit", async function (event) {
  // Chặn trình duyệt không tải lại trang mặc định
  event.preventDefault();

  // Xóa sạch thông báo cũ và reset class
  thongBaoP.textContent = "";
  thongBaoP.className = "";

  // Kiểm tra nếu giỏ hàng đang trống thì từ chối gửi
  if (gioHang.length === 0) {
    thongBaoP.textContent =
      "Giỏ hàng của bạn đang trống, vui lòng chọn sản phẩm!";
    thongBaoP.className = "loi";
    return;
  }

  // Lấy giá trị từ các ô nhập trong form
  const ten = document.getElementById("ten").value.trim();
  const sdt = document.getElementById("sdt").value.trim();
  const diaChi = document.getElementById("diaChi").value.trim();

  // Tạo mảng giỏ hàng tinh gọn chỉ gửi id và soLuong (Bảo mật: Không gửi giá tiền)
  const gioHangTinhGon = gioHang.map(function (item) {
    return {
      id: item.id,
      soLuong: item.soLuong,
    };
  });

  // Chống bấm đúp (Disable nút khi đang gửi yêu cầu)
  btnDatHang.disabled = true;
  btnDatHang.textContent = "Đang xử lý...";
  thongBaoP.textContent = "";

  try {
    // Gửi dữ liệu lên máy chủ thông qua fetch POST
    const phanHoi = await fetch("/api/don-hang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        khach: { ten: ten, sdt: sdt, diaChi: diaChi },
        gioHang: gioHangTinhGon,
      }),
    });

    const ketQua = await phanHoi.json();

    if (!phanHoi.ok) {
      // Nếu máy chủ trả về lỗi (400, 500,...)
      throw new Error(ketQua.loi || "Có lỗi xảy ra từ máy chủ.");
    }

    //  Thành công: Hiển thị thông báo, xóa giỏ hàng và reset form
    const tongTienFormatted = ketQua.tongTien.toLocaleString("vi-VN");
    thongBaoP.textContent = `Đặt hàng thành công! Mã đơn: ${ketQua.maDonHang}. Tổng tiền: ${tongTienFormatted}đ`;
    thongBaoP.className = "thanh-cong";

    // Xóa giỏ hàng trên giao diện, localStorage và reset form nhập
    gioHang = [];
    hienThiGioHang();
    formDatHang.reset();
  } catch (loi) {
    // Hiển thị lỗi bằng textContent (phòng chống XSS)
    thongBaoP.textContent = loi.message;
    thongBaoP.className = "loi";
    console.error(loi);
  } finally {
    // Bật lại nút bấm dù thành công hay thất bại
    btnDatHang.disabled = false;
    btnDatHang.textContent = "Xác nhận đặt hàng";
  }
});

taiSanPham();
