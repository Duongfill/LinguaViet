import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { signToken, requireAuth } from './auth.js';
import { sm2, toSqlTime } from './srs.js';
import { seedIfEmpty } from './seed.js';
import { LANG_LIST, RANK, validLevel } from './levels.js';
import { computeStreak, gamifyRouter } from './gamify.js';
import { pushRouter, startReminderScheduler } from './push.js';
import { visibleDeck, weakCards, wordsRouter } from './words.js';

seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json());

const LANGS = new Set(LANG_LIST);
const getLevels = (uid) => {
  const out = Object.fromEntries(LANG_LIST.map((l) => [l, null]));
  for (const r of db.prepare('SELECT lang, level FROM user_levels WHERE user_id = ?').all(uid)) out[r.lang] = r.level;
  return out;
};
const wrap = (fn) => (req, res, next) => {
  try { fn(req, res, next); } catch (e) { next(e); }
};

// Health check cho nền tảng triển khai
app.get('/api/health', (_req, res) => {
  db.prepare('SELECT 1').get();
  res.json({ ok: true });
});

// ---------- Auth ----------
app.post('/api/auth/register', wrap((req, res) => {
  const { email, name, password } = req.body || {};
  if (!email || !name || !password) return res.status(400).json({ error: 'Vui lòng nhập đủ email, tên và mật khẩu' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Mật khẩu tối thiểu 6 ký tự' });
  const normEmail = String(email).trim().toLowerCase();
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(normEmail)) {
    return res.status(409).json({ error: 'Email đã được đăng ký' });
  }
  const hash = bcrypt.hashSync(String(password), 10);
  const info = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
    .run(normEmail, String(name).trim(), hash);
  const user = { id: info.lastInsertRowid, email: normEmail, name: String(name).trim(), daily_goal: 20, levels: Object.fromEntries(LANG_LIST.map((l) => [l, null])) };
  res.json({ token: signToken(user), user });
}));

app.post('/api/auth/login', wrap((req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
  }
  res.json({ token: signToken(user), user: { id: user.id, email: user.email, name: user.name, daily_goal: user.daily_goal, levels: getLevels(user.id) } });
}));

