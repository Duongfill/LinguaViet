// Thuật toán SM-2 (SuperMemo 2) rút gọn.
// grade: 0 = quên hẳn, 3 = nhớ khó, 4 = nhớ, 5 = rất dễ
export function sm2(prev, grade) {
  let { ease = 2.5, interval = 0, repetitions = 0 } = prev || {};

  if (grade < 3) {
    repetitions = 0;
    interval = 0; // ôn lại ngay trong phiên (10 phút)
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 3;
    else interval = Math.round(interval * ease);
    if (grade === 5) interval = Math.round(interval * 1.3) || 1;
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
