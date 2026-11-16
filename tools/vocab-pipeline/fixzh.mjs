// Chọn dạng (form) thông dụng nhất cho từ HSK thay vì forms[0] (có thể là họ / dị thể / viết tắt)
import fs from 'node:fs';
const dl = process.argv[2];
const BAD = /^(surname|old variant|variant|abbr\.?|used in|see |\(old\)|archaic|\(bound form\) surname)/i;
const best = new Map();
for (let i = 1; i <= 6; i++) for (const w of JSON.parse(fs.readFileSync(`${dl}/hsk${i}.json`, 'utf8'))) {
  if (best.has(w.simplified)) continue;
  const scored = w.forms.map((f, idx) => {
    const p = f.transcriptions.pinyin; const m = f.meanings || [];
    let s = idx * 0.1;
    if (/^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(p)) s += 5;
    const good = m.filter((x) => !BAD.test(x));
    if (!good.length) s += 4; else if (BAD.test(m[0] || '')) s += 1;
    s -= Math.min(good.length, 5) * 0.2;
    return { s, p, gloss: (good.length ? good : m).slice(0, 3).join(' | ') };
  }).sort((a, b) => a.s - b.s);
  best.set(w.simplified, scored[0]);
}
let changed = 0;
const patch = (arr) => arr.map((it) => {
  if (it.lang !== 'zh') return it;
  const b = best.get(it.term);
  if (b && (b.p !== it.phonetic || b.gloss !== it.gloss_en)) { changed++; return { ...it, phonetic: b.p, gloss_en: b.gloss }; }
  return it;
});
fs.writeFileSync('items.json', JSON.stringify(patch(JSON.parse(fs.readFileSync('items.json', 'utf8')))));
changed = 0;
for (const f of fs.readdirSync('in').filter((f) => f.startsWith('zh'))) fs.writeFileSync('in/' + f, JSON.stringify(patch(JSON.parse(fs.readFileSync('in/' + f, 'utf8')))));
console.log('zh items patched:', changed);
