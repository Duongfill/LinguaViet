import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import VoiceSettings from '../components/VoiceSettings.jsx';
import { currentSubscription, disablePush, enablePush, isIOS, isStandalone, pushSupport } from '../lib/push.js';

export default function Settings() {
  const { user, refresh } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [time, setTime] = useState(user.reminder_time || '20:00');
  const [enabled, setEnabled] = useState(!!user.reminder_enabled);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [goal, setGoal] = useState(user.daily_goal || 20);
  const [visible, setVisible] = useState(user.show_on_leaderboard !== 0);
  const [installEvt, setInstallEvt] = useState(window.__installPrompt || null);
  const support = pushSupport();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => { currentSubscription().then((s) => setSubscribed(!!s)).catch(() => {}); }, []);
  useEffect(() => {
    const h = () => setInstallEvt(window.__installPrompt);
    window.addEventListener('installprompt-ready', h);
    return () => window.removeEventListener('installprompt-ready', h);
  }, []);

  const run = async (fn, ok) => {
    setBusy(true); setMsg(null);
    try { await fn(); if (ok) setMsg({ type: 'ok', text: ok }); }
    catch (e) { setMsg({ type: 'bad', text: e.message }); }
    finally { setBusy(false); }
  };

  const turnOn = () => run(async () => {
    await enablePush();
    setSubscribed(true);
    await api('/push/reminder', { method: 'PUT', body: { enabled: true, time, tz } });
    setEnabled(true);
    await refresh();
  }, `Đã bật nhắc học lúc ${time} mỗi ngày trên thiết bị này.`);

  const turnOff = () => run(async () => {
    await disablePush();
    setSubscribed(false);
    await api('/push/reminder', { method: 'PUT', body: { enabled: false } });
    setEnabled(false);
    await refresh();
  }, 'Đã tắt nhắc học trên thiết bị này.');

  const saveTime = () => run(async () => {
    await api('/push/reminder', { method: 'PUT', body: { time, tz } });
    await refresh();
  }, `Đã đổi giờ nhắc thành ${time}.`);

  const test = () => run(() => api('/push/test', { method: 'POST' }), 'Đã gửi thông báo thử — kiểm tra thanh thông báo của bạn.');

  const saveProfile = () => run(async () => {
    await api('/me', { method: 'PATCH', body: { daily_goal: Number(goal), show_on_leaderboard: visible } });
    await refresh();
  }, 'Đã lưu.');

  const install = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice.catch(() => {});
    window.__installPrompt = null;
    setInstallEvt(null);
  };

  return (
    <div className="stack settings">
      <h2>⚙️ Cài đặt</h2>

      <div className="card stack">
        <h3>🔊 Giọng đọc</h3>
        <VoiceSettings />
      </div>

      <div className="card stack">
        <h3>📲 Cài app lên điện thoại</h3>
        {isStandalone() ? <p>✅ Bạn đang dùng LinguaViet dạng app.</p> : (
          <>
            {installEvt && <button className="btn primary" onClick={install}>Cài LinguaViet lên thiết bị này</button>}
            <ul className="howto small">
              <li><strong>Android (Chrome):</strong> menu ⋮ → <em>Cài đặt ứng dụng</em> / <em>Thêm vào màn hình chính</em>.</li>
              <li><strong>iPhone/iPad (Safari):</strong> nút Chia sẻ ⬆️ → <em>Thêm vào MH chính</em>, rồi mở app từ biểu tượng đó (cần iOS 16.4+ để nhận thông báo).</li>
            </ul>
          </>
        )}
        {!window.isSecureContext && <div className="error small">Trang đang chạy qua HTTP. Để cài app và nhận thông báo trên điện thoại, app phải chạy trên HTTPS.</div>}
      </div>

      <div className="card stack">
        <h3>🔔 Nhắc học hằng ngày</h3>
        <p className="small muted">App sẽ gửi thông báo vào giờ bạn chọn <strong>nếu hôm đó bạn chưa học</strong>, kèm số thẻ cần ôn và chuỗi ngày học.</p>
        {!support.ok ? <div className="error small">{support.reason}</div> : (
          <>
            <div className="row">
              <label className="inline">Giờ nhắc <input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
              {subscribed && enabled && <button className="btn" onClick={saveTime} disabled={busy}>Lưu giờ</button>}
            </div>
            <div className="row">
              {subscribed && enabled ? (
                <>
                  <span className="badge soft">Đang bật trên thiết bị này</span>
                  <button className="btn" onClick={test} disabled={busy}>Gửi thử</button>
                  <button className="btn ghost" onClick={turnOff} disabled={busy}>Tắt</button>
                </>
              ) : (
                <button className="btn primary" onClick={turnOn} disabled={busy}>Bật nhắc học trên thiết bị này</button>
              )}
            </div>
            <div className="small muted">Múi giờ: {tz}. Bật trên từng thiết bị bạn muốn nhận (điện thoại, máy tính…).</div>
          </>
        )}
        {isIOS() && !isStandalone() && <div className="small">ℹ️ Trên iPhone, hãy cài app vào màn hình chính trước rồi mới bật thông báo.</div>}
      </div>

      <div className="card stack">
        <h3>👤 Học tập & xếp hạng</h3>
        <label className="inline">Mục tiêu mỗi ngày
          <input type="number" min="5" max="200" value={goal} onChange={(e) => setGoal(e.target.value)} style={{ width: 80 }} /> hoạt động
        </label>
        <label className="inline">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Hiện tên tôi trên bảng xếp hạng (bỏ chọn để hiện “Người học ẩn danh”)
        </label>
        <div><button className="btn primary" onClick={saveProfile} disabled={busy}>Lưu</button></div>
      </div>

      {msg && <div className={msg.type === 'ok' ? 'feedback ok' : 'error'}>{msg.text}</div>}
    </div>
  );
}
