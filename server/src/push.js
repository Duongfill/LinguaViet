// Web Push: đăng ký thiết bị, gửi thử, và lịch nhắc học hằng ngày
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';
import { db, DATA_DIR } from './db.js';
import { requireAuth } from './auth.js';
import { computeStreak } from './gamify.js';
import { toSqlTime } from './srs.js';

// ---------- Khoá VAPID: lấy từ biến môi trường hoặc tự tạo và lưu cạnh file DB (vapid.json) ----------
const VAPID_FILE = process.env.VAPID_FILE || path.join(DATA_DIR, 'vapid.json');
let vapid = process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  ? { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY }
  : null;
if (!vapid) {
  if (fs.existsSync(VAPID_FILE)) vapid = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf8'));
  else { vapid = webpush.generateVAPIDKeys(); fs.writeFileSync(VAPID_FILE, JSON.stringify(vapid, null, 2)); }
}
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', vapid.publicKey, vapid.privateKey);

// Ngày & giờ hiện tại theo múi giờ của người dùng
function localParts(tz, date = new Date()) {
  let parts;
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map((p) => [p.type, p.value]));
  } catch { return localParts('Asia/Ho_Chi_Minh', date); }
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

// Gửi thông báo tới mọi thiết bị của người dùng; xoá đăng ký đã hết hạn
export async function sendToUser(userId, payload) {
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: JSON.parse(s.keys) }, JSON.stringify(payload), { TTL: 6 * 3600 });
      sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(s.id);
      else console.error('[push] lỗi gửi:', e.statusCode || e.message);
    }
  }
  return sent;
}

function reminderPayload(userId) {
  const streak = computeStreak(userId);
  const due = db.prepare('SELECT COUNT(*) AS n FROM reviews WHERE user_id = ? AND due_at <= ?').get(userId, toSqlTime(new Date())).n;
  const parts = [];
  if (streak > 0) parts.push(`Giữ chuỗi 🔥 ${streak} ngày nhé!`);
  parts.push(due > 0 ? `${due} thẻ đang chờ bạn ôn.` : 'Học vài từ mới để tiến gần đích hơn.');
  return { title: '📚 Đến giờ học rồi!', body: parts.join(' '), url: due > 0 ? '/flashcards' : '/journey', tag: 'daily-reminder' };
}

// ---------- Lịch nhắc: mỗi phút kiểm tra người cần nhắc ----------
export function startReminderScheduler() {
  const tick = async () => {
    const users = db.prepare(`SELECT u.id, u.reminder_time, u.tz, u.last_reminded FROM users u
      WHERE u.reminder_enabled = 1 AND EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = u.id)`).all();
    for (const u of users) {
      const now = localParts(u.tz);
      if (now.time < u.reminder_time || u.last_reminded === now.date) continue;
      // Đã học hôm nay (theo múi giờ người dùng) thì không nhắc
      const last = db.prepare('SELECT MAX(created_at) AS t FROM activity WHERE user_id = ?').get(u.id).t;
      const studiedToday = last && localParts(u.tz, new Date(last.replace(' ', 'T') + 'Z')).date === now.date;
      db.prepare('UPDATE users SET last_reminded = ? WHERE id = ?').run(now.date, u.id);
      if (!studiedToday) await sendToUser(u.id, reminderPayload(u.id));
    }
  };
  setInterval(() => tick().catch((e) => console.error('[push] scheduler:', e)), 60 * 1000);
}

// ---------- API ----------
export const pushRouter = express.Router();
pushRouter.use(requireAuth);

pushRouter.get('/key', (_req, res) => res.json({ publicKey: vapid.publicKey }));

pushRouter.post('/subscribe', (req, res) => {
  const sub = req.body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return res.status(400).json({ error: 'Đăng ký không hợp lệ' });
  db.prepare(`INSERT INTO push_subscriptions (user_id, endpoint, keys) VALUES (?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, keys = excluded.keys`)
    .run(req.user.id, sub.endpoint, JSON.stringify(sub.keys));
  res.json({ ok: true });
});

pushRouter.post('/unsubscribe', (req, res) => {
  if (req.body?.endpoint) db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').run(req.body.endpoint, req.user.id);
  res.json({ ok: true });
});

pushRouter.post('/test', async (req, res) => {
  const sent = await sendToUser(req.user.id, { ...reminderPayload(req.user.id), title: '🔔 Thông báo thử', tag: 'test' });
  if (!sent) return res.status(400).json({ error: 'Chưa có thiết bị nào bật thông báo' });
  res.json({ sent });
});

// Cài đặt nhắc học: bật/tắt, giờ nhắc (HH:MM), múi giờ
pushRouter.put('/reminder', (req, res) => {
  const { enabled, time, tz } = req.body || {};
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return res.status(400).json({ error: 'Giờ nhắc không hợp lệ' });
  let zone = null;
  if (tz) { try { new Intl.DateTimeFormat('en', { timeZone: tz }); zone = tz; } catch { /* bỏ qua tz sai */ } }
  db.prepare(`UPDATE users SET reminder_enabled = COALESCE(?, reminder_enabled), reminder_time = COALESCE(?, reminder_time),
    tz = COALESCE(?, tz) WHERE id = ?`)
    .run(enabled == null ? null : (enabled ? 1 : 0), time || null, zone, req.user.id);
  // Nếu giờ nhắc hôm nay đã qua thì bắt đầu nhắc từ ngày mai (tránh bắn thông báo ngay khi vừa lưu)
  const u = db.prepare('SELECT reminder_time, tz FROM users WHERE id = ?').get(req.user.id);
  const now = localParts(u.tz);
  db.prepare('UPDATE users SET last_reminded = ? WHERE id = ?').run(now.time >= u.reminder_time ? now.date : null, req.user.id);
  const devices = db.prepare('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?').get(req.user.id).n;
  res.json({ ok: true, devices });
});
