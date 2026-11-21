import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { LANG_INFO, scriptClass, useLang } from '../lib/lang.jsx';
import { useAuth } from '../lib/auth.jsx';
import { levelLabel, levelShort } from '../lib/levels.js';

// Danh sách bài ngữ pháp theo trình độ + tiến độ + bài cần ôn
export default function Grammar() {
  const { lang } = useLang();
  const myLevel = useAuth().user.levels?.[lang];
  const [data, setData] = useState(null);
  const [weak, setWeak] = useState([]);
  const [level, setLevel] = useState(null);
  useEffect(() => {
    setData(null);
    api(`/grammar?lang=${lang}`).then((d) => {
      setData(d);
      setLevel(d.levels.some((l) => l.level === myLevel) ? myLevel : d.levels[0]?.level || null);
    }).catch(() => setData({ levels: [] }));
    api(`/grammar/weak?lang=${lang}`).then((d) => setWeak(d.points)).catch(() => setWeak([]));
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div className="muted">Đang tải…</div>;
  if (!data.levels.length) return <div className="card muted">Chưa có bài ngữ pháp {LANG_INFO[lang].label}.</div>;
  const cur = data.levels.find((l) => l.level === level) || data.levels[0];
  const done = (pts) => pts.filter((p) => p.mine && p.mine.best >= data.weakBelow).length;

  return (
    <div className="stack">
      <div className="toolbar"><h2>📐 Ngữ pháp {LANG_INFO[lang].label}</h2></div>

      <div className="gr-levels">
        {data.levels.map((l) => {
          const d = done(l.points);
          return (
            <button key={l.level} className={`gr-level ${l.level === cur.level ? 'active' : ''}`} onClick={() => setLevel(l.level)}>
              <strong>{levelShort(l.level)}{l.level === myLevel && ' 🎯'}</strong>
              <span className="small muted">{d}/{l.points.length} bài</span>
              <div className="bar"><div style={{ width: `${(d / l.points.length) * 100}%` }} /></div>
            </button>
          );
        })}
      </div>

      <Link to="/grammar/review" className="card gk-review-card">
        <span className="gk-review-ico">🧠</span>
        <div className="gk-review-text"><strong>Ôn thẻ ngữ pháp</strong><div className="small muted">{data.srsTotal ? `${data.srsTotal} bài trong thẻ ôn · ${data.dueCount} đến hạn` : 'Làm bài tập hoặc bấm "Thêm vào thẻ ôn" để bài vào thẻ'}</div></div>
        {data.dueCount > 0 && <span className="badge">{data.dueCount}</span>}
      </Link>

      {weak.length > 0 && (
        <div className="card gr-weak">
          <strong>⚠️ Cần ôn lại ({weak.length})</strong>
          <div className="gr-weak-list">
            {weak.slice(0, 8).map((p) => (
              <Link key={p.id} to={`/grammar/${p.id}`} className="chip-link">{levelShort(p.level)} · {p.title} · {p.last}%</Link>
            ))}
          </div>
        </div>
      )}

      <h3 style={{ margin: 0 }}>{levelLabel(cur.level)}</h3>
      <div className="gr-list">
        {cur.points.map((p, i) => {
          const m = p.mine;
          const status = !m ? 'new' : m.best >= data.weakBelow ? 'done' : 'weak';
          return (
            <Link key={p.id} to={`/grammar/${p.id}`} className={`card gr-item ${status}`}>
              <span className="gr-num">{status === 'done' ? '✓' : i + 1}</span>
              <div className="gr-text">
                <strong>{p.emoji && `${p.emoji} `}{p.title}</strong> <span className={`muted small ${scriptClass(lang)}`}>{p.title_native}</span>
                <div className="small muted">{p.summary_vi}</div>
              </div>
              <span className="small gr-score">{m ? `${m.best}%` : `${p.exercises} câu`}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