app.get('/api/me', requireAuth, wrap((req, res) => {
  const user = db.prepare(`SELECT id, email, name, daily_goal, reminder_enabled, reminder_time, tz, show_on_leaderboard
    FROM users WHERE id = ?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  res.json({ user: { ...user, levels: getLevels(user.id) } });
}));

// Chọn / đổi trình độ cho một ngôn ngữ
app.put('/api/me/level', requireAuth, wrap((req, res) => {
  const { lang } = req.body || {};
  const level = validLevel(lang, req.body?.level);
  if (!level) return res.status(400).json({ error: 'Trình độ không hợp lệ' });
  db.prepare(`INSERT INTO user_levels (user_id, lang, level) VALUES (?, ?, ?)
    ON CONFLICT(user_id, lang) DO UPDATE SET level = excluded.level`).run(req.user.id, lang, level);
  res.json({ levels: getLevels(req.user.id) });
}));

// Số từ mỗi trình độ (cho màn hình chọn trình độ)
app.get('/api/levels', requireAuth, wrap((req, res) => {
  const rows = db.prepare(`SELECT d.lang, d.level, COUNT(c.id) AS total FROM decks d
    JOIN cards c ON c.deck_id = d.id WHERE d.owner_id IS NULL GROUP BY d.lang, d.level`).all();
  res.json({ levels: rows });
}));

app.patch('/api/me', requireAuth, wrap((req, res) => {
  const { daily_goal, show_on_leaderboard } = req.body || {};
  if (daily_goal != null) {
    const goal = Number(daily_goal);
    if (!Number.isInteger(goal) || goal < 5 || goal > 200) return res.status(400).json({ error: 'Mục tiêu từ 5 đến 200 hoạt động/ngày' });
    db.prepare('UPDATE users SET daily_goal = ? WHERE id = ?').run(goal, req.user.id);
  }
  if (show_on_leaderboard != null) {
    db.prepare('UPDATE users SET show_on_leaderboard = ? WHERE id = ?').run(show_on_leaderboard ? 1 : 0, req.user.id);
  }
  res.json({ ok: true });
}));

app.use('/api', gamifyRouter);
app.use('/api', wordsRouter);
app.use('/api/push', pushRouter);

// ---------- Decks & cards ----------
app.get('/api/decks', requireAuth, wrap((req, res) => {
  const lang = req.query.lang;
  const rows = db.prepare(`
    SELECT d.*, d.owner_id IS NOT NULL AS mine, COUNT(c.id) AS card_count,
      SUM(CASE WHEN r.repetitions >= 2 THEN 1 ELSE 0 END) AS learned_count
    FROM decks d
    LEFT JOIN cards c ON c.deck_id = d.id
    LEFT JOIN reviews r ON r.card_id = c.id AND r.user_id = ?
    WHERE (? IS NULL OR d.lang = ?) AND ${visibleDeck(req.user.id)}
    GROUP BY d.id ORDER BY d.lang, d.sort_order`).all(req.user.id, lang ?? null, lang ?? null);
  res.json({ decks: rows });
}));

app.get('/api/decks/:id/cards', requireAuth, wrap((req, res) => {
  const deck = db.prepare(`SELECT * FROM decks d WHERE d.id = ? AND ${visibleDeck(req.user.id)}`).get(req.params.id);
  if (!deck) return res.status(404).json({ error: 'Không tìm thấy bộ thẻ' });
  const cards = db.prepare(`
    SELECT c.*, d.lang, r.repetitions, r.due_at, r.interval
    FROM cards c JOIN decks d ON d.id = c.deck_id
    LEFT JOIN reviews r ON r.card_id = c.id AND r.user_id = ?
    WHERE c.deck_id = ? ORDER BY c.id`).all(req.user.id, deck.id);
  res.json({ deck, cards });
}));

// Thẻ cho quiz / luyện viết / phát âm: lấy theo ngôn ngữ, tuỳ chọn theo bộ hoặc đúng một trình độ
app.get('/api/cards', requireAuth, wrap((req, res) => {
  const { lang, deck } = req.query;
  if (!LANGS.has(lang)) return res.status(400).json({ error: 'lang phải là en, zh hoặc ja' });
  if (req.query.weak) return res.json({ cards: weakCards(req.user.id, lang) });
  const level = validLevel(lang, req.query.level);
  const cards = db.prepare(`
    SELECT c.*, d.lang, d.level FROM cards c JOIN decks d ON d.id = c.deck_id
    WHERE d.lang = ? AND ${visibleDeck(req.user.id)} AND (? IS NULL OR d.id = ?) AND (? IS NULL OR d.level = ?)
    ORDER BY ${RANK('d.level')}, d.sort_order, c.id`).all(lang, deck ?? null, deck ?? null, level, level);
  res.json({ cards });
}));

// ---------- Ôn tập (SRS) ----------
app.get('/api/review/due', requireAuth, wrap((req, res) => {
  const { lang, deck } = req.query;
  if (!LANGS.has(lang)) return res.status(400).json({ error: 'lang phải là en, zh hoặc ja' });
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const now = toSqlTime(new Date());
  const deckId = deck ? Number(deck) : null;
  // Ôn "Từ hay quên": lấy thẳng danh sách đó, không cần đến hạn
  if (req.query.weak) return res.json({ cards: weakCards(req.user.id, lang, limit) });

  const due = db.prepare(`
    SELECT c.*, d.lang, r.repetitions, r.interval, r.ease FROM reviews r
    JOIN cards c ON c.id = r.card_id JOIN decks d ON d.id = c.deck_id
    WHERE r.user_id = ? AND d.lang = ? AND ${visibleDeck(req.user.id)} AND r.due_at <= ? AND (? IS NULL OR d.id = ?)
    ORDER BY r.due_at LIMIT ?`).all(req.user.id, lang, now, deckId, deckId, limit);

  // Thẻ mới: bắt đầu từ trình độ đã chọn (minLevel) trở lên, trình độ thấp trước
  const minLevel = validLevel(lang, req.query.minLevel);
  const newCards = db.prepare(`
    SELECT c.*, d.lang, d.level, NULL AS repetitions, NULL AS interval, NULL AS ease FROM cards c
    JOIN decks d ON d.id = c.deck_id
    LEFT JOIN reviews r ON r.card_id = c.id AND r.user_id = ?
    WHERE r.card_id IS NULL AND d.lang = ? AND ${visibleDeck(req.user.id)} AND (? IS NULL OR d.id = ?)
      AND (? IS NULL OR ${RANK('d.level')} >= ${RANK('?')})
    ORDER BY ${RANK('d.level')}, d.sort_order, c.id LIMIT ?`)
    .all(req.user.id, lang, deckId, deckId, minLevel, minLevel, Math.max(limit - due.length, 0));

  res.json({ cards: [...due, ...newCards.map((c) => ({ ...c, isNew: true }))] });
}));

app.post('/api/review', requireAuth, wrap((req, res) => {
  const cardId = Number(req.body?.cardId);
  const grade = Number(req.body?.grade);
  if (!cardId || ![0, 3, 4, 5].includes(grade)) return res.status(400).json({ error: 'cardId/grade không hợp lệ' });
  const card = db.prepare(`SELECT c.id, d.lang FROM cards c JOIN decks d ON d.id = c.deck_id WHERE c.id = ? AND ${visibleDeck(req.user.id)}`).get(cardId);
  if (!card) return res.status(404).json({ error: 'Không tìm thấy thẻ' });

  const prev = db.prepare('SELECT * FROM reviews WHERE user_id = ? AND card_id = ?').get(req.user.id, cardId);
  const next = sm2(prev, grade);
  db.prepare(`
    INSERT INTO reviews (user_id, card_id, ease, interval, repetitions, due_at, last_grade, updated_at, first_learned_at)
    VALUES (@user_id, @card_id, @ease, @interval, @repetitions, @due_at, @grade, datetime('now'),
      CASE WHEN @grade >= 3 THEN datetime('now') END)
    ON CONFLICT(user_id, card_id) DO UPDATE SET
      ease = excluded.ease, interval = excluded.interval, repetitions = excluded.repetitions,
      due_at = excluded.due_at, last_grade = excluded.last_grade, updated_at = excluded.updated_at,
      first_learned_at = COALESCE(reviews.first_learned_at, excluded.first_learned_at)`)
    .run({ user_id: req.user.id, card_id: cardId, grade, ...next });
  logActivity(req.user.id, 'review', card.lang, cardId, grade >= 3 ? 1 : 0, null);
  res.json({ review: next });
}));

// ---------- Ghi nhận quiz / viết chữ / phát âm ----------
app.post('/api/activity', requireAuth, wrap((req, res) => {
  const { kind, lang, cardId, correct, score } = req.body || {};
  if (!['quiz', 'hanzi', 'speak'].includes(kind) || !LANGS.has(lang)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  logActivity(req.user.id, kind, lang, cardId ? Number(cardId) : null,
    correct == null ? null : (correct ? 1 : 0), score == null ? null : Number(score));
  res.json({ ok: true });
}));

function logActivity(userId, kind, lang, cardId, correct, score) {
  db.prepare('INSERT INTO activity (user_id, kind, lang, card_id, correct, score) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, kind, lang, cardId, correct, score);
}

// ---------- Thống kê ----------
app.get('/api/stats', requireAuth, wrap((req, res) => {
  const uid = req.user.id;
  const now = toSqlTime(new Date());
  const perLang = {};
  for (const lang of LANGS) {
    const totals = db.prepare(`
      SELECT COUNT(c.id) AS total,
        SUM(CASE WHEN r.card_id IS NOT NULL THEN 1 ELSE 0 END) AS seen,
        SUM(CASE WHEN r.repetitions >= 2 THEN 1 ELSE 0 END) AS learned,
        SUM(CASE WHEN r.due_at <= ? THEN 1 ELSE 0 END) AS due
      FROM cards c JOIN decks d ON d.id = c.deck_id
      LEFT JOIN reviews r ON r.card_id = c.id AND r.user_id = ?
      WHERE d.lang = ? AND ${visibleDeck(uid)}`).get(now, uid, lang);
    const acc = db.prepare(`
      SELECT kind, COUNT(*) AS n, AVG(correct) * 100 AS accuracy, AVG(score) AS avg_score
      FROM activity WHERE user_id = ? AND lang = ? GROUP BY kind`).all(uid, lang);
    const byLevel = db.prepare(`
      SELECT d.level, COUNT(c.id) AS total,
        SUM(CASE WHEN r.repetitions >= 2 THEN 1 ELSE 0 END) AS learned,
        SUM(CASE WHEN r.card_id IS NOT NULL THEN 1 ELSE 0 END) AS seen
      FROM cards c JOIN decks d ON d.id = c.deck_id
      LEFT JOIN reviews r ON r.card_id = c.id AND r.user_id = ?
      WHERE d.lang = ? AND d.owner_id IS NULL GROUP BY d.level ORDER BY ${RANK('d.level')}`).all(uid, lang);
    perLang[lang] = { ...totals, byLevel, activity: Object.fromEntries(acc.map((a) => [a.kind, a])) };
  }

  const today = db.prepare(`SELECT COUNT(*) AS n FROM activity
    WHERE user_id = ? AND date(created_at, 'localtime') = date('now', 'localtime')`).get(uid).n;

  // Chuỗi ngày học liên tiếp (streak)
  const days = db.prepare(`SELECT DISTINCT date(created_at, 'localtime') AS d FROM activity
    WHERE user_id = ? ORDER BY d DESC LIMIT 400`).all(uid).map((r) => r.d);
  let streak = 0;
  const cursor = new Date();
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (days[0] !== fmt(cursor)) cursor.setDate(cursor.getDate() - 1); // chưa học hôm nay vẫn giữ streak từ hôm qua
  for (const d of days) {
    if (d === fmt(cursor)) { streak++; cursor.setDate(cursor.getDate() - 1); } else break;
  }

  const last7 = db.prepare(`SELECT date(created_at, 'localtime') AS d, COUNT(*) AS n FROM activity
    WHERE user_id = ? AND created_at >= datetime('now', '-7 days') GROUP BY d ORDER BY d`).all(uid);

  res.json({ perLang, today, streak, last7 });
}));

// ---------- Phục vụ client đã build (production) ----------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Lỗi máy chủ' });
});

// Dev: dùng API_PORT (không dùng PORT để không đụng cổng của Vite).
// Production: nhận thêm PORT do nền tảng cấp (Render, Railway, Fly…).
const PORT = Number(process.env.API_PORT)
  || (process.env.NODE_ENV === 'production' && Number(process.env.PORT))
  || 3101;
app.listen(PORT, () => console.log(`LangApp API chạy tại http://localhost:${PORT}`));
startReminderScheduler();
