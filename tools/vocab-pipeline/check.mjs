// Kiểm tra file out/<name>.jsonl. Dùng: node check.mjs <name> [<name>...]   (hoặc --all)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const TOPICS = new Set(['people', 'body_health', 'food', 'home', 'work', 'education', 'nature', 'travel', 'society', 'culture',
  'feelings', 'time_quantity', 'communication', 'technology', 'money', 'actions', 'qualities', 'abstract', 'function']);

let names = process.argv.slice(2);
if (names[0] === '--all') names = fs.readdirSync(path.join(dir, 'in')).map((f) => f.replace('.json', ''));
let bad = 0;
for (const name of names) {
  const errs = [];
  const input = JSON.parse(fs.readFileSync(path.join(dir, 'in', name + '.json'), 'utf8'));
  const file = path.join(dir, 'out', name + '.jsonl');
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
    if (o.topic && !TOPICS.has(o.topic)) errs.push(`id ${it.id}: topic "${o.topic}" không hợp lệ`);
    if (it.lang === 'zh' && o.example) {
      if (!o.example.includes(it.term)) errs.push(`id ${it.id} (${it.term}): câu ví dụ không chứa từ`);
      if (!/[\p{Script=Han}]/u.test(o.example)) errs.push(`id ${it.id}: ví dụ không phải chữ Hán`);
    }
    if (it.lang === 'en' && o.example) {
      const stem = it.term.toLowerCase().replace(/[^a-z]/g, '').slice(0, Math.min(4, it.term.length));
      if (stem && !o.example.toLowerCase().replace(/[^a-z]/g, '').includes(stem)) errs.push(`id ${it.id} (${it.term}): câu ví dụ có vẻ không chứa từ`);
    }
    if (!it.phonetic && !o.phonetic) errs.push(`id ${it.id} (${it.term}): cần bổ sung phonetic`);
  }
  const extra = [...rows.keys()].filter((id) => !input.some((x) => x.id === id));
  if (extra.length) errs.push(`id thừa: ${extra.join(',')}`);
  if (errs.length) { bad++; console.log(`${name}: ${errs.length} lỗi\n  ` + errs.slice(0, 30).join('\n  ')); }
  else if (names.length < 5) console.log(`${name}: OK`);
}
if (names.length >= 5) console.log(`${names.length - bad}/${names.length} file OK`);
process.exitCode = bad ? 1 : 0;
