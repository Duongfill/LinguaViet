// Luyện viết: đặt câu với từ đã học, viết theo chủ đề (Anh/Trung/Nhật), ngân hàng đề IELTS Writing, nhật ký bài viết
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { LANG_LIST, validLevel } from './levels.js';
import { visibleDeck } from './words.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'writing-bank');
const LANGS = new Set(LANG_LIST);

db.exec(`
CREATE TABLE IF NOT EXISTS writing_entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lang       TEXT    NOT NULL,
  kind       TEXT    NOT NULL,     -- sentences | prompt | ielts
  ref_id     TEXT,                 -- id đề (prompt / ielts)
  text       TEXT    NOT NULL,
  meta       TEXT,                 -- JSON: từ phải dùng, từ đã dùng…
  self_score REAL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_writing_user ON writing_entries(user_id, lang, created_at);
`);

const cache = new Map();
function bank(name) {
  if (!cache.has(name)) {
    let data = [];
    try { data = JSON.parse(fs.readFileSync(path.join(DIR, name + '.json'), 'utf8')); } catch { /* chưa có file */ }
    cache.set(name, data);
  }
  return cache.get(name);
}
const daily = (lang) => bank(`daily-${lang}`);
const ielts = () => [...bank('ielts-task1').map((x) => ({ ...x, task: 1 })), ...bank('ielts-task2').map((x) => ({ ...x, task: 2 }))];

export const writingRouter = express.Router();
writingRouter.use(requireAuth);

const insertEntry = (uid, lang, kind, refId, text, meta) => db.prepare(`INSERT INTO writing_entries (user_id, lang, kind, ref_id, text, meta)
  VALUES (?, ?, ?, ?, ?, ?)`).run(uid, lang, kind, refId, String(text).slice(0, 10000), meta ? JSON.stringify(meta) : null).lastInsertRowid;

// ---------- Viết theo chủ đề ----------
writingRouter.get('/writing/daily', (req, res) => {
  const { lang } = req.query;
  if (!LANGS.has(lang)) return res.status(400).json({ error: 'lang không hợp lệ' });
  const done = Object.fromEntries(db.prepare(`SELECT ref_id, COUNT(*) AS n FROM writing_entries
    WHERE user_id = ? AND lang = ? AND kind = 'prompt' GROUP BY ref_id`).all(req.user.id, lang).map((r) => [r.ref_id, r.n]));
  res.json({ prompts: daily(lang).map(({ sample, sample_vi, ...p }) => ({ ...p, done: done[p.id] || 0 })) });
});

writingRouter.post('/writing/daily/:id', (req, res) => {
  const lang = String(req.params.id).split('-')[0];
  const p = LANGS.has(lang) && daily(lang).find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Không tìm thấy đề' });
  const text = String(req.body?.text || '');
  if (!text.trim()) return res.status(400).json({ error: 'Bài viết trống' });
  const entryId = insertEntry(req.user.id, lang, 'prompt', p.id, text, { length: req.body?.length ?? null });
  res.json({ entryId, sample: p.sample, sample_vi: p.sample_vi });
});

// ---------- Đặt câu với từ đã học ----------
// Lấy n từ: ưu tiên từ đã học gần đây, thiếu thì lấy theo trình độ đang chọn
writingRouter.get('/writing/words', (req, res) => {
  const { lang } = req.query;
  if (!LANGS.has(lang)) return res.status(400).json({ error: 'lang không hợp lệ' });
  const n = Math.min(5, Math.max(1, Number(req.query.n) || 3));
  const learned = db.prepare(`SELECT c.id, c.term, c.phonetic, c.meaning_vi, c.example, c.example_vi FROM reviews r
    JOIN cards c ON c.id = r.card_id JOIN decks d ON d.id = c.deck_id
    WHERE r.user_id = ? AND d.lang = ? AND r.first_learned_at IS NOT NULL AND ${visibleDeck(req.user.id)}
    ORDER BY r.first_learned_at DESC LIMIT 60`).all(req.user.id, lang);
  const pick = learned.sort(() => Math.random() - 0.5).slice(0, n);
  if (pick.length < n) {
    const lv = db.prepare('SELECT level FROM user_levels WHERE user_id = ? AND lang = ?').get(req.user.id, lang)?.level;
    const level = validLevel(lang, lv);
    const more = db.prepare(`SELECT c.id, c.term, c.phonetic, c.meaning_vi, c.example, c.example_vi FROM cards c JOIN decks d ON d.id = c.deck_id
      WHERE d.lang = ? AND d.owner_id IS NULL AND (? IS NULL OR d.level = ?) ORDER BY random() LIMIT ?`).all(lang, level, level, n - pick.length);
    pick.push(...more.filter((m) => !pick.some((p) => p.id === m.id)));
  }
  res.json({ words: pick, fromLearned: Math.min(learned.length, n) });
});

