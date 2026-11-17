// Pipeline từ vựng tiếng Nhật (JLPT N5–N1).
//   node ja.mjs build <dlDir> <workDir>          → items.json + in/ja-XXX.json (lô 100 từ)
//   node ja.mjs check <workDir> <name...|--all>  → kiểm tra out/<name>.jsonl
//   node ja.mjs assemble <workDir>               → server/src/data/generated-ja.json
// <dlDir> chứa n1.csv … n5.csv từ jamsinclair/open-anki-jlpt-decks (xem DATA_LICENSES.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEST = path.resolve(here, '../../server/src/data/generated-ja.json');
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
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
const JA = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const KANA_ONLY = /^[\p{Script=Hiragana}\p{Script=Katakana}ー～〜]+$/u;

// CSV có ngoặc kép
function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}
// "足; 脚" → "足";  "けっこん (する)" → "けっこん"
const firstForm = (s) => s.split(/[;；]/)[0].replace(/\s*[（(][^)）]*[)）]\s*/g, '').trim();

// Phần gốc để nhận ra từ trong câu ví dụ đã chia (会う → 会, 勉強する → 勉強, 高い → 高)
function stems(s) {
  const x = s.replace(/^[～〜]|[～〜]$/g, '');
  const out = new Set([x]);
  if (/(する|くる|来る)$/.test(x) && x.length > 2) out.add(x.replace(/(する|くる|来る)$/, ''));
  if (x.length >= 2 && /[うくぐすつぬぶむるい]$/u.test(x)) out.add(x.slice(0, -1));
  return [...out].filter(Boolean);
}

// Lỗi gõ trong danh sách nguồn (phát hiện khi soạn): cách viết sai → đúng
const TERM_FIX = { '楽む': '楽しむ', 'ラジオカセ': 'ラジオカセット', 'レクリェーション': 'レクリエーション', '傾らか': 'なだらか' };

// Chuẩn hoá cách viết + cách đọc cuối cùng của một từ
function cleanEntry(it, o) {
  let term = TERM_FIX[it.term] || it.term;
  let ph = it.phonetic || '';
  term = term.split(/[、,]/)[0].trim();                 // "回る、回す" → "回る"
  ph = ph.split(/[、,\s]/)[0].trim();                    // "まわる、まわす" / "こうよう もみじ" → dạng đầu
  if (/\p{Script=Han}/u.test(ph) && KANA_ONLY.test(term)) [term, ph] = [ph, term]; // "いただく | 頂く" bị đảo
  // Cách đọc agent sửa: nhận, trừ mẫu có "～" ở giữa (vd いくら～ても) — ở đó agent chỉ rút gọn để qua kiểm tra
  if (o.phonetic && !/.[～〜]./.test(term)) ph = o.phonetic;
  if (TERM_FIX[it.term] && KANA_ONLY.test(term)) ph = term;
  if (/.する$/.test(ph) && /\p{Script=Han}$/u.test(term)) ph = ph.replace(/する$/, ''); // "挨拶 | あいさつする" (từ kết thúc bằng chữ Hán)
  return [term, ph];
}

const cmd = process.argv[2];

if (cmd === 'build') {
  const [dl, work] = process.argv.slice(3);
  const seen = new Set();
  const items = [];
  for (const lv of LEVELS) {
    const rows = parseCsv(fs.readFileSync(path.join(dl, `${lv.toLowerCase()}.csv`), 'utf8')).slice(1).filter((r) => r[0]);
    for (const [expr, reading, meaning] of rows) {
      const term = firstForm(expr);
      let rd = firstForm(reading || '');
      if (!rd && KANA_ONLY.test(term)) rd = term;
      const key = `${term}|${rd}`;
      if (!term || seen.has(key)) continue; // trùng → giữ ở cấp dễ nhất (đi từ N5)
      seen.add(key);
      items.push({ lang: 'ja', level: lv, term, phonetic: rd, gloss_en: meaning.slice(0, 120) });
    }
  }
  items.forEach((x, i) => { x.id = i + 1; });
  fs.mkdirSync(path.join(work, 'in'), { recursive: true });
  fs.mkdirSync(path.join(work, 'out'), { recursive: true });
  fs.writeFileSync(path.join(work, 'items.json'), JSON.stringify(items));
  let b = 0;
  for (let i = 0; i < items.length; i += 100) {
    b++;
    fs.writeFileSync(path.join(work, 'in', `ja-${String(b).padStart(3, '0')}.json`), JSON.stringify(items.slice(i, i + 100)));
  }
  const count = items.reduce((m, x) => ((m[x.level] = (m[x.level] || 0) + 1), m), {});
  console.log('ja', items.length, count, 'lô', b, 'thiếu cách đọc', items.filter((x) => !x.phonetic).length);
}

