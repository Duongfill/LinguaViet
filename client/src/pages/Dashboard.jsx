import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { LANG_INFO, useLang } from '../lib/lang.jsx';
import { levelShort } from '../lib/levels.js';

export default function Dashboard() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/stats').then(setStats).catch((e) => setError(e.message)); }, []);

  if (error) return <div className="error">{error}</div>;
  if (!stats) return <div className="muted">Đang tải thống kê…</div>;

  const s = stats.perLang[lang];
  const goal = user.daily_goal || 20;
  const pct = Math.min(100, Math.round((stats.today / goal) * 100));
  const fmt = (v) => (v == null ? '—' : `${Math.round(v)}%`);

  return (
    <div className="stack">
      <h2>Chào {user.name} 👋</h2>
      <div className="grid stats">
        <Stat label="Chuỗi ngày học" value={`🔥 ${stats.streak}`} />
        <Stat label="Hoạt động hôm nay" value={`${stats.today}/${goal}`}>
          <div className="bar"><div style={{ width: `${pct}%` }} /></div>
        </Stat>
        <Stat label={`Từ đã thuộc (${LANG_INFO[lang].label})`} value={`${s.learned || 0}/${s.total}`} />
        <Stat label="Thẻ cần ôn" value={s.due || 0} />
      </div>

      <div className="grid actions">
        <ActionCard to="/flashcards" icon="🃏" title="Ôn flashcard" desc={`${s.due || 0} thẻ đến hạn + thẻ mới`} />
        <ActionCard to="/quiz" icon="❓" title="Làm quiz" desc={`Độ chính xác: ${fmt(s.activity.quiz?.accuracy)}`} />
        <ActionCard to="/speak" icon="🎤" title="Luyện phát âm" desc={`Điểm TB: ${fmt(s.activity.speak?.avg_score)}`} />
        {lang === 'zh' && (
          <ActionCard to="/hanzi" icon="✍️" title="Luyện viết chữ Hán" desc={`Đã viết ${s.activity.hanzi?.n || 0} lần`} />
        )}
      </div>

      <div className="card">
        <h3>Tiến độ theo trình độ</h3>
        <div className="level-progress">
          {s.byLevel.map((lv) => {
            const pctLv = lv.total ? Math.round(((lv.learned || 0) / lv.total) * 100) : 0;
            const mine = lv.level === user.levels?.[lang];
            return (
              <div key={lv.level} className={`lp-row ${mine ? 'mine' : ''}`}>
                <div className="lp-label">{levelShort(lv.level)}{mine && <span className="badge">🎯 của bạn</span>}</div>
                <div className="bar lp-bar"><div style={{ width: `${pctLv}%` }} /></div>
                <div className="small muted lp-num">{lv.learned || 0}/{lv.total}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3>7 ngày gần đây</h3>
        <WeekChart data={stats.last7} />
      </div>
    </div>
  );
}

function Stat({ label, value, children }) {
  return (
    <div className="card stat">
      <div className="muted small">{label}</div>
      <div className="stat-value">{value}</div>
      {children}
    </div>
  );
}

function ActionCard({ to, icon, title, desc }) {
  return (
    <Link to={to} className="card action">
      <div className="action-icon">{icon}</div>
      <div><strong>{title}</strong><div className="muted small">{desc}</div></div>
    </Link>
  );
}

function WeekChart({ data }) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ key, label: `${d.getDate()}/${d.getMonth() + 1}`, n: data.find((x) => x.d === key)?.n || 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.n));
  return (
    <div className="week">
      {days.map((d) => (
        <div key={d.key} className="week-col" title={`${d.n} hoạt động`}>
          <div className="week-n small">{d.n || ''}</div>
          <div className="week-bar" style={{ height: `${(d.n / max) * 100}%` }} />
          <div className="small muted">{d.label}</div>
        </div>
      ))}
    </div>
  );
}
