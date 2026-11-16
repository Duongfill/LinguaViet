// Tạo danh sách từ cần bổ sung + chia lô cho agent dịch.
// Dùng: node build.mjs <dlDir> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [dl, out] = process.argv.slice(2);
const require = createRequire('H:/LangApp/server/package.json');
const Database = require('better-sqlite3');
const db = new Database('H:/LangApp/server/langapp.db', { readonly: true });
const existing = new Set(db.prepare("SELECT d.lang || ':' || c.term AS k FROM cards c JOIN decks d ON d.id = c.deck_id").all().map((r) => r.k.toLowerCase()));

// ---------- IPA ----------
const ipa = new Map();
for (const line of fs.readFileSync(path.join(dl, 'en_US.txt'), 'utf8').split('\n')) {
  const [w, p] = line.split('\t');
  if (w && p && !ipa.has(w)) ipa.set(w, p.split(',')[0].trim().replace(/ɹ/g, 'r'));
}
function ipaOf(term) {
  const t = term.toLowerCase();
  if (ipa.has(t)) return ipa.get(t);
  const parts = t.split(/[\s-]+/);
  if (parts.length > 1 && parts.every((p) => ipa.has(p))) return '/' + parts.map((p) => ipa.get(p).replace(/\//g, '')).join(' ') + '/';
  return '';
}

// ---------- English ----------
const parseCsv = (f) => fs.readFileSync(path.join(dl, f), 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(','));
const en = new Map(); // term -> {level, pos[]}
const LV = ['A1', 'A2', 'B1', 'B2', 'C1'];
for (const [head, pos, cefr] of [...parseCsv('cefrj.csv'), ...parseCsv('octanove.csv')]) {
  if (!LV.includes(cefr)) continue;
  const term = head.split('/')[0].trim();
  if (!term || /[^a-zA-Z' .-]/.test(term)) continue;
  const cur = en.get(term);
  if (!cur) en.set(term, { level: cefr, pos: [pos] });
  else { if (LV.indexOf(cefr) < LV.indexOf(cur.level)) cur.level = cefr; if (!cur.pos.includes(pos)) cur.pos.push(pos); }
}
const EN_TARGET = Number(process.env.EN_TARGET || 5000);
const enExisting = [...existing].filter((k) => k.startsWith('en:')).length;
let enItems = [];
for (const lv of LV) {
  for (const [term, v] of en) {
    if (v.level !== lv || existing.has('en:' + term.toLowerCase())) continue;
    enItems.push({ lang: 'en', level: lv, term, pos: v.pos.join('/'), phonetic: ipaOf(term) });
  }
}
enItems = enItems.slice(0, Math.max(0, EN_TARGET - enExisting));

// ---------- Chinese ----------
const zhItems = [];
const seenZh = new Set();
for (let i = 1; i <= 6; i++) {
  for (const w of JSON.parse(fs.readFileSync(path.join(dl, `hsk${i}.json`), 'utf8'))) {
    const term = w.simplified;
    if (seenZh.has(term) || existing.has('zh:' + term.toLowerCase())) continue;
    seenZh.add(term);
    const f = w.forms[0];
    zhItems.push({ lang: 'zh', level: `HSK${i}`, term, phonetic: f.transcriptions.pinyin, gloss_en: f.meanings.slice(0, 3).join(' | ') });
  }
}

// ---------- Lô 100 từ ----------
fs.mkdirSync(path.join(out, 'in'), { recursive: true });
const all = [...enItems, ...zhItems].map((x, i) => ({ id: i + 1, ...x }));
fs.writeFileSync(path.join(out, 'items.json'), JSON.stringify(all));
let b = 0;
for (const lang of ['en', 'zh']) {
  const list = all.filter((x) => x.lang === lang);
  for (let i = 0; i < list.length; i += 100) {
    b++;
    fs.writeFileSync(path.join(out, 'in', `${lang}-${String(b).padStart(3, '0')}.json`), JSON.stringify(list.slice(i, i + 100), null, 0));
  }
}
const count = (arr) => arr.reduce((m, x) => ((m[x.level] = (m[x.level] || 0) + 1), m), {});
console.log('existing en/zh:', enExisting, [...existing].length - enExisting);
console.log('new en', enItems.length, count(enItems), 'missing IPA', enItems.filter((x) => !x.phonetic).length);
console.log('new zh', zhItems.length, count(zhItems));
console.log('batches', b);
