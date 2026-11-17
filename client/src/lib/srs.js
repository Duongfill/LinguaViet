// Xem trước lịch ôn của SM-2 — phải khớp với server/src/srs.js (server mới là nơi tính thật)
const FIRST_INTERVAL = { 3: 1, 4: 2, 5: 4 };

export function sm2Preview(prev, grade) {
  let { ease, interval, repetitions } = prev || {};
  ease = ease ?? 2.5; interval = interval ?? 0; repetitions = repetitions ?? 0;
  if (grade < 3) {
    repetitions = 0;
    interval = 0; // ôn lại ngay trong phiên (10 phút)
  } else {
    repetitions += 1;
    if (repetitions === 1) {
      // Thẻ mới: Khó 1 ngày, Nhớ 2 ngày, Dễ 4 ngày
      interval = FIRST_INTERVAL[grade];
    } else {
      // Khó tăng chậm, Nhớ nhân hệ số dễ, Dễ nhân thêm 1,3; luôn Khó < Nhớ < Dễ và luôn dài hơn lần trước
      const hard = Math.max(interval + 1, Math.round(interval * 1.2));
      const good = Math.max(hard + 1, Math.round(interval * ease));
      const easy = Math.max(good + 1, Math.round(interval * ease * 1.3));
      interval = grade === 3 ? hard : grade === 4 ? good : easy;
    }
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  return { ease, interval, repetitions };
}

// interval (ngày) → chữ ngắn: "10 phút", "13 ngày", "2,5 tháng", "1,2 năm"
// Dưới 45 ngày ghi rõ số ngày để các nút Khó/Nhớ/Dễ không bị làm tròn ra cùng một chữ
const oneDecimal = (x) => (Math.round(x * 10) / 10).toString().replace('.', ',');
export function formatInterval(days) {
  if (!days) return '10 phút';
  if (days < 45) return `${days} ngày`;
  if (days < 365) return `${oneDecimal(days / 30)} tháng`;
  return `${oneDecimal(days / 365)} năm`;
}

// Số lần nhớ liên tiếp cần để một từ được tính là "đã thuộc" (khớp điều kiện repetitions >= 2 ở server)
export const LEARNED_REPS = 2;
