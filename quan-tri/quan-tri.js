const khungDonHang = document.getElementById("khung-don-hang");
const btnLamMoi = document.getElementById("btn-lam-moi");

// Hàm tiện ích tạo nhanh phần tử kèm class và nội dung text an toàn
function taoPhanTu(the, className, noiDung) {
  const el = document.createElement(the);
  if (className) el.className = className;
  if (noiDung !== undefined) el.textContent = noiDung;
  return el;
}

async function taiDanhSachDonHang() {
  khungDonHang.textContent = "Đang tải dữ liệu...";

  try {
    const phanHoi = await fetch("/api/quan-tri/don-hang");
    if (!phanHoi.ok) {
      throw new Error(`Máy chủ trả về lỗi (${phanHoi.status})`);
    }

    const danhSachDon = await phanHoi.json();

    // Xóa sạch nội dung cũ trước khi render
    khungDonHang.replaceChildren();

    // Xử lý trường hợp chưa có đơn hàng nào
    if (danhSachDon.length === 0) {
      khungDonHang.appendChild(taoPhanTu("p", null, "Chưa có đơn hàng"));
      return;
    }

    // Dựng giao diện từng đơn hàng bằng createElement & textContent
    danhSachDon.forEach(function (don) {
      const theDon = taoPhanTu("div", "the-don-hang");

      // 1. Phần đầu thẻ: Mã đơn & Thời gian tạo
      const dauThe = taoPhanTu("div", "dau-the");
      const maDonStr = "DH" + String(don.id).padStart(6, "0");
      dauThe.appendChild(taoPhanTu("span", "ma-don", maDonStr));
      dauThe.appendChild(
        taoPhanTu("span", "thoi-gian", `Thời gian: ${don.tao_luc}`),
      );
      theDon.appendChild(dauThe);

      // 2. Thông tin khách hàng (dùng textContent nên tuyệt đối chống XSS)
      const khoiKhach = taoPhanTu("div", "thong-tin-khach");
      khoiKhach.appendChild(
        taoPhanTu("p", null, `Khách hàng: ${don.ten_khach}`),
      );
      khoiKhach.appendChild(taoPhanTu("p", null, `Số điện thoại: ${don.sdt}`));
      khoiKhach.appendChild(taoPhanTu("p", null, `Địa chỉ: ${don.dia_chi}`));
      theDon.appendChild(khoiKhach);

      // 3. Bảng chi tiết sản phẩm
      const bang = document.createElement("table");

      const thead = document.createElement("thead");
      const trHead = document.createElement("tr");
      ["Sản phẩm", "Số lượng", "Giá lúc mua", "Thành tiền"].forEach(
        function (tieuDe) {
          trHead.appendChild(taoPhanTu("th", null, tieuDe));
        },
      );
      thead.appendChild(trHead);
      bang.appendChild(thead);

      const tbody = document.createElement("tbody");
      don.chi_tiet.forEach(function (sp) {
        const tr = document.createElement("tr");
        const thanhTien = sp.gia_luc_mua * sp.so_luong;

        tr.appendChild(taoPhanTu("td", null, sp.ten_san_pham));
        tr.appendChild(taoPhanTu("td", null, String(sp.so_luong)));
        tr.appendChild(
          taoPhanTu("td", null, `${sp.gia_luc_mua.toLocaleString("vi-VN")}đ`),
        );
        tr.appendChild(
          taoPhanTu("td", null, `${thanhTien.toLocaleString("vi-VN")}đ`),
        );

        tbody.appendChild(tr);
      });
      bang.appendChild(tbody);
      theDon.appendChild(bang);

      // 4. Tổng tiền đơn hàng
      const dongTongTien = taoPhanTu(
        "div",
        "tong-tien",
        `Tổng tiền: ${don.tong_tien.toLocaleString("vi-VN")}đ`,
      );
      theDon.appendChild(dongTongTien);

      khungDonHang.appendChild(theDon);
    });
  } catch (loi) {
    khungDonHang.replaceChildren();
    khungDonHang.appendChild(
      taoPhanTu("p", "thong-bao-loi", `Lỗi tải dữ liệu: ${loi.message}`),
    );
    console.error(loi);
  }
}

btnLamMoi.addEventListener("click", taiDanhSachDonHang);

// Tải dữ liệu ngay khi mở trang
taiDanhSachDonHang();
