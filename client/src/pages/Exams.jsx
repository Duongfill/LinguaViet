import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

const SECTION = {
  listening: { icon: '🎧', name: 'Listening' },
  reading: { icon: '📖', name: 'Reading' },
  writing: { icon: '✍️', name: 'Writing' },
  speaking: { icon: '🗣️', name: 'Speaking' },
};
const KEY = 'langapp.examTab';

// Danh sách đề luyện TOEIC / IELTS
export default function Exams() {
  const [exams, setExams] = useState(null);
  const [tab, setTab] = useState(() => { try { return localStorage.getItem(KEY) || 'toeic'; } catch { return 'toeic'; } });
  useEffect(() => { api('/exams').then((d) => setExams(d.exams)).catch(() => setExams([])); }, []);
  const choose = (t) => { setTab(t); try { localStorage.setItem(KEY, t); } catch { /* bỏ qua */ } };

  const list = (exams || []).filter((e) => e.type === tab);
  const fmtMine = (type, k, m) => {
    if (!m) return null;
    if (m.best != null) return type === 'toeic' ? `Cao nhất ${m.best}/${k === 'writing' ? 200 : 495}` : `Band cao nhất ${m.best}`;
    if (m.best_pct != null) return `Đúng ${Math.round(m.best_pct * 100)}%`;
    return `Đã làm ${m.n} lần`;
  };

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>📝 Luyện đề</h2>
        <div className="seg">
          <button className={tab === 'toeic' ? 'active' : ''} onClick={() => choose('toeic')}>TOEIC</button>
          <button className={tab === 'ielts' ? 'active' : ''} onClick={() => choose('ielts')}>IELTS</button>
        </div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {tab === 'toeic'
          ? 'Đề luyện tự soạn theo dạng thức TOEIC Listening & Reading (Part 2–7; Part 1 tả tranh chưa có) và TOEIC Writing (tả tranh, email, bài luận — tự chấm theo bài mẫu). Bài nghe đọc bằng giọng máy, nhiều giọng. Điểm quy đổi chỉ là ước lượng.'
          : 'Đề luyện tự soạn theo dạng thức IELTS Academic. Listening/Reading chấm tự động, quy đổi band ước lượng; Writing/Speaking có bài mẫu và tiêu chí để tự chấm.'}
      </p>
      {exams === null && <div className="muted">Đang tải…</div>}
      {exams && list.length === 0 && <div className="card muted">Chưa có đề {tab.toUpperCase()}.</div>}
      <div className="exam-grid">
        {list.map((e) => (
          <div key={e.id} className="card exam-card">
            <h3>{e.title}</h3>
            <div className="exam-sections">
              {Object.entries(e.sections).map(([k, s]) => (
                <div key={k} className="exam-sec">
                  <Link to={`/exams/${e.id}/${k}`} className="btn exam-sec-btn">
                    <span>{SECTION[k].icon} {SECTION[k].name}</span>
                    <span className="muted small">{s.total ? `${s.total} câu · ` : ''}{s.minutes} phút</span>
                  </Link>
                  {fmtMine(e.type, k, s.mine) && <div className="small ok-text">{fmtMine(e.type, k, s.mine)}</div>}
                  {s.parts?.length > 1 && (
                    <div className="exam-parts">
                      {s.parts.map((p) => (
                        <Link key={p.part} to={`/exams/${e.id}/${k}?parts=${p.part}`} className="chip-link" title={p.title}>
                          {e.type === 'toeic' ? `Part ${p.part}` : p.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
