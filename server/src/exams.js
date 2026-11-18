// Luyện đề TOEIC / IELTS: nạp đề từ data/exams/<id>/*.json, chấm bài, lưu lịch sử
// Đề là nội dung tự soạn theo dạng thức thật (xem tools/exams/EXAM-SPEC.md).
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { requireAuth } from './auth.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'exams');

db.exec(`
CREATE TABLE IF NOT EXISTS exam_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id      TEXT    NOT NULL,
  section      TEXT    NOT NULL,          -- listening | reading | writing | speaking
  parts        TEXT,                      -- vd "5,6" khi chỉ làm một số phần
  correct      INTEGER,
  total        INTEGER,
  score        REAL,                      -- điểm TOEIC ước lượng / band IELTS (chỉ khi làm đủ phần)
  detail       TEXT,                      -- JSON: câu trả lời; bài viết
  duration_sec INTEGER,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id, exam_id, created_at);
`);

// ---------- Nạp đề ----------
const TOEIC_PARTS = {
  listening: [
    { part: 2, file: 'p2', title: 'Part 2: Question–Response', start: 7 },
    { part: 3, file: 'p3', title: 'Part 3: Conversations', start: 32 },
    { part: 4, file: 'p4', title: 'Part 4: Talks', start: 71 },
  ],
  reading: [
    { part: 5, file: 'p5', title: 'Part 5: Incomplete Sentences', start: 101 },
    { part: 6, file: 'p6', title: 'Part 6: Text Completion', start: 131 },
    { part: 7, file: 'p7', title: 'Part 7: Reading Comprehension', start: 147 },
  ],
};
const IELTS_PARTS = {
  listening: [1, 2, 3, 4].map((n) => ({ part: n, file: `listening-${n}`, title: `Part ${n}` })),
  reading: [1, 2, 3].map((n) => ({ part: n, file: `reading-${n}`, title: `Passage ${n}` })),
};
// Thời gian làm bài (phút) khi làm đủ cả phần
const TIME = { toeic: { listening: 45, reading: 75 }, ielts: { listening: 30, reading: 60, writing: 60, speaking: 14 } };

const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

function buildExam(id) {
  const dir = path.join(DIR, id);
  const type = id.startsWith('toeic') ? 'toeic' : 'ielts';
  const PARTS = type === 'toeic' ? TOEIC_PARTS : IELTS_PARTS;
  const exam = { id, type, title: `${type === 'toeic' ? 'TOEIC' : 'IELTS'} – Đề ${Number(id.split('-')[1])}`, sections: {}, key: {} };
  for (const [section, parts] of Object.entries(PARTS)) {
    const list = [];
    let n = 1;
    for (const p of parts) {
      const data = readJson(path.join(dir, p.file + '.json'));
      if (!data) continue;
      if (type === 'toeic') n = p.start;
      const groups = type === 'toeic'
        ? (data.groups || []).map((g) => ({ kind: g.kind, passages: g.passages, audio: g.audio, blocks: [{ type: 'mcq', questions: g.questions || [] }] }))
        : [{ title: data.title, context: data.context, paragraphs: data.paragraphs, audio: data.audio, blocks: data.blocks || [] }];
      // Đánh số câu + tách đáp án ra khỏi đề gửi cho người làm
      for (const g of groups) {
        for (const b of g.blocks) {
          b.questions = b.questions.map((q) => {
            const qid = `${section[0]}${p.part}-${n}`; // IELTS: Listening và Reading đều có Part 1 → thêm chữ đầu tên phần
            exam.key[qid] = { answer: q.answer, explain: q.explain, type: b.type, section, part: p.part, num: n };
            const { answer, explain, ...pub } = q;
            return { ...pub, id: qid, num: n++ };
          });
        }
      }
      list.push({ part: p.part, title: p.title, groups });
    }
    if (list.length) exam.sections[section] = { parts: list, total: list.reduce((s, p) => s + p.groups.reduce((t, g) => t + g.blocks.reduce((u, b) => u + b.questions.length, 0), 0), 0), minutes: TIME[type][section] };
  }
  if (type === 'ielts') {
    const writing = readJson(path.join(dir, 'writing.json'));
    const speaking = readJson(path.join(dir, 'speaking.json'));
    if (writing) {
      exam.writingKey = writing;
      exam.sections.writing = { minutes: TIME.ielts.writing, tasks: {
        task1: { prompt: writing.task1?.prompt, chart: writing.task1?.chart, minWords: 150 },
        task2: { prompt: writing.task2?.prompt, minWords: 250 },
      } };
    }
    if (speaking) exam.sections.speaking = { minutes: TIME.ielts.speaking, data: speaking };
  } else {
    // TOEIC Writing: 8 câu (5 câu tả tranh, 2 email, 1 bài luận) — gửi đề không kèm bài mẫu
    const w = readJson(path.join(dir, 'writing.json'));
    if (w) {
      exam.toeicWritingKey = w;
      exam.sections.writing = { kind: 'toeic', minutes: 60, total: 8, items: {
        q1_5: (w.q1_5 || []).map((q) => ({ scene: q.scene, words: q.words })),
        q6_7: (w.q6_7 || []).map((q) => ({ email: q.email, task: q.task })),
        q8: { prompt: w.q8?.prompt },
      } };
    }
  }
  return exam;
}

