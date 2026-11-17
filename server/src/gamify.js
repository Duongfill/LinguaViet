// XP, bậc xếp hạng, bảng xếp hạng, mục tiêu & hành trình học
import express from 'express';
import { db } from './db.js';
import { requireAuth } from './auth.js';
import { LEVELS, RANK, validLevel, levelsBetween } from './levels.js';
import { toSqlTime } from './srs.js';

// ---------- XP ----------
// Điểm cho mỗi hoạt động trong bảng activity
export const XP_SQL = `CASE a.kind
  WHEN 'review' THEN CASE WHEN a.correct = 1 THEN 10 ELSE 4 END
  WHEN 'quiz'   THEN CASE WHEN a.correct = 1 THEN 10 ELSE 3 END
  WHEN 'hanzi'  THEN CASE WHEN a.correct = 1 THEN 15 ELSE 5 END
  WHEN 'speak'  THEN 5 + CAST(COALESCE(a.score, 0) / 10 AS INTEGER)
  ELSE 0 END`;

export const TIERS = [
  { key: 'tap-su', name: 'Tập sự', icon: '🌱', min: 0 },
  { key: 'dong', name: 'Đồng', icon: '🥉', min: 300 },
  { key: 'bac', name: 'Bạc', icon: '🥈', min: 1500 },
  { key: 'vang', name: 'Vàng', icon: '🥇', min: 5000 },
  { key: 'bach-kim', name: 'Bạch kim', icon: '💠', min: 12000 },
  { key: 'kim-cuong', name: 'Kim cương', icon: '💎', min: 25000 },
  { key: 'cao-thu', name: 'Cao thủ', icon: '🏆', min: 50000 },
  { key: 'huyen-thoai', name: 'Huyền thoại', icon: '👑', min: 100000 },
];

// Bậc + phân hạng III/II/I trong mỗi bậc (trừ bậc đầu và cuối)
export function tierOf(xp) {
  let i = TIERS.length - 1;
  while (i > 0 && xp < TIERS[i].min) i--;
  const t = TIERS[i];
  const next = TIERS[i + 1];
  let division = null;
  if (next && i > 0) {
    const step = (next.min - t.min) / 3;
    division = ['III', 'II', 'I'][Math.min(2, Math.floor((xp - t.min) / step))];
  }
  return {
    ...t, division,
    label: division ? `${t.name} ${division}` : t.name,
    next: next ? { name: next.name, icon: next.icon, min: next.min, remaining: next.min - xp } : null,
    progress: next ? Math.round(((xp - t.min) / (next.min - t.min)) * 100) : 100,
  };
}

const totalXp = (uid) => db.prepare(`SELECT COALESCE(SUM(${XP_SQL}), 0) AS xp FROM activity a WHERE a.user_id = ?`).get(uid).xp;

// Thời điểm bắt đầu tuần (thứ Hai 00:00 giờ máy chủ) dạng UTC cho SQL
function weekStartSql() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return toSqlTime(d);
}

