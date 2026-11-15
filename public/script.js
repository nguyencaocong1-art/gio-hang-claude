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
  // Tạo biến lưu trữ chuỗi HTML
  let htmlContent = "";

  // Lặp qua từng sản phẩm và cộng dồn chuỗi HTML
  danhSachSanPham.forEach(function (sp) {
    htmlContent += `
  <div class="san-pham">
  <h3>${sp.ten}</h3>
  <p>Giá: ${sp.gia.toLocaleString("vi-VN")}đ</p>
  <button data-id="${sp.id}">Thêm vào giỏ</button>
  </div>
  `;
  });
  // Đưa toàn bộ HTML vào thẻ div
  khungSanPham.innerHTML = htmlContent;
}

// Hàm tải dữ liệu từ API /api/san-pham
async function taiSanPham() {
  try {
    const phanHoi = await fetch("/api/san-pham");
    if (!phanHoi.ok) {
      throw new Error("Máy chủ trả về lỗi");
    }
    danhSachSanPham = await phanHoi.json();

    // Sau khi có dữ liệu, gọi hàm hiển thị sản phẩm lên giao diện
    hienThiSanPham();
  } catch (loi) {
    khungSanPham.innerHTML =
      "<p>Không tải được sản phẩm, vui lòng thử lại.</p>";
    console.error(loi);
  }
}

// Gọi hàm tải sản phẩm khi vừa mở trang
taiSanPham();

// ======================================================
// HIỂN THỊ GIỎ HÀNG & LOCALSTORAGE LÊN TRANG
// ======================================================

// đọc dữ liệu từ localstorage khi vừa tải trang
// nếu chưa có (null), dùng mảng rỗng [] bằng toán tử ||
let gioHang = JSON.parse(localStorage.getItem("gioHang")) || [];

// hàm hỗ trợ lưu giỏ hàng và localstorage
function luuGioHang() {
  localStorage.setItem("gioHang", JSON.stringify(gioHang));
}

// hàm hiển thị giỏ hàng và tổng tiền lên trang web
function hienThiGioHang() {
  // Mỗi khi hiển thị/cập nhật giỏ hàng, ta tiến hành lưu luôn vào localStorage
  luuGioHang();

  // nếu giỏ hàng trống, hiển thị thông báo
  if (gioHang.length === 0) {
    khungGioHang.innerHTML = "<p>giỏ hàng trống</p>";
    return; //dừng hàm luôn, không chạy phần dưới nữa
  }

  // khởi tạo chuỗi html rỗng mới mỗi lần hàm chạy để tránh bị lặp cộng dồn
  let htmlGioHang = "<ul>";

  // Biến tính tổng tiền dùng reduce
  const tongTien = gioHang.reduce(function (tong, item) {
    return tong + item.gia * item.soLuong;
  }, 0);

  gioHang.forEach(function (item) {
    // tính thành tiền cho từng sản phẩm
    const thanhTien = item.gia * item.soLuong;

    htmlGioHang += `
      <li>
        <span class="thong-tin">
          ${item.ten} - 
          Đơn giá: ${item.gia.toLocaleString("vi-VN")}đ - 
          Số lượng: ${item.soLuong} - 
          Thành tiền: <strong>${thanhTien.toLocaleString("vi-VN")}đ</strong>
        </span>
        
        <div class="nut-dieu-khien">
          <button data-id="${item.id}" data-action="tang" aria-label="Tăng số lượng">+</button>
          <button data-id="${item.id}" data-action="giam" aria-label="Giảm số lượng">-</button>
          <button data-id="${item.id}" data-action="xoa" aria-label="Xóa sản phẩm">Xóa</button>
        </div>
      </li>
    `;
  });

  htmlGioHang += "</ul>";

  // hiển thị tổng tiền ở cuối giỏ
  htmlGioHang += `<h3>Tổng tiền: ${tongTien.toLocaleString("vi-VN")}đ</h3>`;

  // đưa toàn bộ html giỏ hàng vào div#gio-hang
  khungGioHang.innerHTML = htmlGioHang;
}

// gọi hàm này lần đầu tiên khi vừa tải trang để hiện chữ "giỏ hàng trống"
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
        // nếu chưa có tạo một đối tượng mới bằng spread operator() kèm theo soLuong: 1
        const sanPhamMoi = {
          ...sanPhamTimThay,
          soLuong: 1,
        };
        gioHang.push(sanPhamMoi);
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

  // Kiểm tra nếu giỏ hàng đang trống thì từ chối gửi
  if (gioHang.length === 0) {
    thongBaoP.textContent = "Giỏ hàng của bạn đang trống, vui lòng chọn sản phẩm!";
    return;
  }

  // Lấy giá trị từ các ô nhập trong form
  const ten = document.getElementById("ten").value.trim();
  const sdt = document.getElementById("sdt").value.trim();
  const diaChi = document.getElementById("diaChi").value.trim();

  // Tạo mảng giỏ hàng tinh gọn chỉ gửi id và soLuong (Bảo mật: Không gửi giá tiền)
  const gioHangTinhGọn = gioHang.map(function (item) {
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
        gioHang: gioHangTinhGọn,
      }),
    });

    const ketQua = await phanHoi.json();

    if (!phanHoi.ok) {
      // Nếu máy chủ trả về lỗi (400, 500,...)
      throw new Error(ketQua.loi || "Có lỗi xảy ra từ máy chủ.");
    }

    // 7. Thành công: Hiển thị thông báo, xóa giỏ hàng và reset form
    const tongTienFormatted = ketQua.tongTien.toLocaleString("vi-VN");
    thongBaoP.textContent = `Đặt hàng thành công! Mã đơn: ${ketQua.maDonHang}. Tổng tiền: ${tongTienFormatted}đ`;
    thongBaoP.style.color = "green";

    // Xóa giỏ hàng trên giao diện, localStorage và reset form nhập
    gioHang = [];
    hienThiGioHang();
    formDatHang.reset();

  } catch (loi) {
    // Hiển thị lỗi bằng textContent (phòng chống XSS)
    thongBaoP.textContent = loi.message;
    thongBaoP.style.color = "red";
    console.error(loi);
  } finally {
    // Bật lại nút bấm dù thành công hay thất bại
    btnDatHang.disabled = false;
    btnDatHang.textContent = "Xác nhận đặt hàng";
  }
});
