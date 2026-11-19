const fs = require("fs");
const path = require("path");

const THU_MUC_SAO_LUU = path.join(__dirname, "sao-luu");
const SO_BAN_GIU_LAI = 7;

// Tạo chuỗi ngày theo múi giờ local dạng YYYY-MM-DD (tránh lệch ngày do UTC)
function layNgayHienTai() {
  const now = new Date();
  const nam = now.getFullYear();
  const thang = String(now.getMonth() + 1).padStart(2, "0");
  const ngay = String(now.getDate()).padStart(2, "0");
  return `${nam}-${thang}-${ngay}`;
}

function donDepBanSaoLuuCu() {
  if (!fs.existsSync(THU_MUC_SAO_LUU)) return;

  const danhSachFile = fs
    .readdirSync(THU_MUC_SAO_LUU)
    .filter(function (tenFile) {
      return /^cua-hang-\d{4}-\d{2}-\d{2}\.db$/.test(tenFile);
    })
    .sort(); // Sắp xếp tăng dần theo tên (YYYY-MM-DD sẽ đúng thứ tự thời gian)

  if (danhSachFile.length > SO_BAN_GIU_LAI) {
    const canXoa = danhSachFile.slice(0, danhSachFile.length - SO_BAN_GIU_LAI);
    for (const tenFile of canXoa) {
      fs.unlinkSync(path.join(THU_MUC_SAO_LUU, tenFile));
      console.log(`Đã xóa bản sao lưu cũ: ${tenFile}`);
    }
  }
}

async function saoLuu(db) {
  try {
    fs.mkdirSync(THU_MUC_SAO_LUU, { recursive: true });

    const tenFile = `cua-hang-${layNgayHienTai()}.db`;
    const duongDanDich = path.join(THU_MUC_SAO_LUU, tenFile);

    await db.backup(duongDanDich);
    console.log(`Đã sao lưu cơ sở dữ liệu thành công: sao-luu/${tenFile}`);

    donDepBanSaoLuuCu();
  } catch (loi) {
    console.error("Lỗi khi sao lưu cơ sở dữ liệu:", loi);
  }
}

module.exports = saoLuu;