if (cmd === 'check') {
  const work = process.argv[3];
  let names = process.argv.slice(4);
  if (names[0] === '--all') names = fs.readdirSync(path.join(work, 'in')).map((f) => f.replace('.json', ''));
  let bad = 0;
  for (const name of names) {
    const errs = [];
    const input = JSON.parse(fs.readFileSync(path.join(work, 'in', name + '.json'), 'utf8'));
    const file = path.join(work, 'out', name + '.jsonl');
    if (!fs.existsSync(file)) { console.log(`${name}: MISSING`); bad++; continue; }
    const rows = new Map();
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (!line.trim()) return;
      try { const o = JSON.parse(line); if (rows.has(o.id)) errs.push(`dòng ${i + 1}: id ${o.id} trùng`); rows.set(o.id, o); }
      catch { errs.push(`dòng ${i + 1}: JSON lỗi`); }
    });
    for (const it of input) {
      const o = rows.get(it.id);
      if (!o) { errs.push(`thiếu id ${it.id} (${it.term})`); continue; }
      for (const k of ['meaning_vi', 'example', 'example_vi', 'topic']) if (!o[k] || typeof o[k] !== 'string') errs.push(`id ${it.id} (${it.term}): thiếu ${k}`);
      if (o.topic && (!TOPICS[o.topic] || o.topic === 'mixed')) errs.push(`id ${it.id}: topic "${o.topic}" không hợp lệ`);
      if (o.meaning_vi && o.meaning_vi.length > 60) errs.push(`id ${it.id} (${it.term}): meaning_vi quá dài (${o.meaning_vi.length} ký tự)`);
      if (o.example) {
        if (!JA.test(o.example)) errs.push(`id ${it.id}: ví dụ không phải tiếng Nhật`);
        if (/[a-zA-Z]/.test(o.example)) errs.push(`id ${it.id}: ví dụ có chữ Latin`);
        const rd = o.phonetic || it.phonetic;
        const forms = [...stems(it.term), ...stems(rd || '')];
        if (!forms.some((f) => o.example.includes(f))) errs.push(`id ${it.id} (${it.term}): câu ví dụ không chứa từ (hoặc gốc của từ)`);
      }
      if (o.phonetic && !/^[\p{Script=Hiragana}\p{Script=Katakana}ー～〜]+$/u.test(o.phonetic)) errs.push(`id ${it.id}: phonetic phải là kana`);
      if (!it.phonetic && !o.phonetic) errs.push(`id ${it.id} (${it.term}): cần bổ sung phonetic (kana)`);
    }
    const extra = [...rows.keys()].filter((id) => !input.some((x) => x.id === id));
    if (extra.length) errs.push(`id thừa: ${extra.join(',')}`);
    if (errs.length) { bad++; console.log(`${name}: ${errs.length} lỗi\n  ` + errs.slice(0, 30).join('\n  ')); }
    else if (names.length < 5) console.log(`${name}: OK`);
  }
  if (names.length >= 5) console.log(`${names.length - bad}/${names.length} file OK`);
  process.exitCode = bad ? 1 : 0;
}

if (cmd === 'assemble') {
  const work = process.argv[3];
  const items = JSON.parse(fs.readFileSync(path.join(work, 'items.json'), 'utf8'));
  const res = new Map();
  for (const f of fs.readdirSync(path.join(work, 'out')).filter((f) => f.endsWith('.jsonl'))) {
    for (const line of fs.readFileSync(path.join(work, 'out', f), 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue;
      try { const o = JSON.parse(line); res.set(o.id, o); } catch { /* bỏ dòng lỗi */ }
    }
  }
  let missing = 0, dropped = 0;
  const groups = new Map(); // level|topic -> cards
  for (const it of items) {
    const o = res.get(it.id);
    if (!o || !o.meaning_vi || !o.example) { missing++; continue; }
    const topic = TOPICS[o.topic] ? o.topic : 'abstract';
    const key = `${it.level}|${topic}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push([...cleanEntry(it, o), o.meaning_vi, o.example, o.example_vi]);
  }
  const MIN = 15;
  for (const [key, cards] of [...groups]) {
    const [level, topic] = key.split('|');
    if (topic === 'mixed' || cards.length >= MIN) continue;
    const mk = `${level}|mixed`;
    if (!groups.has(mk)) groups.set(mk, []);
    groups.get(mk).push(...cards);
    groups.delete(key);
  }
  const CHUNK = 50;
  const decks = [];
  for (const [key, all] of [...groups].sort((a, b) => {
    const [la, ta] = a[0].split('|'); const [lb, tb] = b[0].split('|');
    return LEVELS.indexOf(la) - LEVELS.indexOf(lb) || TOPIC_KEYS.indexOf(ta) - TOPIC_KEYS.indexOf(tb);
  })) {
    const [level, topic] = key.split('|');
    const parts = Math.ceil(all.length / CHUNK);
    const size = Math.ceil(all.length / parts);
    // Mỗi bộ không được trùng "term" (khoá UNIQUE(deck_id, term)): chữ giống nhau khác cách đọc → sang phần khác
    const buckets = Array.from({ length: parts }, () => []);
    const terms = buckets.map(() => new Set());
    for (const c of all) {
      let i = buckets.findIndex((b, k) => b.length < size && !terms[k].has(c[0]));
      if (i < 0) i = buckets.findIndex((b, k) => !terms[k].has(c[0]));
      if (i < 0) { buckets.push([]); terms.push(new Set()); i = buckets.length - 1; dropped++; }
      buckets[i].push(c); terms[i].add(c[0]);
    }
    buckets.forEach((cards, p) => decks.push({
      lang: 'ja', level,
      slug: `ja-g-${level.toLowerCase()}-${topic}-${p + 1}`,
      title: TOPICS[topic] + (buckets.length > 1 ? ` (${p + 1})` : ''),
      description: `${all.length} từ ${level} chủ đề ${TOPICS[topic].toLowerCase()}`,
      sort_order: 100 + LEVELS.indexOf(level) * 100 + TOPIC_KEYS.indexOf(topic) * 3 + p,
      cards,
    }));
  }
  fs.writeFileSync(DEST, JSON.stringify(decks));
  console.log('ja', decks.length, 'bộ,', decks.reduce((s, d) => s + d.cards.length, 0), 'thẻ; chưa có kết quả:', missing, '; bộ thêm do chữ trùng:', dropped);
}
