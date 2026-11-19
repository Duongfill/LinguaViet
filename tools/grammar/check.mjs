// Kiểm tra file ngữ pháp theo tools/grammar/GRAMMAR-SPEC.md
// Dùng: node tools/grammar/check.mjs <file.json> [...]
import fs from 'node:fs';
import path from 'node:path';

const COUNT = { en: { A1: 14, A2: 14, B1: 14, B2: 12, C1: 8 }, zh: { HSK1: 10, HSK2: 10, HSK3: 12, HSK4: 12, HSK5: 10, HSK6: 8 }, ja: { N5: 18, N4: 16, N3: 16, N2: 14, N1: 12 } };
const str = (v) => typeof v === 'string' && v.trim().length > 0;
// So khớp câu ghép: bỏ dấu câu, khoảng trắng, hoa thường
const flat = (s) => String(s).toLowerCase().normalize('NFC').replace(/[\s\p{P}\p{S}]/gu, '');

let bad = 0;
for (const file of process.argv.slice(2)) {
  const errs = [];
  const err = (m) => errs.push(m);
  const level = path.basename(file, '.json');
  const lang = path.basename(path.dirname(file));
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log(`${lang}/${level}: JSON lỗi — ${e.message}`); bad++; continue; }
  const need = COUNT[lang]?.[level];
  if (!need) err(`tên file / thư mục không hợp lệ (${lang}/${level})`);
  if (!Array.isArray(data)) err('file phải là mảng');
  else if (data.length !== need) err(`cần ${need} điểm ngữ pháp (có ${data.length})`);
  const ids = new Set();
  (Array.isArray(data) ? data : []).forEach((p, pi) => {
    const w = p.id || `điểm ${pi + 1}`;
    if (!str(p.id) || !p.id.startsWith(`${lang}-${level.toLowerCase()}-`)) err(`${w}: id phải bắt đầu bằng ${lang}-${level.toLowerCase()}-`);
    if (ids.has(p.id)) err(`${w}: id trùng`); ids.add(p.id);
    if (p.level !== level) err(`${w}: level phải là ${level}`);
    for (const k of ['title', 'title_native', 'summary_vi', 'explain_vi']) if (!str(p[k])) err(`${w}: thiếu ${k}`);
    if ((p.explain_vi || '').split(/\s+/).length < 60) err(`${w}: explain_vi quá ngắn`);
    if (!Array.isArray(p.formula) || !p.formula.length || !p.formula.every(str)) err(`${w}: formula cần 1–4 dòng`);
    const ex = p.examples || [];
    if (ex.length < 4 || ex.length > 7) err(`${w}: cần 4–6 ví dụ (có ${ex.length})`);
    ex.forEach((e, i) => {
      if (!str(e.t) || !str(e.vi)) err(`${w} ví dụ ${i + 1}: thiếu t/vi`);
      if (lang === 'zh' && !str(e.py)) err(`${w} ví dụ ${i + 1}: thiếu py (pinyin)`);
      if (lang === 'ja' && !str(e.r)) err(`${w} ví dụ ${i + 1}: thiếu r (cách đọc)`);
    });
    if (!Array.isArray(p.mistakes) || !p.mistakes.length || !p.mistakes.every((m) => str(m.wrong) && str(m.right) && str(m.note_vi))) err(`${w}: mistakes cần 1–3 mục {wrong, right, note_vi}`);
    const xs = p.exercises || [];
    if (xs.length < 8 || xs.length > 10) err(`${w}: cần 8–10 bài tập (có ${xs.length})`);
    const cnt = (t) => xs.filter((x) => x.type === t).length;
    if (cnt('mcq') < 3 || cnt('gap') < 2 || cnt('order') < 2) err(`${w}: cần ≥3 mcq, ≥2 gap, ≥2 order`);
    xs.forEach((x, i) => {
      const wx = `${w} bài ${i + 1}`;
      if (!str(x.explain)) err(`${wx}: thiếu explain`);
      if (x.type === 'mcq') {
        if (!str(x.q) || !x.q.includes('___')) err(`${wx}: q cần có ___`);
        if (!Array.isArray(x.options) || x.options.length !== 4 || new Set(x.options).size !== 4) err(`${wx}: cần 4 options khác nhau`);
        if (!Number.isInteger(x.answer) || x.answer < 0 || x.answer > 3) err(`${wx}: answer phải là 0–3`);
      } else if (x.type === 'gap') {
        if (!str(x.q) || (x.q.match(/_{3,}/g) || []).length !== 1) err(`${wx}: q cần đúng một ___`);
        if (!Array.isArray(x.answer) || !x.answer.length || !x.answer.every(str)) err(`${wx}: answer phải là mảng chuỗi`);
      } else if (x.type === 'order') {
        if (!Array.isArray(x.words) || x.words.length < 3 || !x.words.every(str)) err(`${wx}: words cần ≥ 3 mảnh`);
        if (!str(x.answer) || !str(x.vi)) err(`${wx}: thiếu answer/vi`);
        // Các mảnh phải ghép được thành câu đúng (cùng tập ký tự)
        const a = [...flat(x.answer)].sort().join(''), b = [...flat((x.words || []).join(''))].sort().join('');
        if (a !== b) err(`${wx}: các mảnh không ghép ra đúng câu answer`);
        if (flat((x.words || []).join('')) === flat(x.answer)) err(`${wx}: words chưa được xáo trộn`);
      } else err(`${wx}: type phải là mcq/gap/order`);
    });
    const ans = xs.filter((x) => x.type === 'mcq').map((x) => x.answer);
    if (ans.length >= 4 && new Set(ans).size === 1) err(`${w}: đáp án mcq đều giống nhau`);
  });
  if (errs.length) { bad++; console.log(`${lang}/${level}: ${errs.length} lỗi\n  ` + errs.slice(0, 25).join('\n  ')); }
  else console.log(`${lang}/${level}: OK (${data.length} điểm, ${data.reduce((s, p) => s + p.exercises.length, 0)} bài tập)`);
}
process.exitCode = bad ? 1 : 0;
