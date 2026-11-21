// Học ngữ pháp: bài học theo trình độ (data/grammar/<lang>/<LEVEL>.json), tiến độ, ôn bài yếu
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { LEVELS } from './levels.js';
import { sm2, toSqlTime } from './srs.js';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'grammar');
const WEAK_BELOW = 70; // điểm lần làm gần nhất dưới mức này → cần ôn

db.exec(`
CREATE TABLE IF NOT EXISTS grammar_progress (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  point_id   TEXT    NOT NULL,
  lang       TEXT    NOT NULL,
  best       INTEGER NOT NULL DEFAULT 0,   -- % cao nhất
  last       INTEGER NOT NULL DEFAULT 0,   -- % lần gần nhất
  attempts   INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, point_id)
);
CREATE INDEX IF NOT EXISTS idx_grammar_user ON grammar_progress(user_id, lang);
-- Thẻ ôn ngữ pháp (SM-2), mỗi bài một thẻ
CREATE TABLE IF NOT EXISTS grammar_srs (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  point_id    TEXT    NOT NULL,
  lang        TEXT    NOT NULL,
  ease        REAL    NOT NULL DEFAULT 2.5,
  interval    INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  due_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, point_id)
);
CREATE INDEX IF NOT EXISTS idx_grammar_srs_due ON grammar_srs(user_id, lang, due_at);
`);

// Nạp toàn bộ bài học một lần (đọc lại khi khởi động server)
let cache = null;
function all() {
  if (cache) return cache;
  cache = { byLang: {}, byId: new Map() };
  for (const [lang, levels] of Object.entries(LEVELS)) {
    cache.byLang[lang] = [];
    for (const level of levels) {
      let points = [];
      try { points = JSON.parse(fs.readFileSync(path.join(DIR, lang, `${level}.json`), 'utf8')); } catch { /* chưa có file */ }
      if (!Array.isArray(points) || !points.length) continue;
      points.forEach((p, i) => cache.byId.set(p.id, { ...p, lang, order: i }));
      cache.byLang[lang].push({ level, points });
    }
    // Mẹo nhớ + dòng thời gian (data/grammar/tips-<lang>.json)
    let tips = {};
    try { tips = JSON.parse(fs.readFileSync(path.join(DIR, `tips-${lang}.json`), 'utf8')); } catch { /* chưa có */ }
    for (const { points } of cache.byLang[lang]) {
      for (const p of points) {
        const t = tips[p.id];
        if (!t) continue;
        const extra = { tip: t.tip || null, emoji: t.emoji || null, timeline: t.timeline || null };
        Object.assign(p, extra);
        Object.assign(cache.byId.get(p.id), extra);
      }
    }
  }
  return cache;
}

export const grammarRouter = express.Router();
grammarRouter.use(requireAuth);

grammarRouter.get('/grammar', (req, res) => {
  const { lang } = req.query;
  if (!LEVELS[lang]) return res.status(400).json({ error: 'lang không hợp lệ' });
  const mine = Object.fromEntries(db.prepare('SELECT point_id, best, last, attempts, updated_at FROM grammar_progress WHERE user_id = ? AND lang = ?')
    .all(req.user.id, lang).map((r) => [r.point_id, r]));
  const inSrs = new Set(db.prepare('SELECT point_id FROM grammar_srs WHERE user_id = ? AND lang = ?').all(req.user.id, lang).map((r) => r.point_id));
  const dueCount = db.prepare("SELECT COUNT(*) n FROM grammar_srs WHERE user_id = ? AND lang = ? AND due_at <= datetime('now')").get(req.user.id, lang).n;
  const levels = all().byLang[lang].map(({ level, points }) => ({
    level,
    points: points.map((p) => ({ id: p.id, title: p.title, title_native: p.title_native, summary_vi: p.summary_vi, exercises: p.exercises.length, emoji: p.emoji || null, srs: inSrs.has(p.id), mine: mine[p.id] || null })),
  }));
  res.json({ levels, weakBelow: WEAK_BELOW, dueCount, srsTotal: inSrs.size });
});

grammarRouter.get('/grammar/point/:id', (req, res) => {
  const p = all().byId.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Không tìm thấy bài học' });
  // Bài liền trước / liền sau trong cùng ngôn ngữ để đi tiếp
  const list = all().byLang[p.lang].flatMap((l) => l.points.map((x) => ({ id: x.id, title: x.title, level: x.level })));
  const i = list.findIndex((x) => x.id === p.id);
  const mine = db.prepare('SELECT best, last, attempts FROM grammar_progress WHERE user_id = ? AND point_id = ?').get(req.user.id, p.id) || null;
  const srs = db.prepare('SELECT 1 FROM grammar_srs WHERE user_id = ? AND point_id = ?').get(req.user.id, p.id);
  res.json({ point: p, prev: list[i - 1] || null, next: list[i + 1] || null, mine, srs: !!srs });
});

