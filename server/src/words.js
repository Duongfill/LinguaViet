// Tìm từ, bộ "Từ của tôi" (từ riêng của từng người) và sổ "Từ hay quên"
import express from 'express';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { LANG_LIST } from './levels.js';

const LANGS = new Set(LANG_LIST);

// Bộ từ người dùng được thấy: bộ chung (owner_id NULL) + bộ của chính họ.
// uid lấy từ JWT đã xác thực và ép kiểu số nên nhúng thẳng vào SQL an toàn.
export const visibleDeck = (uid, alias = 'd') => `(${alias}.owner_id IS NULL OR ${alias}.owner_id = ${Number(uid)})`;

// Chuẩn hoá để tìm không dấu: bỏ dấu tiếng Việt / dấu thanh pinyin, chữ thường, bỏ khoảng trắng & dấu câu
export const fold = (s) => (s == null ? null : String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[đĐ]/g, 'd').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).toLowerCase().replace(/[\s'’.,!?;:()\-]/g, ''));
db.function('fold', { deterministic: true }, fold);

// ---------- Từ hay quên ----------
// Một lượt "sai": Flashcard chọn Quên, Quiz/Ghép thẻ/Chính tả sai, viết chữ Hán sai, phát âm < 70 điểm.
// Từ nằm trong sổ khi lượt gần nhất là sai, hoặc số lượt sai >= một nửa số lượt (60 ngày gần đây).
// Bấm "Đã nhớ" sẽ ẩn từ cho tới khi sai lại.
export function weakCards(uid, lang, limit = 100) {
  return db.prepare(`
    WITH ev AS (
      SELECT a.id, a.card_id, a.created_at, a.kind,
        CASE WHEN a.kind = 'speak' THEN (COALESCE(a.score, 0) < 70) ELSE (a.correct = 0) END AS fail
      FROM activity a
      WHERE a.user_id = @uid AND a.lang = @lang AND a.card_id IS NOT NULL
        AND a.created_at >= datetime('now', '-60 days')
    ),
    agg AS (
      SELECT card_id, SUM(fail) AS fails, COUNT(*) AS attempts,
        MAX(CASE WHEN fail THEN created_at END) AS last_fail,
        GROUP_CONCAT(DISTINCT CASE WHEN fail THEN kind END) AS fail_kinds,
        (SELECT e2.fail FROM ev e2 WHERE e2.card_id = ev.card_id ORDER BY e2.created_at DESC, e2.id DESC LIMIT 1) AS last_failed
      FROM ev GROUP BY card_id
    )
    SELECT c.*, d.lang, d.level, d.title AS deck_title, agg.fails, agg.attempts, agg.last_fail, agg.fail_kinds, agg.last_failed,
      r.repetitions, r.interval, r.ease
    FROM agg
    JOIN cards c ON c.id = agg.card_id
    JOIN decks d ON d.id = c.deck_id AND ${visibleDeck(uid)}
    LEFT JOIN weak_dismissed w ON w.user_id = @uid AND w.card_id = c.id
    LEFT JOIN reviews r ON r.user_id = @uid AND r.card_id = c.id
    WHERE agg.fails > 0
      AND (w.dismissed_at IS NULL OR agg.last_fail > w.dismissed_at)
      AND (agg.last_failed = 1 OR agg.fails * 2 >= agg.attempts)
    ORDER BY agg.last_failed DESC, agg.fails DESC, agg.last_fail DESC
    LIMIT @limit`).all({ uid, lang, limit });
}

export const wordsRouter = express.Router();
wordsRouter.use(requireAuth);

wordsRouter.get('/weak', (req, res) => {
  const { lang } = req.query;
  if (!LANGS.has(lang)) return res.status(400).json({ error: 'lang phải là en, zh hoặc ja' });
  res.json({ cards: weakCards(req.user.id, lang, 200) });
});

wordsRouter.post('/weak/:cardId/dismiss', (req, res) => {
  const cardId = Number(req.params.cardId);
  if (!cardId) return res.status(400).json({ error: 'cardId không hợp lệ' });
  db.prepare(`INSERT INTO weak_dismissed (user_id, card_id, dismissed_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id, card_id) DO UPDATE SET dismissed_at = excluded.dismissed_at`).run(req.user.id, cardId);
  res.json({ ok: true });
});

// ---------- Tìm từ ----------
wordsRouter.get('/search', (req, res) => {
  const { lang } = req.query;
  if (!LANGS.has(lang)) return res.status(400).json({ error: 'lang phải là en, zh hoặc ja' });
  const q = fold(String(req.query.q || '').slice(0, 60));
  if (!q) return res.json({ cards: [] });
  const rows = db.prepare(`
    SELECT c.*, d.lang, d.level, d.title AS deck_title, d.owner_id IS NOT NULL AS mine, r.repetitions,
      CASE WHEN fold(c.term) = @q OR fold(c.phonetic) = @q THEN 0
           WHEN instr(fold(c.term), @q) = 1 OR instr(fold(c.phonetic), @q) = 1 THEN 1
           WHEN instr(fold(c.term), @q) > 0 OR instr(fold(c.phonetic), @q) > 0 THEN 2
           ELSE 3 END AS rank
    FROM cards c JOIN decks d ON d.id = c.deck_id
    LEFT JOIN reviews r ON r.user_id = @uid AND r.card_id = c.id
    WHERE d.lang = @lang AND ${visibleDeck(req.user.id)}
      AND (instr(fold(c.term), @q) > 0 OR instr(fold(c.phonetic), @q) > 0 OR instr(fold(c.meaning_vi), @q) > 0)
    ORDER BY rank, length(c.term), c.id
    LIMIT 40`).all({ q, lang, uid: req.user.id });
  res.json({ cards: rows });
});

// ---------- Từ của tôi ----------
const myDeckSlug = (uid, lang) => `my-${Number(uid)}-${lang}`;
const getMyDeck = (uid, lang) => db.prepare('SELECT * FROM decks WHERE slug = ? AND owner_id = ?').get(myDeckSlug(uid, lang), uid);
function ensureMyDeck(uid, lang) {
  let deck = getMyDeck(uid, lang);
  if (!deck) {
    db.prepare(`INSERT INTO decks (lang, slug, title, description, level, sort_order, owner_id)
      VALUES (?, ?, 'Từ của tôi', 'Từ bạn tự thêm', NULL, -1, ?)`).run(lang, myDeckSlug(uid, lang), uid);
    deck = getMyDeck(uid, lang);
  }
  return deck;
}
const clean = (v, max) => (v == null ? null : String(v).trim().slice(0, max) || null);

wordsRouter.get('/my-cards', (req, res) => {
  const { lang } = req.query;
  if (!LANGS.has(lang)) return res.status(400).json({ error: 'lang phải là en, zh hoặc ja' });
  const deck = getMyDeck(req.user.id, lang);
  const cards = deck ? db.prepare(`SELECT c.*, r.repetitions FROM cards c
    LEFT JOIN reviews r ON r.user_id = ? AND r.card_id = c.id
    WHERE c.deck_id = ? ORDER BY c.id DESC`).all(req.user.id, deck.id) : [];
  res.json({ deck: deck || null, cards });
});

// Thêm từ: tự nhập, hoặc chép từ kho chung (fromCardId)
wordsRouter.post('/my-cards', (req, res) => {
  const body = req.body || {};
  const uid = req.user.id;
  let data;
  if (body.fromCardId) {
    const src = db.prepare(`SELECT c.*, d.lang FROM cards c JOIN decks d ON d.id = c.deck_id
      WHERE c.id = ? AND ${visibleDeck(uid)}`).get(Number(body.fromCardId));
    if (!src) return res.status(404).json({ error: 'Không tìm thấy từ' });
    data = { lang: src.lang, term: src.term, phonetic: src.phonetic, meaning_vi: src.meaning_vi, example: src.example, example_vi: src.example_vi };
  } else {
    data = {
      lang: body.lang, term: clean(body.term, 80), phonetic: clean(body.phonetic, 80),
      meaning_vi: clean(body.meaning_vi, 200), example: clean(body.example, 300), example_vi: clean(body.example_vi, 300),
    };
  }
  if (!LANGS.has(data.lang)) return res.status(400).json({ error: 'lang phải là en, zh hoặc ja' });
  if (!data.term || !data.meaning_vi) return res.status(400).json({ error: 'Cần nhập từ và nghĩa tiếng Việt' });
  const deck = ensureMyDeck(uid, data.lang);
  if (db.prepare('SELECT 1 FROM cards WHERE deck_id = ? AND term = ?').get(deck.id, data.term)) {
    return res.status(409).json({ error: `"${data.term}" đã có trong Từ của tôi` });
  }
  const info = db.prepare(`INSERT INTO cards (deck_id, term, phonetic, meaning_vi, example, example_vi)
    VALUES (?, ?, ?, ?, ?, ?)`).run(deck.id, data.term, data.phonetic, data.meaning_vi, data.example, data.example_vi);
  res.json({ card: db.prepare('SELECT * FROM cards WHERE id = ?').get(info.lastInsertRowid) });
});

const ownCard = (uid, id) => db.prepare(`SELECT c.* FROM cards c JOIN decks d ON d.id = c.deck_id
  WHERE c.id = ? AND d.owner_id = ?`).get(Number(id), uid);

wordsRouter.delete('/my-cards/:id', (req, res) => {
  const card = ownCard(req.user.id, req.params.id);
  if (!card) return res.status(404).json({ error: 'Không tìm thấy từ của bạn' });
  db.prepare('DELETE FROM cards WHERE id = ?').run(card.id);
  res.json({ ok: true });
});
