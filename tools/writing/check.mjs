// Kiểm tra dữ liệu luyện viết theo tools/writing/WRITING-SPEC.md
// Dùng: node tools/writing/check.mjs <file.json> [...]
import fs from 'node:fs';
import path from 'node:path';

const str = (v) => typeof v === 'string' && v.trim().length > 0;
const words = (s) => (String(s || '').match(/[A-Za-z0-9'’-]+/g) || []).length;
const cjk = (s) => (String(s || '').match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length;
const LEVELS = { en: ['A1', 'A2', 'B1', 'B2', 'C1'], zh: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'], ja: ['N5', 'N4', 'N3', 'N2', 'N1'] };

let bad = 0;
for (const file of process.argv.slice(2)) {
  const errs = [];
  const err = (m) => errs.push(m);
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log(`${file}: JSON lỗi — ${e.message}`); bad++; continue; }
  const name = path.basename(file, '.json');

  if (name === 'writing' && file.replace(/\\/g, '/').includes('/toeic-')) {
    const q = data.q1_5 || [];
    if (q.length !== 5) err(`q1_5 cần 5 câu (có ${q.length})`);
    q.forEach((x, i) => {
      const w = `q${i + 1}`;
      if (!str(x.scene) || [...x.scene].filter((c) => /\p{Extended_Pictographic}/u.test(c)).length < 2) err(`${w}: scene cần 2–5 emoji`);
      if (!str(x.alt)) err(`${w}: thiếu alt`);
      if (!Array.isArray(x.words) || x.words.length !== 2 || !x.words.every(str)) err(`${w}: words cần đúng 2 từ`);
      if (!Array.isArray(x.samples) || x.samples.length < 2) err(`${w}: cần 2 câu mẫu`);
      (x.samples || []).forEach((s, k) => {
        (x.words || []).forEach((wd) => {
          const stem = wd.toLowerCase().slice(0, Math.max(3, wd.length - 2));
          if (!s.toLowerCase().includes(stem)) err(`${w} mẫu ${k + 1}: không chứa từ "${wd}"`);
        });
      });
    });
    const e = data.q6_7 || [];
    if (e.length !== 2) err(`q6_7 cần 2 email (có ${e.length})`);
    e.forEach((x, i) => {
      const w = `q${i + 6}`;
      for (const k of ['from', 'to', 'subject', 'text']) if (!str(x.email?.[k])) err(`${w}: email thiếu ${k}`);
      if (words(x.email?.text) < 50) err(`${w}: email quá ngắn`);
      if (!str(x.task)) err(`${w}: thiếu task`);
      if (words(x.sample) < 80) err(`${w}: bài mẫu quá ngắn (${words(x.sample)} từ)`);
      if (!str(x.notes_vi)) err(`${w}: thiếu notes_vi`);
    });
    if (!str(data.q8?.prompt)) err('q8: thiếu prompt');
    if (words(data.q8?.sample) < 280) err(`q8: bài mẫu cần ≥ 300 từ (có ${words(data.q8?.sample)})`);
    if (!str(data.q8?.notes_vi)) err('q8: thiếu notes_vi');
  } else if (name === 'ielts-task1' || name === 'ielts-task2') {
    const t1 = name === 'ielts-task1';
    if (!Array.isArray(data) || data.length < 10) err('cần ít nhất 10 đề');
    const ids = new Set();
    (data || []).forEach((x, i) => {
      const w = x.id || `đề ${i + 1}`;
      if (!str(x.id) || ids.has(x.id)) err(`${w}: id thiếu hoặc trùng`); ids.add(x.id);
      for (const k of ['title', 'prompt', 'sample', 'notes_vi']) if (!str(x[k])) err(`${w}: thiếu ${k}`);
      if (typeof x.sampleBand !== 'number') err(`${w}: thiếu sampleBand`);
      if (words(x.sample) < (t1 ? 150 : 250)) err(`${w}: bài mẫu quá ngắn (${words(x.sample)} từ)`);
      if (t1) {
        const c = x.chart || {};
        if (!['bar', 'line', 'pie', 'table', 'process'].includes(c.type)) err(`${w}: chart.type không hợp lệ`);
        if (c.type === 'process') {
          if (!Array.isArray(c.steps) || c.steps.length < 5 || !c.steps.every((s) => str(s.label))) err(`${w}: process cần ≥ 5 bước có label`);
        } else {
          if (!Array.isArray(c.categories) || c.categories.length < 2) err(`${w}: categories cần ≥ 2`);
          if (!Array.isArray(c.series) || !c.series.length) err(`${w}: series trống`);
          (c.series || []).forEach((s, k) => {
            if (!Array.isArray(s.values) || s.values.length !== (c.categories || []).length || !s.values.every((v) => typeof v === 'number')) err(`${w} series ${k + 1}: values sai`);
          });
        }
      } else if (!['opinion', 'discussion', 'problem-solution', 'advantages-disadvantages', 'two-part'].includes(x.type)) err(`${w}: type không hợp lệ`);
    });
    if (t1) for (const t of ['bar', 'line', 'pie', 'table', 'process']) if (!(data || []).some((x) => x.chart?.type === t)) err(`thiếu dạng ${t}`);
  } else if (/^daily-(en|zh|ja)$/.test(name)) {
    const lang = name.slice(6);
    if (!Array.isArray(data) || data.length < 15) err('cần ít nhất 15 đề');
    const ids = new Set();
    (data || []).forEach((x, i) => {
      const w = x.id || `đề ${i + 1}`;
      if (!str(x.id) || ids.has(x.id)) err(`${w}: id thiếu hoặc trùng`); ids.add(x.id);
      if (!LEVELS[lang].includes(x.level)) err(`${w}: level phải thuộc ${LEVELS[lang].join('/')}`);
      for (const k of ['topic_vi', 'prompt', 'prompt_vi', 'sample', 'sample_vi']) if (!str(x[k])) err(`${w}: thiếu ${k}`);
      if (!Number.isInteger(x.min) || x.min < 20) err(`${w}: min phải là số nguyên ≥ 20`);
      if (!Array.isArray(x.useful) || x.useful.length < 4 || !x.useful.every((u) => str(u.term) && str(u.meaning_vi))) err(`${w}: useful cần 4–8 mục {term, meaning_vi}`);
      const len = lang === 'en' ? words(x.sample) : cjk(x.sample);
      if (len < x.min) err(`${w}: đoạn mẫu ngắn hơn min (${len} < ${x.min})`);
    });
    for (const lv of LEVELS[lang]) if ((data || []).filter((x) => x.level === lv).length < 3) err(`trình độ ${lv} cần ≥ 3 đề`);
  } else err('tên file không thuộc đặc tả');

  if (errs.length) { bad++; console.log(`${name}: ${errs.length} lỗi\n  ` + errs.slice(0, 25).join('\n  ')); }
  else console.log(`${name}: OK`);
}
process.exitCode = bad ? 1 : 0;
