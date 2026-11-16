import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { decks } from './data/vocab.js';

// Thêm/cập nhật bộ thẻ và thẻ (upsert theo slug và term) — không xoá tiến độ người dùng.
export function seed() {
  const upsertDeck = db.prepare(`
    INSERT INTO decks (lang, slug, title, description, level, sort_order)
    VALUES (@lang, @slug, @title, @description, @level, @sort_order)
    ON CONFLICT(slug) DO UPDATE SET title = excluded.title, description = excluded.description,
      level = excluded.level, sort_order = excluded.sort_order
    RETURNING id`);
  const upsertCard = db.prepare(`
    INSERT INTO cards (deck_id, term, phonetic, meaning_vi, example, example_vi)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(deck_id, term) DO UPDATE SET phonetic = excluded.phonetic, meaning_vi = excluded.meaning_vi,
      example = excluded.example, example_vi = excluded.example_vi`);

  let count = 0;
  db.transaction(() => {
    // Xoá các bộ sinh tự động (slug chứa "-g-") không còn trong dữ liệu hiện tại
    const keep = new Set(decks.map((d) => d.slug));
    for (const { id, slug } of db.prepare("SELECT id, slug FROM decks WHERE slug LIKE '%-g-%'").all()) {
      if (!keep.has(slug)) db.prepare('DELETE FROM decks WHERE id = ?').run(id);
    }
    for (const { cards, ...deck } of decks) {
      const { id } = upsertDeck.get(deck);
      for (const c of cards) { upsertCard.run(id, ...c); count++; }
    }
  })();
  return { decks: decks.length, cards: count };
}

export function seedIfEmpty() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM decks').get();
  if (n === 0) {
    const r = seed();
    console.log(`[seed] Đã nạp ${r.decks} bộ thẻ, ${r.cards} thẻ.`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = seed();
  console.log(`[seed] Đã cập nhật ${r.decks} bộ thẻ, ${r.cards} thẻ.`);
}