// Lưu kết quả một lượt làm bài tập; mỗi câu đúng tính một lượt luyện (cộng XP)
grammarRouter.post('/grammar/point/:id/result', (req, res) => {
  const p = all().byId.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Không tìm thấy bài học' });
  const total = p.exercises.length;
  const correct = Math.max(0, Math.min(total, Number(req.body?.correct) || 0));
  const pct = Math.round((correct / total) * 100);
  db.prepare(`INSERT INTO grammar_progress (user_id, point_id, lang, best, last, attempts, updated_at)
    VALUES (@uid, @pid, @lang, @pct, @pct, 1, datetime('now'))
    ON CONFLICT(user_id, point_id) DO UPDATE SET best = MAX(best, excluded.best), last = excluded.last,
      attempts = attempts + 1, updated_at = excluded.updated_at`).run({ uid: req.user.id, pid: p.id, lang: p.lang, pct });
  addToSrs(req.user.id, p);
  const log = db.prepare("INSERT INTO activity (user_id, kind, lang, card_id, correct, score) VALUES (?, 'quiz', ?, NULL, ?, ?)");
  db.transaction(() => {
    for (let i = 0; i < total; i++) log.run(req.user.id, p.lang, i < correct ? 1 : 0, i < correct ? 100 : 0);
  })();
  res.json({ pct, correct, total });
});

function addToSrs(uid, p) {
  db.prepare("INSERT OR IGNORE INTO grammar_srs (user_id, point_id, lang, due_at) VALUES (?, ?, ?, datetime('now'))").run(uid, p.id, p.lang);
}

grammarRouter.post('/grammar/review/add', (req, res) => {
  const p = all().byId.get(req.body?.point_id);
  if (!p) return res.status(404).json({ error: 'Không tìm thấy bài học' });
  addToSrs(req.user.id, p);
  res.json({ ok: true });
});

grammarRouter.delete('/grammar/review/:id', (req, res) => {
  db.prepare('DELETE FROM grammar_srs WHERE user_id = ? AND point_id = ?').run(req.user.id, req.params.id);
  res.json({ ok: true });
});

// Các thẻ đến hạn kèm nội dung bài để ghép câu hỏi ở client
grammarRouter.get('/grammar/review', (req, res) => {
  const { lang } = req.query;
  if (!LEVELS[lang]) return res.status(400).json({ error: 'lang không hợp lệ' });
  const rows = db.prepare(`SELECT point_id, ease, interval, repetitions FROM grammar_srs
    WHERE user_id = ? AND lang = ? AND due_at <= datetime('now') ORDER BY due_at LIMIT 30`).all(req.user.id, lang);
  const total = db.prepare('SELECT COUNT(*) n FROM grammar_srs WHERE user_id = ? AND lang = ?').get(req.user.id, lang).n;
  const cards = rows.map((r) => {
    const p = all().byId.get(r.point_id);
    if (!p) return null;
    return {
      state: { ease: r.ease, interval: r.interval, repetitions: r.repetitions },
      point: { id: p.id, level: p.level, title: p.title, title_native: p.title_native, summary_vi: p.summary_vi, formula: p.formula, tip: p.tip, emoji: p.emoji,
        timeline: p.timeline, examples: p.examples.slice(0, 3), mistakes: p.mistakes, exercises: p.exercises.filter((x) => x.type !== 'order') },
    };
  }).filter(Boolean);
  res.json({ cards, total });
});

grammarRouter.post('/grammar/review', (req, res) => {
  const { point_id: pid, grade } = req.body || {};
  const g = Number(grade);
  if (![0, 3, 4, 5].includes(g)) return res.status(400).json({ error: 'grade không hợp lệ' });
  const row = db.prepare('SELECT * FROM grammar_srs WHERE user_id = ? AND point_id = ?').get(req.user.id, pid);
  if (!row) return res.status(404).json({ error: 'Chưa có thẻ' });
  const n = sm2(row, g);
  db.prepare('UPDATE grammar_srs SET ease = ?, interval = ?, repetitions = ?, due_at = ? WHERE user_id = ? AND point_id = ?')
    .run(n.ease, n.interval, n.repetitions, n.due_at, req.user.id, pid);
  db.prepare("INSERT INTO activity (user_id, kind, lang, card_id, correct, score) VALUES (?, 'quiz', ?, NULL, ?, ?)").run(req.user.id, row.lang, g >= 4 ? 1 : 0, g >= 4 ? 100 : 0);
  res.json({ interval: n.interval, due_at: n.due_at });
});

// Bài cần ôn: lần làm gần nhất dưới mức đạt, lâu chưa ôn lên trước
grammarRouter.get('/grammar/weak', (req, res) => {
  const { lang } = req.query;
  if (!LEVELS[lang]) return res.status(400).json({ error: 'lang không hợp lệ' });
  const rows = db.prepare(`SELECT point_id, best, last, attempts, updated_at FROM grammar_progress
    WHERE user_id = ? AND lang = ? AND last < ? ORDER BY updated_at`).all(req.user.id, lang, WEAK_BELOW);
  res.json({ points: rows.map((r) => ({ ...r, ...(({ id, title, title_native, level }) => ({ id, title, title_native, level }))(all().byId.get(r.point_id) || {}) })).filter((x) => x.id) });
});
