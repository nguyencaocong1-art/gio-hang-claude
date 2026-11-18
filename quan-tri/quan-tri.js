const khungDonHang = document.getElementById("khung-don-hang");
const khungCanhBao = document.getElementById("canh-bao");
const btnLamMoi = document.getElementById("btn-lam-moi");
const selectLocTrangThai = document.getElementById("loc-trang-thai");

// Đối tượng ánh xạ an toàn: không dùng trực tiếp dữ liệu server làm className
const BAN_DO_TRANG_THAI = {
  moi: { chu: "Mới", lop: "tt-moi" },
  da_xac_nhan: { chu: "Đã xác nhận", lop: "tt-da-xac-nhan" },
  dang_giao: { chu: "Đang giao", lop: "tt-dang-giao" },
  da_giao: { chu: "Đã giao", lop: "tt-da-giao" },
  da_huy: { chu: "Đã hủy", lop: "tt-da-huy" },
};

const THU_TU_TRANG_THAI = [
  "moi",
  "da_xac_nhan",
  "dang_giao",
  "da_giao",
  "da_huy",
];
let danhSachDonGoc = [];

function capNhatTieuDeTab(danhSach) {
  const soDonMoi = danhSach.filter((don) => don.trang_thai === "moi").length;
  document.title =
    soDonMoi > 0 ? `(${soDonMoi}) Quản trị Đơn hàng` : "Quản trị Đơn hàng";
}