let cache = null;
function exams() {
  if (cache) return cache;
  cache = new Map();
  if (fs.existsSync(DIR)) {
    for (const id of fs.readdirSync(DIR).filter((d) => /^(toeic|ielts)-\d+$/.test(d)).sort()) {
      const e = buildExam(id);
      if (Object.keys(e.sections).length) cache.set(id, e);
    }
  }
  return cache;
}

// ---------- Chấm điểm ----------
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
function isCorrect(k, given) {
  if (given == null || given === '') return false;
  if (k.type === 'gap') {
    const g = norm(given).replace(/^(a|an|the) /, '');
    return (k.answer || []).some((a) => { const n = norm(a); return n === norm(given) || n.replace(/^(a|an|the) /, '') === g; });
  }
  if (k.type === 'tfng' || k.type === 'ynng') return String(given).toUpperCase() === k.answer;
  return Number(given) === k.answer;
}
const round5 = (x) => Math.round(x / 5) * 5;
// Quy đổi ước lượng (không phải bảng chính thức)
function toeicScore(section, correct, total) {
  const pct = (correct / total) * 100;
  const raw = section === 'listening' ? pct * 5 + 10 : pct * 5 - 5;
  return Math.min(495, Math.max(5, round5(raw)));
}
const BAND = {
  listening: [[39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5]],
  reading: [[39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5]],
};
const ieltsBand = (section, correct) => (BAND[section].find(([min]) => correct >= min) || [0, 0])[1];

// ---------- API ----------
export const examsRouter = express.Router();
examsRouter.use(requireAuth);

examsRouter.get('/exams', (req, res) => {
  const best = db.prepare(`SELECT exam_id, section, MAX(score) AS best, COUNT(*) AS n,
      MAX(CASE WHEN parts IS NULL THEN correct * 1.0 / total END) AS best_pct
    FROM exam_attempts WHERE user_id = ? GROUP BY exam_id, section`).all(req.user.id);
  const list = [...exams().values()].map((e) => ({
    id: e.id, type: e.type, title: e.title,
    sections: Object.fromEntries(Object.entries(e.sections).map(([k, s]) => [k, {
      total: s.total || null, minutes: s.minutes,
      parts: s.parts?.map((p) => ({ part: p.part, title: p.title })),
      mine: best.find((b) => b.exam_id === e.id && b.section === k) || null,
    }])),
  }));
  res.json({ exams: list });
});

examsRouter.get('/exams/:id', (req, res) => {
  const e = exams().get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Không tìm thấy đề' });
  res.json({ exam: { id: e.id, type: e.type, title: e.title, sections: e.sections } });
});

examsRouter.get('/exams/:id/attempts', (req, res) => {
  res.json({ attempts: db.prepare(`SELECT id, section, parts, correct, total, score, duration_sec, created_at FROM exam_attempts
    WHERE user_id = ? AND exam_id = ? ORDER BY id DESC LIMIT 50`).all(req.user.id, req.params.id) });
});

