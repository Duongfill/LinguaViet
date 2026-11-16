// Thứ tự & tên hiển thị các trình độ
export const LEVELS_BY_LANG = {
  en: ['A1', 'A2', 'B1', 'B2', 'C1'],
  zh: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'],
};
export const LEVEL_ORDER = [...LEVELS_BY_LANG.en, ...LEVELS_BY_LANG.zh];

const LABELS = {
  A1: 'A1 – Sơ cấp', A2: 'A2 – Sơ cấp', B1: 'B1 – Trung cấp', B2: 'B2 – Trung cao cấp', C1: 'C1 – Cao cấp',
  HSK1: 'HSK 1', HSK2: 'HSK 2', HSK3: 'HSK 3', HSK4: 'HSK 4', HSK5: 'HSK 5', HSK6: 'HSK 6',
};
export const levelLabel = (l) => LABELS[l] || l || 'Khác';
export const levelShort = (l) => (l || '').replace('HSK', 'HSK ');

// Mô tả giúp người học tự đánh giá
export const LEVEL_DESC = {
  A1: 'Mới bắt đầu: chào hỏi, giới thiệu bản thân, số đếm, câu rất đơn giản.',
  A2: 'Sơ cấp: giao tiếp hằng ngày (mua sắm, hỏi đường, gia đình, công việc đơn giản).',
  B1: 'Trung cấp: kể chuyện, nêu ý kiến, xử lý tình huống du lịch, công việc.',
  B2: 'Trung cao cấp: đọc báo, thảo luận chủ đề trừu tượng, nói khá trôi chảy.',
  C1: 'Cao cấp: hiểu văn bản dài, phức tạp; diễn đạt linh hoạt, chính xác.',
  HSK1: 'Mới bắt đầu: ~150 từ, chào hỏi, số đếm, câu rất đơn giản.',
  HSK2: '~300 từ: giao tiếp đơn giản về chủ đề quen thuộc hằng ngày.',
  HSK3: '~600 từ: sinh hoạt, học tập, công việc; đi du lịch Trung Quốc cơ bản.',
  HSK4: '~1.200 từ: thảo luận nhiều chủ đề, nói chuyện khá trôi chảy với người bản xứ.',
  HSK5: '~2.500 từ: đọc báo, xem phim, phát biểu dài.',
  HSK6: '~5.000 từ: hiểu và diễn đạt thành thạo bằng lời nói lẫn văn viết.',
};

// Trả về [[level, decks[]], ...] theo thứ tự trình độ
export function groupByLevel(decks) {
  const map = new Map();
  for (const d of decks) {
    if (!map.has(d.level)) map.set(d.level, []);
    map.get(d.level).push(d);
  }
  const rank = (l) => (LEVEL_ORDER.indexOf(l) + 1) || 99;
  return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
}

// Tham số truy vấn theo lựa chọn ở DeckPicker:
//  ''    -> trình độ của tôi;  'all' -> tất cả;  số -> một bộ cụ thể
// mode 'exact' (quiz, phát âm, chữ Hán) lấy đúng trình độ; 'min' (flashcard) lấy từ trình độ đó trở lên
export function deckQuery(deck, myLevel, mode = 'exact') {
  if (deck === 'all') return '';
  if (deck) return `&deck=${deck}`;
  if (!myLevel) return '';
  return mode === 'min' ? `&minLevel=${myLevel}` : `&level=${myLevel}`;
}
