// Ghép items.json + out/*.jsonl -> H:/LangApp/server/src/data/generated-<lang>.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const DEST = 'H:/LangApp/server/src/data';
const items = JSON.parse(fs.readFileSync(path.join(dir, 'items.json'), 'utf8'));
const res = new Map();
for (const f of fs.readdirSync(path.join(dir, 'out')).filter((f) => f.endsWith('.jsonl'))) {
  for (const line of fs.readFileSync(path.join(dir, 'out', f), 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { const o = JSON.parse(line); res.set(o.id, o); } catch { /* bỏ dòng lỗi */ }
  }
}

const TOPICS = {
  people: 'Con người & quan hệ', body_health: 'Cơ thể & sức khoẻ', food: 'Ăn uống', home: 'Nhà cửa & đồ dùng',
  work: 'Công việc & kinh tế', education: 'Giáo dục & khoa học', nature: 'Thiên nhiên & môi trường',
  travel: 'Du lịch & giao thông', society: 'Xã hội & pháp luật', culture: 'Văn hoá & giải trí',
  feelings: 'Cảm xúc & tính cách', time_quantity: 'Thời gian, số lượng & không gian', communication: 'Giao tiếp & ngôn ngữ',
  technology: 'Công nghệ & truyền thông', money: 'Mua sắm & tiền bạc', actions: 'Động từ thông dụng',
  qualities: 'Tính từ & trạng từ', abstract: 'Danh từ trừu tượng', function: 'Từ chức năng & ngữ pháp',
  mixed: 'Từ vựng tổng hợp',
};
const TOPIC_KEYS = Object.keys(TOPICS);
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];
const CHUNK = 50;

let missing = 0;
for (const lang of ['en', 'zh']) {
  const groups = new Map(); // level|topic -> cards
  for (const it of items.filter((x) => x.lang === lang)) {
    const o = res.get(it.id);
    if (!o || !o.meaning_vi || !o.example) { missing++; continue; }
    if (lang === 'en' && /^'/.test(it.term)) continue; // bỏ mảnh viết tắt như 're, 's
    const topic = TOPICS[o.topic] ? o.topic : 'abstract';
    const key = `${it.level}|${topic}`;
    if (!groups.has(key)) groups.set(key, []);
    let ph = o.phonetic || it.phonetic;
    if (lang === 'en') ph = ph.replace(/ɫ/g, 'l');
    // Pinyin: viết liền các âm tiết của một từ, thêm ' trước âm tiết bắt đầu bằng a/o/e
    if (lang === 'zh') ph = ph.replace(/u:/g, 'ü').replace(/U:/g, 'Ü');
    if (lang === 'zh' && [...it.term].length <= 3) {
      ph = ph.trim().split(/\s+/).map((s, i) => (i > 0 && /^[aāáǎàoōóǒòeēéěè]/i.test(s) ? "'" + s : s)).join('');
    }
    groups.get(key).push([it.term, ph,o.meaning_vi, o.example, o.example_vi]);
  }
  // Gộp các chủ đề quá nhỏ trong cùng trình độ vào bộ "tổng hợp"
  const MIN = 15;
  for (const [key, cards] of [...groups]) {
    const [level, topic] = key.split('|');
    if (topic === 'mixed' || cards.length >= MIN) continue;
    const mk = `${level}|mixed`;
    if (!groups.has(mk)) groups.set(mk, []);
    groups.get(mk).push(...cards);
    groups.delete(key);
  }
  const decks = [];
  for (const [key, cards] of [...groups].sort((a, b) => {
    const [la, ta] = a[0].split('|'); const [lb, tb] = b[0].split('|');
    return LEVELS.indexOf(la) - LEVELS.indexOf(lb) || TOPIC_KEYS.indexOf(ta) - TOPIC_KEYS.indexOf(tb);
  })) {
    const [level, topic] = key.split('|');
    // Chia đều thành các phần ≤ CHUNK thẻ
    const parts = Math.ceil(cards.length / CHUNK);
    const size = Math.ceil(cards.length / parts);
    for (let p = 0; p < parts; p++) {
      decks.push({
        lang, level,
        slug: `${lang}-g-${level.toLowerCase()}-${topic}-${p + 1}`,
        title: TOPICS[topic] + (parts > 1 ? ` (${p + 1})` : ''),
        description: `${cards.length} từ ${level.replace('HSK', 'HSK ')} chủ đề ${TOPICS[topic].toLowerCase()}`,
        sort_order: 100 + LEVELS.indexOf(level) * 100 + TOPIC_KEYS.indexOf(topic) * 3 + p,
        cards: cards.slice(p * size, (p + 1) * size),
      });
    }
  }
  fs.writeFileSync(path.join(DEST, `generated-${lang}.json`), JSON.stringify(decks));
  console.log(lang, decks.length, 'bộ,', decks.reduce((s, d) => s + d.cards.length, 0), 'thẻ');
}
console.log('chưa có kết quả:', missing);
