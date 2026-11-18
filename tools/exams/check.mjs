// Kiểm tra file đề TOEIC / IELTS theo tools/exams/EXAM-SPEC.md
// Dùng: node tools/exams/check.mjs <thư mục đề> [tên file ...]   (không ghi tên file = kiểm tra mọi file có trong thư mục)
import fs from 'node:fs';
import path from 'node:path';

const [dir, ...only] = process.argv.slice(2);
if (!dir) { console.log('Dùng: node tools/exams/check.mjs <thư mục đề> [file ...]'); process.exit(1); }
const id = path.basename(dir);
const isToeic = id.startsWith('toeic');
const SPEAKERS = new Set(['M', 'W', 'M2', 'W2', 'N']);
const TOEIC_FILES = ['p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const IELTS_FILES = ['reading-1', 'reading-2', 'reading-3', 'listening-1', 'listening-2', 'listening-3', 'listening-4', 'writing', 'speaking'];
const expected = isToeic ? TOEIC_FILES : IELTS_FILES;
let files = only.length ? only.map((f) => f.replace(/\.json$/, '')) : expected.filter((f) => fs.existsSync(path.join(dir, f + '.json')));
const words = (s) => (String(s || '').match(/[A-Za-z0-9'’-]+/g) || []).length;
const str = (v) => typeof v === 'string' && v.trim().length > 0;

let bad = 0;
for (const name of files) {
  const errs = [];
  const err = (m) => errs.push(m);
  const file = path.join(dir, name + '.json');
  let data;
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { console.log(`${name}: KHÔNG ĐỌC ĐƯỢC JSON — ${e.message}`); bad++; continue; }

  const checkAudio = (audio, where, min, max) => {
    if (!Array.isArray(audio) || audio.length < min || audio.length > max) err(`${where}: audio cần ${min}–${max} dòng (có ${audio?.length ?? 0})`);
    (audio || []).forEach((l, i) => {
      if (!SPEAKERS.has(l.s)) err(`${where} audio[${i}]: s phải là M/W/M2/W2/N`);
      if (!str(l.t)) err(`${where} audio[${i}]: thiếu t`);
    });
  };
  const checkMcq = (q, where, n) => {
    if (!Array.isArray(q.options) || q.options.length !== n || !q.options.every(str)) err(`${where}: cần đúng ${n} options`);
    else if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== n) err(`${where}: options bị trùng`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= n) err(`${where}: answer phải là số 0–${n - 1}`);
    if (!str(q.explain)) err(`${where}: thiếu explain`);
  };

  if (isToeic) {
    const part = Number(name.slice(1));
    if (data.part !== part) err(`part phải là ${part}`);
    const groups = data.groups || [];
    const qs = groups.flatMap((g) => g.questions || []);
    const RULE = { 2: [25, 25], 3: [13, 39], 4: [10, 30], 5: [30, 30], 6: [4, 16], 7: [15, 54] };
    const [ng, nq] = RULE[part] || [0, 0];
    if (groups.length !== ng) err(`cần ${ng} nhóm (có ${groups.length})`);
    if (qs.length !== nq) err(`cần ${nq} câu (có ${qs.length})`);
    groups.forEach((g, gi) => {
      const w = `nhóm ${gi + 1}`;
      const gq = g.questions || [];
      if (part === 2) {
        checkAudio(g.audio, w, 1, 1);
        if (gq.length !== 1) err(`${w}: cần 1 câu`);
        gq.forEach((q) => checkMcq(q, w, 3));
      } else if (part === 3 || part === 4) {
        checkAudio(g.audio, w, part === 3 ? 6 : 5, part === 3 ? 14 : 12);
        if (part === 4 && new Set((g.audio || []).map((l) => l.s)).size !== 1) err(`${w}: Part 4 chỉ 1 người nói`);
        if (gq.length !== 3) err(`${w}: cần 3 câu`);
        gq.forEach((q, i) => { if (!str(q.q)) err(`${w} câu ${i + 1}: thiếu q`); checkMcq(q, `${w} câu ${i + 1}`, 4); });
      } else {
        if (part === 5) {
          if (gq.length !== 1) err(`${w}: cần 1 câu`);
          gq.forEach((q) => { if (!str(q.q) || (q.q.match(/_{4,}/g) || []).length !== 1) err(`${w}: q cần đúng một chỗ trống ______`); checkMcq(q, w, 4); });
        }
        if (part === 6) {
          const text = (g.passages || []).map((p) => p.text).join('\n');
          if ((g.passages || []).length !== 1) err(`${w}: Part 6 cần 1 passage`);
          [1, 2, 3, 4].forEach((k) => { if (!text.includes(`[${k}]`)) err(`${w}: văn bản thiếu chỗ trống [${k}]`); });
          if (gq.length !== 4) err(`${w}: cần 4 câu`);
          gq.forEach((q, i) => checkMcq(q, `${w} câu ${i + 1}`, 4));
          if (!gq.some((q) => (q.options || []).every((o) => words(o) >= 5))) err(`${w}: cần 1 câu chèn cả câu (4 options là câu hoàn chỉnh)`);
        }
        if (part === 7) {
          const np = (g.passages || []).length;
          if (np < 1 || np > 3) err(`${w}: cần 1–3 passages`);
          if (np === 1 && (gq.length < 2 || gq.length > 4)) err(`${w}: nhóm 1 văn bản cần 2–4 câu`);
          if (np > 1 && gq.length !== 5) err(`${w}: nhóm nhiều văn bản cần 5 câu`);
          (g.passages || []).forEach((p, pi) => {
            if (!str(p.text) || words(p.text) < 40) err(`${w} passage ${pi + 1}: văn bản quá ngắn`);
            if (!str(p.kind)) err(`${w} passage ${pi + 1}: thiếu kind`);
          });
          gq.forEach((q, i) => { if (!str(q.q)) err(`${w} câu ${i + 1}: thiếu q`); checkMcq(q, `${w} câu ${i + 1}`, 4); });
        }
      }
    });
    if (part === 7) {
      const kinds = groups.map((g) => (g.passages || []).length);
      if (kinds.filter((n) => n === 1).length !== 10 || kinds.filter((n) => n === 2).length !== 2 || kinds.filter((n) => n === 3).length !== 3) err('Part 7 cần 10 nhóm 1 văn bản, 2 nhóm 2 văn bản, 3 nhóm 3 văn bản');
    }
    // Đáp án không dồn về một chữ cái
    const ans = qs.map((q) => q.answer).filter(Number.isInteger);
    if (ans.length >= 12) {
      const top = Math.max(...[0, 1, 2, 3].map((k) => ans.filter((a) => a === k).length));
      if (top / ans.length > 0.45) err('đáp án đúng dồn quá nhiều vào một chữ cái');
    }
  } else if (name.startsWith('reading') || name.startsWith('listening')) {
    const reading = name.startsWith('reading');
    const need = reading ? { 'reading-1': 13, 'reading-2': 13, 'reading-3': 14 }[name] : 10;
    if (!str(data.title)) err('thiếu title');
    if (reading) {
      const paras = data.paragraphs || [];
      if (paras.length < 4) err('cần ít nhất 4 đoạn có nhãn');
      paras.forEach((p, i) => { if (!str(p.label) || !str(p.text)) err(`đoạn ${i + 1}: thiếu label/text`); });
      const total = paras.reduce((s, p) => s + words(p.text), 0);
      if (total < 650 || total > 1100) err(`bài đọc cần 700–950 từ (có ${total})`);
    } else {
      if (!str(data.context)) err('thiếu context');
      checkAudio(data.audio, 'listening', 20, 60);
    }
    const blocks = data.blocks || [];
    const TYPES = reading ? ['tfng', 'ynng', 'mcq', 'gap', 'headings', 'match'] : ['mcq', 'gap', 'match'];
    let count = 0;
    blocks.forEach((b, bi) => {
      const w = `khối ${bi + 1} (${b.type})`;
      if (!TYPES.includes(b.type)) err(`${w}: type phải là ${TYPES.join('/')}`);
      if (!str(b.instructions)) err(`${w}: thiếu instructions`);
      if (['headings', 'match'].includes(b.type) && (!Array.isArray(b.options) || b.options.length < 3)) err(`${w}: cần options dùng chung`);
      (b.questions || []).forEach((q, qi) => {
        count++;
        const wq = `${w} câu ${qi + 1}`;
        if (!str(q.q)) err(`${wq}: thiếu q`);
        if (!str(q.explain)) err(`${wq}: thiếu explain`);
        if (b.type === 'tfng' && !['TRUE', 'FALSE', 'NOT GIVEN'].includes(q.answer)) err(`${wq}: answer phải là TRUE/FALSE/NOT GIVEN`);
        if (b.type === 'ynng' && !['YES', 'NO', 'NOT GIVEN'].includes(q.answer)) err(`${wq}: answer phải là YES/NO/NOT GIVEN`);
        if (b.type === 'mcq') checkMcq(q, wq, (q.options || []).length >= 3 ? q.options.length : 4);
        if (b.type === 'gap') {
          if ((q.q.match(/_{4,}/g) || []).length !== 1) err(`${wq}: q cần đúng một chỗ trống ______`);
          if (!Array.isArray(q.answer) || !q.answer.length || !q.answer.every(str)) err(`${wq}: answer phải là mảng chuỗi`);
        }
        if (['headings', 'match'].includes(b.type) && (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (b.options || []).length)) err(`${wq}: answer phải là chỉ số trong options`);
      });
    });
    if (count !== need) err(`cần ${need} câu (có ${count})`);
  } else if (name === 'writing') {
    for (const t of ['task1', 'task2']) {
      const k = data[t] || {};
      if (!str(k.prompt)) err(`${t}: thiếu prompt`);
      if (!str(k.sample) || words(k.sample) < (t === 'task1' ? 150 : 250)) err(`${t}: bài mẫu quá ngắn (${words(k.sample)} từ)`);
      if (typeof k.sampleBand !== 'number') err(`${t}: thiếu sampleBand`);
      if (!str(k.notes_vi)) err(`${t}: thiếu notes_vi`);
    }
    const c = data.task1?.chart || {};
    if (!['bar', 'line', 'pie', 'table'].includes(c.type)) err('chart.type phải là bar/line/pie/table');
    if (!Array.isArray(c.categories) || c.categories.length < 2) err('chart.categories cần ≥ 2');
    if (!Array.isArray(c.series) || !c.series.length) err('chart.series trống');
    (c.series || []).forEach((s, i) => {
      if (!str(s.name)) err(`series ${i + 1}: thiếu name`);
      if (!Array.isArray(s.values) || s.values.length !== (c.categories || []).length || !s.values.every((v) => typeof v === 'number')) err(`series ${i + 1}: values phải là số, đủ theo categories`);
    });
  } else if (name === 'speaking') {
    const p1 = data.part1 || {}, p2 = data.part2 || {}, p3 = data.part3 || {};
    if (!str(p1.topic) || !(p1.questions || []).length) err('part1: thiếu topic/questions');
    if ((p1.questions || []).length !== (p1.samples || []).length) err('part1: số samples phải bằng số questions');
    if (!str(p2.cue) || !(p2.bullets || []).length || !str(p2.sample)) err('part2: thiếu cue/bullets/sample');
    if (!(p3.questions || []).length || (p3.questions || []).length !== (p3.samples || []).length) err('part3: questions/samples không khớp');
  } else {
    err('tên file không thuộc đặc tả');
  }

  if (errs.length) { bad++; console.log(`${name}: ${errs.length} lỗi\n  ` + errs.slice(0, 25).join('\n  ')); }
  else console.log(`${name}: OK`);
}
const missing = expected.filter((f) => !fs.existsSync(path.join(dir, f + '.json')));
if (!only.length && missing.length) console.log(`(chưa có: ${missing.join(', ')})`);
process.exitCode = bad ? 1 : 0;
