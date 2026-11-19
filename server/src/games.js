// Trò chơi luyện từ vựng: lưu điểm, kỷ lục cá nhân, bảng xếp hạng tuần theo từng game + ngôn ngữ
import express from 'express';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { LANG_LIST } from './levels.js';
import { visibleDeck } from './words.js';
import { weekStartSql } from './gamify.js';

export const GAMES = ['match', 'rain', 'truefalse', 'scramble'];
const LANGS = new Set(LANG_LIST);

db.exec(`
CREATE TABLE IF NOT EXISTS game_scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game       TEXT    NOT NULL,
  lang       TEXT    NOT NULL,
  score      INTEGER NOT NULL,
  correct    INTEGER,
  total      INTEGER,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_game_scores ON game_scores(game, lang, created_at);
CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_id, game, lang);
`);

export const gamesRouter = express.Router();
gamesRouter.use(requireAuth);

// Lưu một ván: điểm + kết quả từng từ (đúng → cộng XP; sai → vào "Từ hay quên")
gamesRouter.post('/games/:game/score', (req, res) => {
  const { game } = req.params;
  const { lang, score, correct, total, cards = [] } = req.body || {};
  if (!GAMES.includes(game) || !LANGS.has(lang)) return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  const s = Math.max(0, Math.min(1_000_000, Math.round(Number(score) || 0)));
  const prevBest = db.prepare('SELECT MAX(score) AS b FROM game_scores WHERE user_id = ? AND game = ? AND lang = ?').get(req.user.id, game, lang).b;
  db.prepare('INSERT INTO game_scores (user_id, game, lang, score, correct, total) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.user.id, game, lang, s, Number(correct) || null, Number(total) || null);
  // Chỉ ghi kết quả của thẻ người dùng được thấy; tối đa 60 lượt mỗi ván để không thổi phồng XP
  const ids = [...new Set(cards.map((c) => Number(c.id)).filter(Boolean))].slice(0, 60);
  if (ids.length) {
    const ok = new Set(db.prepare(`SELECT c.id FROM cards c JOIN decks d ON d.id = c.deck_id
      WHERE c.id IN (${ids.map(() => '?').join(',')}) AND d.lang = ? AND ${visibleDeck(req.user.id)}`).all(...ids, lang).map((r) => r.id));
    const log = db.prepare("INSERT INTO activity (user_id, kind, lang, card_id, correct, score) VALUES (?, 'quiz', ?, ?, ?, NULL)");
    db.transaction(() => {
      for (const c of cards.slice(0, 60)) if (ok.has(Number(c.id))) log.run(req.user.id, lang, Number(c.id), c.correct ? 1 : 0);
    })();
  }
  res.json({ score: s, best: Math.max(prevBest || 0, s), newBest: prevBest == null || s > prevBest });
});

// Kỷ lục của tôi (mọi game) + bảng xếp hạng tuần của một game
gamesRouter.get('/games/scores', (req, res) => {
  const { lang } = req.query;
  if (!LANGS.has(lang)) return res.status(400).json({ error: 'lang không hợp lệ' });
  const mine = Object.fromEntries(db.prepare(`SELECT game, MAX(score) AS best, COUNT(*) AS plays FROM game_scores
    WHERE user_id = ? AND lang = ? GROUP BY game`).all(req.user.id, lang).map((r) => [r.game, r]));
  const week = weekStartSql();
  const boards = {};
  for (const g of GAMES) {
    boards[g] = db.prepare(`SELECT u.id, u.name, MAX(s.score) AS best FROM game_scores s JOIN users u ON u.id = s.user_id
      WHERE s.game = ? AND s.lang = ? AND s.created_at >= ? AND (u.show_on_leaderboard = 1 OR u.id = ?)
      GROUP BY u.id ORDER BY best DESC LIMIT 10`).all(g, lang, week, req.user.id)
      .map((r, i) => ({ rank: i + 1, name: r.name, best: r.best, me: r.id === req.user.id }));
  }
  res.json({ mine, boards });
});