function hienThiDanhSachDon() {
  khungDonHang.replaceChildren();
  const boLoc = selectLocTrangThai ? selectLocTrangThai.value : "tat_ca";

  const danhSachHienThi =
    boLoc === "tat_ca"
      ? danhSachDonGoc
      : danhSachDonGoc.filter((don) => don.trang_thai === boLoc);

  if (danhSachHienThi.length === 0) {
    const pTrong = document.createElement("p");
    pTrong.textContent = "Không có đơn hàng nào phù hợp.";
    khungDonHang.appendChild(pTrong);
    return;
  }

  danhSachHienThi.forEach(function (don) {
    const theDon = document.createElement("div");
    theDon.className = "the-don-hang";

    // --- Header thẻ đơn hàng: Mã đơn + Nhãn trạng thái + Ô chọn đổi trạng thái ---
    const dauThe = document.createElement("div");
    dauThe.className = "dau-the-don";

    const nhomTrai = document.createElement("div");
    nhomTrai.className = "nhom-ma-trang-thai";

    const maDonSpan = document.createElement("strong");
    maDonSpan.className = "ma-don";
    maDonSpan.textContent = "DH" + String(don.id).padStart(6, "0");

    // Nhãn trạng thái (Badge)
    const thongTinTT = BAN_DO_TRANG_THAI[don.trang_thai] || {
      chu: "Không xác định",
      lop: "tt-moi",
    };
    const nhanTT = document.createElement("span");
    nhanTT.className = `nhan-trang-thai ${thongTinTT.lop}`;
    nhanTT.textContent = thongTinTT.chu;

    nhomTrai.appendChild(maDonSpan);
    nhomTrai.appendChild(nhanTT);

    // Nhóm phải: Ô <select> đổi trạng thái + Thời gian tạo
    const nhomPhai = document.createElement("div");
    nhomPhai.className = "nhom-dieu-khien-don";

    const selectTT = document.createElement("select");
    selectTT.className = "chon-trang-thai";
    selectTT.setAttribute("aria-label", "Đổi trạng thái đơn hàng");

    // Chỉ dựng danh sách gồm trạng thái hiện tại + các trạng thái máy chủ cho phép chuyển tiếp
    const buocTiepTheo = Array.isArray(don.chuyen_duoc_sang)
      ? don.chuyen_duoc_sang
      : [];
    const danhSachLuaChon = [don.trang_thai, ...buocTiepTheo];

    danhSachLuaChon.forEach(function (maTT) {
      if (!BAN_DO_TRANG_THAI[maTT]) return;
      const opt = document.createElement("option");
      opt.value = maTT;
      opt.textContent = BAN_DO_TRANG_THAI[maTT].chu;
      if (maTT === don.trang_thai) {
        opt.selected = true;
      }
      selectTT.appendChild(opt);
    });

    // Vô hiệu hóa ô chọn nếu đơn đã kết thúc (không còn bước tiếp theo)
    if (buocTiepTheo.length === 0) {
      selectTT.disabled = true;
    }

    let trangThaiCu = don.trang_thai;

    selectTT.addEventListener("change", async function () {
      const trangThaiMoi = selectTT.value;
      selectTT.disabled = true;

      try {
        const res = await fetch(`/api/quan-tri/don-hang/${don.id}/trang-thai`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trangThai: trangThaiMoi }),
        });

        const duLieu = await res.json();
        if (!res.ok) {
          throw new Error(duLieu.loi || "Không thể cập nhật trạng thái.");
        }

        // Thành công: tải lại danh sách để cập nhật badge, tiêu đề tab và các bước tiếp theo mới
        await taiDanhSachDonHang();
      } catch (loi) {
        await taiDanhSachDonHang();
        if (khungCanhBao) {
          khungCanhBao.textContent = loi.message;
        }
        selectTT.value = trangThaiCu;
        selectTT.disabled = buocTiepTheo.length === 0;
      }
    });

    const thoiGianSpan = document.createElement("span");
    thoiGianSpan.className = "thoi-gian";
    thoiGianSpan.textContent = `Thời gian: ${don.tao_luc}`;

    nhomPhai.appendChild(selectTT);
    nhomPhai.appendChild(thoiGianSpan);

    dauThe.appendChild(nhomTrai);
    dauThe.appendChild(nhomPhai);
    theDon.appendChild(dauThe);

    // --- Thông tin khách hàng (chống XSS tuyệt đối bằng textContent) ---
    const pKhach = document.createElement("p");
    pKhach.textContent = `Khách hàng: ${don.ten_khach}`;

    const pSdt = document.createElement("p");
    pSdt.append("Số điện thoại: ");
    const linkSdt = document.createElement("a");
    linkSdt.href = "tel:" + don.sdt;
    linkSdt.textContent = don.sdt;
    pSdt.appendChild(linkSdt);
    pSdt.textContent = `Số điện thoại: ${don.sdt}`;

    const pDiaChi = document.createElement("p");
    pDiaChi.textContent = `Địa chỉ: ${don.dia_chi}`;

    theDon.appendChild(pKhach);
    theDon.appendChild(pSdt);
    theDon.appendChild(pDiaChi);

    // --- Bảng chi tiết sản phẩm ---
    const bang = document.createElement("table");
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    ["Sản phẩm", "Số lượng", "Giá lúc mua", "Thành tiền"].forEach(
      function (tieuDeCot) {
        const th = document.createElement("th");
        th.textContent = tieuDeCot;
        trHead.appendChild(th);
      },
    );
    thead.appendChild(trHead);
    bang.appendChild(thead);

    const tbody = document.createElement("tbody");
    (don.chi_tiet || []).forEach(function (ct) {
      const tr = document.createElement("tr");

      const tdTen = document.createElement("td");
      tdTen.textContent = ct.ten_san_pham;

      const tdSl = document.createElement("td");
      tdSl.textContent = ct.so_luong;

      const tdGia = document.createElement("td");
      tdGia.textContent = ct.gia_luc_mua.toLocaleString("vi-VN") + "đ";

      const tdThanhTien = document.createElement("td");
      tdThanhTien.textContent =
        (ct.gia_luc_mua * ct.so_luong).toLocaleString("vi-VN") + "đ";

      tr.appendChild(tdTen);
      tr.appendChild(tdSl);
      tr.appendChild(tdGia);
      tr.appendChild(tdThanhTien);
      tbody.appendChild(tr);
    });
    bang.appendChild(tbody);
    const khungBang = document.createElement("div");
    khungBang.className = "khung-bang";
    khungBang.appendChild(bang);
    theDon.appendChild(khungBang);

    // --- Tổng tiền ---
    const pTong = document.createElement("p");
    pTong.className = "tong-tien";
    pTong.textContent = `Tổng tiền: ${don.tong_tien.toLocaleString("vi-VN")}đ`;
    theDon.appendChild(pTong);

    khungDonHang.appendChild(theDon);
  });
}

async function taiDanhSachDonHang() {
  try {
    const phanHoi = await fetch("/api/quan-tri/don-hang");
    if (!phanHoi.ok) {
      throw new Error("Không thể tải danh sách đơn hàng.");
    }
    danhSachDonGoc = await phanHoi.json();
    if (khungCanhBao) {
      khungCanhBao.textContent = "";
    }

    capNhatTieuDeTab(danhSachDonGoc);
    hienThiDanhSachDon();
  } catch (loi) {
    console.error(loi);
    if (khungCanhBao) {
      khungCanhBao.textContent =
        "Không tải được đơn hàng. Dữ liệu đang hiển thị có thể đã cũ.";
    }
    // Nếu lỗi xảy ra ngay lần tải đầu tiên (chưa có dữ liệu nào), xóa dòng "Đang tải dữ liệu..."
    if (danhSachDonGoc.length === 0) {
      khungDonHang.replaceChildren();
    }
  }
}

if (btnLamMoi) {
  btnLamMoi.addEventListener("click", taiDanhSachDonHang);
}

if (selectLocTrangThai) {
  selectLocTrangThai.addEventListener("change", hienThiDanhSachDon);
}

// Tải lần đầu và tự động làm mới mỗi 60 giây để không bỏ lỡ đơn mới
taiDanhSachDonHang();
setInterval(taiDanhSachDonHang, 60000);