// Kiểm tra từ có được dùng trong câu không (tiếng Anh nhận cả dạng chia: study → studied, studies…)
function used(term, text, lang) {
  const t = String(text).toLowerCase();
  const w = String(term).toLowerCase().replace(/^to /, '').replace(/[～〜]/g, '').trim();
  if (!w) return false;
  if (t.includes(w)) return true;
  if (lang === 'en') {
    const stem = w.length > 4 ? w.replace(/(e|y|ies|es|s)$/, '') : w;
    return stem.length >= 3 && new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(t);
  }
  if (lang === 'ja') { // động/tính từ chia: 食べる → 食べ…, 高い → 高…
    const base = w.replace(/[うくぐすつぬぶむるい]$/u, '');
    return base.length >= 1 && base !== w && t.includes(base);
  }
  return false;
}

writingRouter.post('/writing/sentences', (req, res) => {
  const { lang, cardIds = [], text = '' } = req.body || {};
  if (!LANGS.has(lang) || !String(text).trim()) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  const ids = cardIds.map(Number).filter(Boolean).slice(0, 5);
  const cards = ids.length ? db.prepare(`SELECT c.id, c.term FROM cards c JOIN decks d ON d.id = c.deck_id
    WHERE c.id IN (${ids.map(() => '?').join(',')}) AND ${visibleDeck(req.user.id)}`).all(...ids) : [];
  const usedIds = cards.filter((c) => used(c.term, text, lang)).map((c) => c.id);
  insertEntry(req.user.id, lang, 'sentences', null, text, { cards: cards.map((c) => c.term), used: usedIds.length });
  // Mỗi từ dùng đúng được tính như một lượt luyện (cộng XP, không vào "Từ hay quên")
  const log = db.prepare("INSERT INTO activity (user_id, kind, lang, card_id, correct, score) VALUES (?, 'quiz', ?, ?, 1, 100)");
  for (const id of usedIds) log.run(req.user.id, lang, id);
  res.json({ used: usedIds });
});

// ---------- Ngân hàng IELTS Writing ----------
writingRouter.get('/writing/ielts', (req, res) => {
  const best = Object.fromEntries(db.prepare(`SELECT ref_id, MAX(self_score) AS best, COUNT(*) AS n FROM writing_entries
    WHERE user_id = ? AND kind = 'ielts' GROUP BY ref_id`).all(req.user.id).map((r) => [r.ref_id, r]));
  res.json({ items: ielts().map((x) => ({ id: x.id, task: x.task, type: x.type, title: x.title, mine: best[x.id] || null })) });
});

writingRouter.get('/writing/ielts/:id', (req, res) => {
  const x = ielts().find((i) => i.id === req.params.id);
  if (!x) return res.status(404).json({ error: 'Không tìm thấy đề' });
  res.json({ item: { id: x.id, task: x.task, type: x.type, title: x.title, prompt: x.prompt, chart: x.chart || null } });
});

writingRouter.post('/writing/ielts/:id', (req, res) => {
  const x = ielts().find((i) => i.id === req.params.id);
  if (!x) return res.status(404).json({ error: 'Không tìm thấy đề' });
  const entryId = insertEntry(req.user.id, 'en', 'ielts', x.id, req.body?.text || '', { task: x.task, durationSec: req.body?.durationSec ?? null });
  res.json({ attemptId: entryId, sample: x.sample, sampleBand: x.sampleBand, notes_vi: x.notes_vi });
});

// Lưu điểm tự chấm
writingRouter.patch('/writing/entries/:eid', (req, res) => {
  const s = Number(req.body?.selfScore);
  if (!Number.isFinite(s) || s < 0 || s > 10) return res.status(400).json({ error: 'Điểm không hợp lệ' });
  const r = db.prepare('UPDATE writing_entries SET self_score = ? WHERE id = ? AND user_id = ?').run(s, Number(req.params.eid), req.user.id);
  if (!r.changes) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
  res.json({ ok: true });
});

// ---------- Nhật ký bài viết ----------
writingRouter.get('/writing/journal', (req, res) => {
  const { lang } = req.query;
  if (!LANGS.has(lang)) return res.status(400).json({ error: 'lang không hợp lệ' });
  const rows = db.prepare(`SELECT id, kind, ref_id, text, meta, self_score, created_at FROM writing_entries
    WHERE user_id = ? AND lang = ? ORDER BY id DESC LIMIT 100`).all(req.user.id, lang);
  const titles = Object.fromEntries([...daily(lang).map((p) => [p.id, p.topic_vi]), ...ielts().map((x) => [x.id, `IELTS Task ${x.task}: ${x.title}`])]);
  res.json({ entries: rows.map((r) => ({ ...r, meta: r.meta ? JSON.parse(r.meta) : null, title: titles[r.ref_id] || null })) });
});

writingRouter.delete('/writing/entries/:eid', (req, res) => {
  db.prepare('DELETE FROM writing_entries WHERE id = ? AND user_id = ?').run(Number(req.params.eid), req.user.id);
  res.json({ ok: true });
});
