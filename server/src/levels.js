// Trình độ và các tiện ích so sánh trình độ trong SQL
export const LEVELS = { en: ['A1', 'A2', 'B1', 'B2', 'C1'], zh: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'] };
const LEVEL_ORDER = '|' + [...LEVELS.en, ...LEVELS.zh].join('|') + '|';

// Biểu thức SQL trả về thứ hạng của một cột trình độ (dùng instr trên chuỗi thứ tự)
export const RANK = (col) => `instr('${LEVEL_ORDER}', '|' || ${col} || '|')`;
export const validLevel = (lang, level) => (LEVELS[lang]?.includes(level) ? level : null);

// Danh sách trình độ từ `from` tới `to` (bao gồm cả hai đầu)
export function levelsBetween(lang, from, to) {
  const L = LEVELS[lang];
  const a = Math.max(0, L.indexOf(from));
  const b = Math.max(a, L.indexOf(to));
  return L.slice(a, b + 1);
}