// Nộp Listening / Reading: chấm và trả lời giải
examsRouter.post('/exams/:id/submit', (req, res) => {
  const e = exams().get(req.params.id);
  const { section, parts, answers = {}, durationSec } = req.body || {};
  const sec = e?.sections[section];
  if (!sec?.parts) return res.status(400).json({ error: 'Phần thi không hợp lệ' });
  const allParts = sec.parts.map((p) => p.part);
  const chosen = Array.isArray(parts) && parts.length ? allParts.filter((p) => parts.map(Number).includes(p)) : allParts;
  const full = chosen.length === allParts.length;
  const detail = [];
  for (const [qid, k] of Object.entries(e.key)) {
    if (k.section !== section || !chosen.includes(k.part)) continue;
    const given = answers[qid];
    detail.push({ id: qid, num: k.num, part: k.part, given: given ?? null, answer: k.answer, explain: k.explain, correct: isCorrect(k, given) });
  }
  const correct = detail.filter((d) => d.correct).length;
  const total = detail.length;
  let score = null;
  if (full) score = e.type === 'toeic' ? toeicScore(section, correct, total) : ieltsBand(section, correct);
  const info = db.prepare(`INSERT INTO exam_attempts (user_id, exam_id, section, parts, correct, total, score, detail, duration_sec)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(req.user.id, e.id, section, full ? null : chosen.join(','), correct, total, score,
    JSON.stringify(answers).slice(0, 20000), Number(durationSec) || null);
  res.json({ attemptId: info.lastInsertRowid, correct, total, score, full, detail });
});

// Writing: lưu bài + tự chấm, trả bài mẫu
examsRouter.post('/exams/:id/writing', (req, res) => {
  const e = exams().get(req.params.id);
  if (!e?.writingKey) return res.status(404).json({ error: 'Đề không có Writing' });
  const { task, text = '', selfBand, durationSec } = req.body || {};
  if (!['task1', 'task2'].includes(task)) return res.status(400).json({ error: 'task không hợp lệ' });
  const band = selfBand == null ? null : Math.min(9, Math.max(0, Number(selfBand)));
  const info = db.prepare(`INSERT INTO exam_attempts (user_id, exam_id, section, parts, correct, total, score, detail, duration_sec)
    VALUES (?, ?, 'writing', ?, NULL, NULL, ?, ?, ?)`).run(req.user.id, e.id, task, band, JSON.stringify({ text: String(text).slice(0, 8000) }), Number(durationSec) || null);
  const k = e.writingKey[task] || {};
  res.json({ attemptId: info.lastInsertRowid, sample: k.sample, sampleBand: k.sampleBand, notes_vi: k.notes_vi });
});

// TOEIC Writing: nộp cả 8 câu, nhận bài mẫu + mô tả tranh để tự chấm
examsRouter.post('/exams/:id/toeic-writing', (req, res) => {
  const e = exams().get(req.params.id);
  if (!e?.toeicWritingKey) return res.status(404).json({ error: 'Đề không có Writing' });
  const answers = req.body?.answers || {};
  const info = db.prepare(`INSERT INTO exam_attempts (user_id, exam_id, section, parts, total, detail, duration_sec)
    VALUES (?, ?, 'writing', NULL, 8, ?, ?)`).run(req.user.id, e.id, JSON.stringify(answers).slice(0, 20000), Number(req.body?.durationSec) || null);
  res.json({ attemptId: info.lastInsertRowid, key: e.toeicWritingKey });
});

// Lưu điểm tự chấm sau khi xem bài mẫu (Writing / Speaking): IELTS band 0–9, TOEIC Writing 0–200
examsRouter.patch('/exams/attempts/:aid', (req, res) => {
  const row = db.prepare(`SELECT exam_id FROM exam_attempts WHERE id = ? AND user_id = ? AND section IN ('writing', 'speaking')`)
    .get(Number(req.params.aid), req.user.id);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy bài làm' });
  const max = row.exam_id.startsWith('toeic') ? 200 : 9;
  const band = Math.min(max, Math.max(0, Number(req.body?.selfBand)));
  if (!Number.isFinite(band)) return res.status(400).json({ error: 'Điểm không hợp lệ' });
  const r = db.prepare('UPDATE exam_attempts SET score = ? WHERE id = ? AND user_id = ?').run(band, Number(req.params.aid), req.user.id);
  if (!r.changes) return res.status(404).json({ error: 'Không tìm thấy bài làm' });
  res.json({ ok: true });
});

// Speaking: ghi nhận đã luyện (tự đánh giá)
examsRouter.post('/exams/:id/speaking', (req, res) => {
  const e = exams().get(req.params.id);
  if (!e?.sections.speaking) return res.status(404).json({ error: 'Đề không có Speaking' });
  const band = req.body?.selfBand == null ? null : Math.min(9, Math.max(0, Number(req.body.selfBand)));
  db.prepare(`INSERT INTO exam_attempts (user_id, exam_id, section, parts, score) VALUES (?, ?, 'speaking', ?, ?)`)
    .run(req.user.id, e.id, String(req.body?.part || ''), band);
  res.json({ ok: true });
});
