// Thuật toán SM-2 (SuperMemo 2) rút gọn.
// grade: 0 = quên hẳn, 3 = nhớ khó, 4 = nhớ, 5 = rất dễ
const FIRST_INTERVAL = { 3: 1, 4: 2, 5: 4 };

export function sm2(prev, grade) {
  let { ease = 2.5, interval = 0, repetitions = 0 } = prev || {};

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

  ease = ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const due = new Date();
  if (interval === 0) due.setMinutes(due.getMinutes() + 10);
  else due.setDate(due.getDate() + interval);

  return { ease, interval, repetitions, due_at: toSqlTime(due) };
}

export function toSqlTime(d) {
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
