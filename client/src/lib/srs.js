// Xem trước lịch ôn của SM-2 — phải khớp với server/src/srs.js (server mới là nơi tính thật)
export function sm2Preview(prev, grade) {
  let { ease, interval, repetitions } = prev || {};
  ease = ease ?? 2.5; interval = interval ?? 0; repetitions = repetitions ?? 0;
  if (grade < 3) {
    repetitions = 0;
    interval = 0;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.round(interval * ease);
    if (grade === 5) interval = Math.round(interval * 1.3) || 1;
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  return { ease, interval, repetitions };
}

// interval (ngày) → chữ ngắn: "10 phút", "1 ngày", "2 tuần", "3 tháng", "1,5 năm"
export function formatInterval(days) {
  if (!days) return '10 phút';
  if (days < 14) return `${days} ngày`;
  if (days < 60) return `${Math.round(days / 7)} tuần`;
  if (days < 365) return `${Math.round(days / 30)} tháng`;
  return `${(Math.round((days / 365) * 10) / 10).toString().replace('.', ',')} năm`;
}

// Số lần nhớ liên tiếp cần để một từ được tính là "đã thuộc" (khớp điều kiện repetitions >= 2 ở server)
export const LEARNED_REPS = 2;
