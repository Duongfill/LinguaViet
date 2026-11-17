import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'langapp.db');
// Thư mục dữ liệu (DB + khoá thông báo) — khi triển khai chỉ cần giữ thư mục này
export const DATA_DIR = path.dirname(DB_PATH);

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  daily_goal    INTEGER NOT NULL DEFAULT 20,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS decks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  lang        TEXT NOT NULL CHECK (lang IN ('en','zh')),
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT,
  level       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  deck_id    INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  term       TEXT NOT NULL,          -- từ gốc (English word / 汉字)
  phonetic   TEXT,                   -- IPA hoặc pinyin
  meaning_vi TEXT NOT NULL,          -- nghĩa tiếng Việt
  example    TEXT,                   -- câu ví dụ
  example_vi TEXT,                   -- dịch câu ví dụ
  UNIQUE (deck_id, term)
);

-- Trạng thái ôn tập (SM-2) của từng người dùng với từng thẻ
CREATE TABLE IF NOT EXISTS reviews (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id     INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  ease        REAL    NOT NULL DEFAULT 2.5,
  interval    INTEGER NOT NULL DEFAULT 0,   -- ngày
  repetitions INTEGER NOT NULL DEFAULT 0,
  due_at      TEXT    NOT NULL,
  last_grade  INTEGER,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, card_id)
);

-- Nhật ký hoạt động: flashcard, quiz, viết chữ Hán, phát âm
CREATE TABLE IF NOT EXISTS activity (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL CHECK (kind IN ('review','quiz','hanzi','speak')),
  lang       TEXT    NOT NULL,
  card_id    INTEGER REFERENCES cards(id) ON DELETE SET NULL,
  correct    INTEGER,          -- 0/1
  score      REAL,             -- 0..100 cho phát âm / quiz
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trình độ người dùng tự chọn cho từng ngôn ngữ
CREATE TABLE IF NOT EXISTS user_levels (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lang    TEXT    NOT NULL CHECK (lang IN ('en','zh')),
  level   TEXT    NOT NULL,
  PRIMARY KEY (user_id, lang)
);

-- Mục tiêu (đích) của hành trình học cho từng ngôn ngữ
CREATE TABLE IF NOT EXISTS user_goals (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lang         TEXT    NOT NULL CHECK (lang IN ('en','zh')),
  target_level TEXT    NOT NULL,
  deadline     TEXT,             -- YYYY-MM-DD, tuỳ chọn
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, lang)
);

-- Đăng ký nhận Web Push của từng thiết bị
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT    NOT NULL UNIQUE,
  keys       TEXT    NOT NULL,   -- JSON {p256dh, auth}
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_due ON reviews(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id, created_at);
`);

// ---------- Migration: thêm cột cho DB cũ ----------
function addColumn(table, column, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  return !cols.includes(column);
}
// Thời điểm lần đầu trả lời đúng một thẻ (dùng cho hành trình / cột mốc)
if (addColumn('reviews', 'first_learned_at', 'TEXT')) {
  db.exec("UPDATE reviews SET first_learned_at = updated_at WHERE repetitions >= 1 AND first_learned_at IS NULL");
}
addColumn('users', 'reminder_enabled', 'INTEGER NOT NULL DEFAULT 0');
addColumn('users', 'reminder_time', "TEXT NOT NULL DEFAULT '20:00'");
addColumn('users', 'tz', "TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh'");
addColumn('users', 'last_reminded', 'TEXT');
addColumn('users', 'show_on_leaderboard', 'INTEGER NOT NULL DEFAULT 1');
db.exec('CREATE INDEX IF NOT EXISTS idx_reviews_learned ON reviews(user_id, first_learned_at)');

// Bộ từ riêng của người dùng ("Từ của tôi"): owner_id NULL = bộ chung
addColumn('decks', 'owner_id', 'INTEGER REFERENCES users(id) ON DELETE CASCADE');
db.exec(`
CREATE INDEX IF NOT EXISTS idx_decks_owner ON decks(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_card ON activity(user_id, lang, card_id, created_at);
-- Từ hay quên mà người dùng bấm "Đã nhớ": ẩn cho tới khi sai lại sau thời điểm này
CREATE TABLE IF NOT EXISTS weak_dismissed (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id      INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  dismissed_at TEXT    NOT NULL,
  PRIMARY KEY (user_id, card_id)
);
`);
