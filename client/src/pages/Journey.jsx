import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLang, LANG_INFO } from '../lib/lang.jsx';
import { LEVELS_BY_LANG, levelShort } from '../lib/levels.js';

const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(s.length > 10 ? s.replace(' ', 'T') + 'Z' : s + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function Journey() {
  const { lang } = useLang();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const load = () => api(`/journey?lang=${lang}`).then(setData).catch((e) => setError(e.message));
  useEffect(() => { setData(null); load(); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="muted">Đang tải hành trình…</div>;

  const { goal } = data;
  const nextMs = data.milestones.find((m) => !m.reached);

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>🗺️ Hành trình {LANG_INFO[lang].label}</h2>
        <button className="btn sm" onClick={() => setEditing((v) => !v)}>🎯 {editing ? 'Đóng' : 'Đổi đích'}</button>
      </div>

      {editing && <GoalEditor lang={lang} goal={goal} onSaved={() => { setEditing(false); load(); }} />}

      <div className="card journey-head">
        <div>
          <div className="muted small">Từ {levelShort(goal.start)} → đích</div>
          <div className="journey-goal">🏁 Hoàn thành {levelShort(goal.target)}</div>
          {goal.deadline && <div className="small">Hạn chót: <strong>{fmtDate(goal.deadline)}</strong></div>}
          {goal.isDefault && <div className="small muted">Đích mặc định là trình độ hiện tại của bạn — bấm “Đổi đích” để đặt xa hơn.</div>}
        </div>
        <div className="journey-pct">
          <div className="big">{data.percent}%</div>
          <div className="small muted">{data.done}/{data.total} từ</div>
        </div>
      </div>

      <div className="grid stats">
        <Stat label="Tốc độ (14 ngày)" value={`${data.pace} từ/ngày`} />
        <Stat label="Dự kiến về đích" value={data.eta === 'done' ? '🎉 Đã về đích' : data.eta ? fmtDate(data.eta) : '—'}
          hint={!data.eta ? 'Học vài ngày để app ước tính' : null} />
        {data.neededPerDay != null && <Stat label="Cần mỗi ngày để kịp hạn" value={`${data.neededPerDay} từ`}
          hint={data.pace >= data.neededPerDay ? '✅ Bạn đang đúng tiến độ' : '⚠️ Cần tăng tốc'} />}
        <Stat label="Chuỗi ngày học" value={`🔥 ${data.streak}`} hint={`${data.daysStudied} ngày đã học ${LANG_INFO[lang].label}`} />
      </div>

      <div className="card">
        <div className="toolbar">
          <h3>Con đường của bạn</h3>
          {nextMs && <div className="small muted">Cột mốc tiếp theo: {nextMs.icon} {nextMs.title} — còn {nextMs.words - data.done} từ</div>}
        </div>
        <Road data={data} />
        <div className="row center">
          <Link className="btn primary" to="/flashcards">Học tiếp để tiến lên ›</Link>
        </div>
      </div>

      <div className="card">
        <h3>Mỗi ngày tiến thêm</h3>
        <DailyBars daily={data.daily} />
      </div>

      <div className="card">
        <h3>Các cột mốc</h3>
        <ul className="ms-list">
          {data.milestones.map((m) => (
            <li key={m.words + m.title} className={m.reached ? 'reached' : ''}>
              <span className="ms-icon">{m.reached ? m.icon : '🔒'}</span>
              <div className="ms-text">
                <strong>{m.title}</strong>
                <div className="small muted">{m.words} từ{m.reached ? ` · đạt ngày ${fmtDate(m.reachedAt)}` : ` · còn ${m.words - data.done} từ`}</div>
              </div>
              {m.reached && <span className="badge soft">Đã đạt</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="card stat">
      <div className="muted small">{label}</div>
      <div className="stat-value sm">{value}</div>
      {hint && <div className="small muted">{hint}</div>}
    </div>
  );
}

// Con đường uốn lượn: xuất phát ở dưới, đích ở trên
function Road({ data }) {
  const W = 360, H = 560, PAD = 46;
  const point = (t) => ({
    x: W / 2 + (W / 2 - 70) * Math.sin(t * Math.PI * 3),
    y: H - PAD - t * (H - 2 * PAD),
  });
  // Cột mốc đặt cách đều trên đường; vị trí người học nội suy giữa 2 cột mốc kề nhau
  const anchors = [0, ...data.milestones.map((m) => m.words)];
  const tOf = (words) => {
    const n = anchors.length - 1;
    for (let i = 1; i <= n; i++) {
      if (words <= anchors[i]) {
        const seg = anchors[i] - anchors[i - 1] || 1;
        return (i - 1 + (words - anchors[i - 1]) / seg) / n;
      }
    }
    return 1;
  };
  const progress = tOf(data.done);
  const pathTo = (t1) => {
    const pts = [];
    for (let i = 0; i <= 120; i++) { const t = (i / 120) * t1; const p = point(t); pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`); }
    return 'M' + pts.join(' L');
  };
  const full = useMemo(() => pathTo(1), []); // eslint-disable-line react-hooks/exhaustive-deps
  const done = pathTo(Math.max(progress, 0.0001));
  const me = point(progress);
  const start = point(0);

  return (
    <svg className="road" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Đã đi ${data.percent}% chặng đường`}>
      <path d={full} className="road-bg" />
      <path d={full} className="road-dash" />
      <path d={done} className="road-done" />
      <g>
        <circle cx={start.x} cy={start.y} r="13" className="ms-dot reached" />
        <text x={start.x} y={start.y + 30} className="road-label" textAnchor="middle">Xuất phát · {levelShort(data.goal.start)}</text>
      </g>
      {data.milestones.map((m) => {
        const p = point(tOf(m.words));
        const right = p.x < W / 2;
        return (
          <g key={m.words + m.title}>
            <circle cx={p.x} cy={p.y} r={m.final ? 18 : 14} className={`ms-dot ${m.reached ? 'reached' : ''}`} />
            <text x={p.x} y={p.y + 5} textAnchor="middle" className="ms-emoji">{m.reached || m.final ? m.icon : '🔒'}</text>
            <text x={right ? p.x + 24 : p.x - 24} y={p.y - 2} textAnchor={right ? 'start' : 'end'} className="road-label">{m.title}</text>
            <text x={right ? p.x + 24 : p.x - 24} y={p.y + 13} textAnchor={right ? 'start' : 'end'} className="road-sub">{m.words} từ</text>
          </g>
        );
      })}
      <g className="me-marker" transform={`translate(${me.x}, ${me.y})`}>
        <g className="me-bob">
          <circle r="20" className="me-ring" />
          <text y="7" textAnchor="middle" className="me-emoji">🧑‍🎓</text>
          <text y="-28" textAnchor="middle" className="me-label">Bạn · {data.done} từ</text>
        </g>
      </g>
    </svg>
  );
}

function DailyBars({ daily }) {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ key, label: `${d.getDate()}/${d.getMonth() + 1}`, n: daily.find((x) => x.d === key)?.n || 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.n));
  const total = days.reduce((s, d) => s + d.n, 0);
  return (
    <>
      <div className="small muted">30 ngày qua: +{total} từ mới · {days.filter((d) => d.n).length} ngày có học</div>
      <div className="daily-bars">
        {days.map((d, i) => (
          <div key={d.key} className="db-col" title={`${d.label}: +${d.n} từ`}>
            <div className="db-bar" style={{ height: `${(d.n / max) * 100}%` }} />
            {(i % 5 === 4 || i === 29) && <div className="db-label">{d.label}</div>}
          </div>
        ))}
      </div>
    </>
  );
}

function GoalEditor({ lang, goal, onSaved }) {
  const options = LEVELS_BY_LANG[lang].slice(Math.max(0, LEVELS_BY_LANG[lang].indexOf(goal.start)))
    .filter((l) => !(lang === 'en' && l === 'C1')); // chưa có dữ liệu C1
  const [target, setTarget] = useState(goal.target);
  const [deadline, setDeadline] = useState(goal.deadline || '');
  const [error, setError] = useState('');
  const save = async (e) => {
    e.preventDefault();
    setError('');
    try { await api('/goal', { method: 'PUT', body: { lang, target, deadline: deadline || null } }); onSaved(); }
    catch (err) { setError(err.message); }
  };
  return (
    <form className="card goal-editor" onSubmit={save}>
      <label>Đích muốn đạt
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          {options.map((l) => <option key={l} value={l}>Hoàn thành {levelShort(l)}</option>)}
        </select>
      </label>
      <label>Hạn chót (không bắt buộc)
        <input type="date" value={deadline} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDeadline(e.target.value)} />
      </label>
      <button className="btn primary">Lưu đích</button>
      {error && <div className="error">{error}</div>}
      <div className="small muted">Hành trình tính các từ từ trình độ bắt đầu ({levelShort(goal.start)}) đến đích. Đổi trình độ bắt đầu bằng nút 🎯 trên đầu trang.</div>
    </form>
  );
}