// ---------- Chuỗi ngày học ----------
export function computeStreak(uid) {
  const days = db.prepare(`SELECT DISTINCT date(created_at, 'localtime') AS d FROM activity
    WHERE user_id = ? ORDER BY d DESC LIMIT 1000`).all(uid).map((r) => r.d);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const cursor = new Date();
  if (days[0] !== fmt(cursor)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (const d of days) {
    if (d === fmt(cursor)) { streak++; cursor.setDate(cursor.getDate() - 1); } else break;
  }
  return streak;
}

export const gamifyRouter = express.Router();
gamifyRouter.use(requireAuth);

// ---------- Bậc của tôi ----------
gamifyRouter.get('/rank', (req, res) => {
  const xp = totalXp(req.user.id);
  const weekXp = db.prepare(`SELECT COALESCE(SUM(${XP_SQL}), 0) AS xp FROM activity a WHERE a.user_id = ? AND a.created_at >= ?`)
    .get(req.user.id, weekStartSql()).xp;
  res.json({ xp, weekXp, tier: tierOf(xp), tiers: TIERS, streak: computeStreak(req.user.id) });
});

// ---------- Bảng xếp hạng ----------
gamifyRouter.get('/leaderboard', (req, res) => {
  const period = req.query.period === 'all' ? 'all' : 'week';
  const since = period === 'week' ? weekStartSql() : '0000';
  const rows = db.prepare(`
    SELECT u.id, u.name, u.show_on_leaderboard AS visible, SUM(${XP_SQL}) AS xp
    FROM activity a JOIN users u ON u.id = a.user_id
    WHERE a.created_at >= ?
    GROUP BY u.id HAVING xp > 0 ORDER BY xp DESC, MIN(a.created_at) ASC`).all(since);
  const allXp = new Map(db.prepare(`SELECT a.user_id AS id, SUM(${XP_SQL}) AS xp FROM activity a GROUP BY a.user_id`).all().map((r) => [r.id, r.xp]));

  const list = rows.map((r, i) => {
    const me = r.id === req.user.id;
    const tier = tierOf(allXp.get(r.id) || 0);
    return {
      position: i + 1, me, xp: r.xp,
      name: r.visible || me ? r.name : 'Người học ẩn danh',
      tier: { icon: tier.icon, label: tier.label },
    };
  });
  const mine = list.find((r) => r.me) || null;
  res.json({ period, top: list.slice(0, 50), me: mine, participants: list.length });
});

// ---------- Mục tiêu ----------
function getGoal(uid, lang) {
  const g = db.prepare('SELECT target_level, deadline, created_at FROM user_goals WHERE user_id = ? AND lang = ?').get(uid, lang);
  const start = db.prepare('SELECT level FROM user_levels WHERE user_id = ? AND lang = ?').get(uid, lang)?.level || LEVELS[lang][0];
  const target = g?.target_level && LEVELS[lang].indexOf(g.target_level) >= LEVELS[lang].indexOf(start) ? g.target_level : start;
  return { start, target, deadline: g?.deadline || null, isDefault: !g };
}

gamifyRouter.put('/goal', (req, res) => {
  const { lang, deadline } = req.body || {};
  const target = validLevel(lang, req.body?.target);
  if (!target) return res.status(400).json({ error: 'Đích không hợp lệ' });
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return res.status(400).json({ error: 'Hạn chót không hợp lệ' });
  db.prepare(`INSERT INTO user_goals (user_id, lang, target_level, deadline) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, lang) DO UPDATE SET target_level = excluded.target_level, deadline = excluded.deadline`)
    .run(req.user.id, lang, target, deadline || null);
  res.json({ goal: getGoal(req.user.id, lang) });
});

// ---------- Hành trình ----------
gamifyRouter.get('/journey', (req, res) => {
  const lang = req.query.lang;
  if (!LEVELS[lang]) return res.status(400).json({ error: 'lang phải là en, zh hoặc ja' });
  const uid = req.user.id;
  const goal = getGoal(uid, lang);
  const scope = levelsBetween(lang, goal.start, goal.target);
  const inScope = `d.owner_id IS NULL AND d.lang = ? AND d.level IN (${scope.map(() => '?').join(',')})`;

  // Số từ theo từng trình độ trong phạm vi (để đặt cột mốc "hoàn thành trình độ")
  const perLevel = db.prepare(`SELECT d.level, COUNT(c.id) AS total FROM cards c JOIN decks d ON d.id = c.deck_id
    WHERE ${inScope} GROUP BY d.level ORDER BY ${RANK('d.level')}`).all(lang, ...scope);
  const total = perLevel.reduce((s, l) => s + l.total, 0);

  // Các thời điểm "học được" từ mới, theo thứ tự
  const learnedTimes = db.prepare(`SELECT r.first_learned_at AS t FROM reviews r
    JOIN cards c ON c.id = r.card_id JOIN decks d ON d.id = c.deck_id
    WHERE r.user_id = ? AND r.first_learned_at IS NOT NULL AND ${inScope}
    ORDER BY r.first_learned_at`).all(uid, lang, ...scope).map((r) => r.t);
  const done = learnedTimes.length;
  const mastered = db.prepare(`SELECT COUNT(*) AS n FROM reviews r JOIN cards c ON c.id = r.card_id JOIN decks d ON d.id = c.deck_id
    WHERE r.user_id = ? AND r.repetitions >= 2 AND ${inScope}`).get(uid, lang, ...scope).n;

  // Số từ mới mỗi ngày (60 ngày gần nhất, theo giờ máy chủ)
  const daily = db.prepare(`SELECT date(r.first_learned_at, 'localtime') AS d, COUNT(*) AS n FROM reviews r
    JOIN cards c ON c.id = r.card_id JOIN decks d ON d.id = c.deck_id
    WHERE r.user_id = ? AND r.first_learned_at >= datetime('now', '-60 days') AND ${inScope}
    GROUP BY 1 ORDER BY 1`).all(uid, lang, ...scope);

  // Tốc độ: trung bình từ mới/ngày trong 14 ngày gần nhất
  const last14 = db.prepare(`SELECT COUNT(*) AS n FROM reviews r JOIN cards c ON c.id = r.card_id JOIN decks d ON d.id = c.deck_id
    WHERE r.user_id = ? AND r.first_learned_at >= datetime('now', '-14 days') AND ${inScope}`).get(uid, lang, ...scope).n;
  const pace = Math.round((last14 / 14) * 10) / 10;
  const remaining = Math.max(0, total - done);
  let eta = null;
  if (remaining === 0) eta = 'done';
  else if (pace > 0) { const d = new Date(); d.setDate(d.getDate() + Math.ceil(remaining / pace)); eta = d.toISOString().slice(0, 10); }
  let neededPerDay = null;
  if (goal.deadline && remaining > 0) {
    const daysLeft = Math.ceil((new Date(goal.deadline + 'T23:59:59') - new Date()) / 86400000);
    neededPerDay = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;
  }

  // Cột mốc: theo % và theo việc hoàn thành từng trình độ
  const ms = [];
  const reachedAt = (n) => (n > 0 && n <= done ? learnedTimes[n - 1] : null);
  const firstWords = [10, 50, 100].filter((n) => n < total * 0.1);
  for (const n of firstWords) ms.push({ words: n, title: `${n} từ đầu tiên`, icon: n === 10 ? '👣' : '🌟' });
  for (const p of [25, 50, 75]) ms.push({ words: Math.ceil((total * p) / 100), title: `${p}% chặng đường`, icon: p === 50 ? '⛰️' : '🚩' });
  let cum = 0;
  for (const l of perLevel.slice(0, -1)) {
    cum += l.total;
    ms.push({ words: cum, title: `Hoàn thành ${l.level.replace('HSK', 'HSK ')}`, icon: '🎓' });
  }
  ms.push({ words: total, title: `Về đích: ${goal.target.replace('HSK', 'HSK ')}`, icon: '🏁', final: true });
  const milestones = ms
    .filter((m, i, arr) => m.words > 0 && arr.findIndex((x) => Math.abs(x.words - m.words) < Math.max(5, total * 0.02)) === i || m.final)
    .sort((a, b) => a.words - b.words)
    .map((m) => ({ ...m, reached: done >= m.words, reachedAt: reachedAt(m.words) }));

  const daysStudied = db.prepare(`SELECT COUNT(DISTINCT date(created_at, 'localtime')) AS n FROM activity WHERE user_id = ? AND lang = ?`).get(uid, lang).n;

  res.json({
    goal, scope, perLevel, total, done, mastered, remaining,
    percent: total ? Math.round((done / total) * 1000) / 10 : 0,
    pace, eta, neededPerDay, daily, milestones, daysStudied, streak: computeStreak(uid),
  });
});
