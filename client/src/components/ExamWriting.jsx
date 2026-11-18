import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import ExamChart from './ExamChart.jsx';

const CRITERIA = [
  ['ta', 'Task Achievement / Response', 'Trả lời đủ yêu cầu đề; Task 1 có tổng quan (overview) và số liệu nổi bật; Task 2 có quan điểm rõ, lập luận phát triển đủ.'],
  ['cc', 'Coherence & Cohesion', 'Bố cục đoạn hợp lý, mỗi đoạn một ý chính; từ nối đa dạng nhưng không lạm dụng.'],
  ['lr', 'Lexical Resource', 'Từ vựng đa dạng, đúng ngữ cảnh, ít lặp; ít lỗi chính tả.'],
  ['gra', 'Grammatical Range & Accuracy', 'Dùng cả câu đơn và câu phức; phần lớn câu không lỗi ngữ pháp.'],
];
const BANDS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
const countWords = (s) => (s.match(/[A-Za-z0-9'’-]+/g) || []).length;
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
const draftKey = (id, t) => `langapp.writing.${id}.${t}`;
const readDraft = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };

// IELTS Writing: viết bài, xem bài mẫu, tự chấm theo 4 tiêu chí
export default function ExamWriting({ exam, sec }) {
  const [task, setTask] = useState('task1');
  return (
    <div className="stack page-narrow exam-run">
      <div className="exam-bar">
        <Link to="/exams" className="btn ghost sm">←</Link>
        <div className="exam-bar-title"><strong>{exam.title}</strong> · Writing</div>
        <div className="seg">
          <button className={task === 'task1' ? 'active' : ''} onClick={() => setTask('task1')}>Task 1</button>
          <button className={task === 'task2' ? 'active' : ''} onClick={() => setTask('task2')}>Task 2</button>
        </div>
      </div>
      <Task key={task} exam={exam} task={task} t={sec.tasks[task]} />
    </div>
  );
}

function Task({ exam, task, t }) {
  const minutes = task === 'task1' ? 20 : 40;
  const [text, setText] = useState(() => readDraft(draftKey(exam.id, task)));
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(null);
  const [marks, setMarks] = useState({});
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const words = countWords(text);

  useEffect(() => { try { localStorage.setItem(draftKey(exam.id, task), text); } catch { /* bỏ qua */ } }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!startedAt || result) return undefined;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [startedAt, result]);
  const left = startedAt ? Math.round(minutes * 60 - (now - startedAt) / 1000) : minutes * 60;

  const submit = async () => {
    if (words < 20 && !window.confirm('Bài viết còn rất ngắn. Vẫn xem bài mẫu?')) return;
    setBusy(true);
    try {
      const r = await api(`/exams/${exam.id}/writing`, { method: 'POST', body: { task, text, durationSec: startedAt ? Math.round((Date.now() - startedAt) / 1000) : null } });
      setResult(r);
    } catch (e) { alert(e.message); } finally { setBusy(false); }
  };
  const avg = CRITERIA.every(([k]) => marks[k] != null)
    ? Math.round((CRITERIA.reduce((s, [k]) => s + marks[k], 0) / 4) * 2) / 2 : null;
  const saveBand = async () => {
    await api(`/exams/attempts/${result.attemptId}`, { method: 'PATCH', body: { selfBand: avg } }).catch((e) => alert(e.message));
    setSaved(true);
  };

  return (
    <>
      <div className="card stack">
        <div className="muted small">{task === 'task1' ? 'Task 1 · nên dành 20 phút · tối thiểu 150 từ' : 'Task 2 · nên dành 40 phút · tối thiểu 250 từ'}</div>
        <div className="w-prompt">{t.prompt}</div>
        {t.chart && <ExamChart chart={t.chart} />}
      </div>

      <div className="card stack">
        <textarea className="w-text" rows={14} value={text} disabled={!!result} spellCheck={false} lang="en"
          onChange={(e) => { setText(e.target.value); if (!startedAt) setStartedAt(Date.now()); }}
          placeholder="Viết bài của bạn ở đây (bài nháp tự lưu trên máy này)…" />
        <div className="w-meta">
          <span className={words >= t.minWords ? 'ok-text' : 'muted'}>{words} / {t.minWords} từ</span>
          {startedAt && !result && <span className={left < 120 ? 'error-text' : 'muted'}>⏱ {left > 0 ? fmtClock(left) : 'Hết giờ'}</span>}
          {!result && <button className="btn primary" onClick={submit} disabled={busy || !text.trim()}>Nộp & xem bài mẫu</button>}
          {result && <button className="btn sm" onClick={() => { setResult(null); setMarks({}); setSaved(false); setStartedAt(null); }}>Viết lại</button>}
        </div>
      </div>

      {result && (
        <>
          <div className="card stack">
            <h3>🧑‍🏫 Tự chấm theo tiêu chí IELTS</h3>
            <p className="small muted" style={{ margin: 0 }}>Đọc lại bài của bạn, so với bài mẫu bên dưới, rồi chọn band cho từng tiêu chí.</p>
            {CRITERIA.map(([k, name, hint]) => (
              <div key={k} className="crit-row">
                <div><strong>{name}</strong><div className="small muted">{hint}</div></div>
                <select value={marks[k] ?? ''} onChange={(e) => setMarks((m) => ({ ...m, [k]: e.target.value === '' ? null : Number(e.target.value) }))}>
                  <option value="">Band…</option>
                  {BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            ))}
            <div className="row" style={{ marginTop: 0 }}>
              <strong>Band ước lượng: {avg ?? '—'}</strong>
              <button className="btn primary sm" onClick={saveBand} disabled={avg == null || saved}>{saved ? '✓ Đã lưu' : 'Lưu kết quả'}</button>
            </div>
          </div>
          <div className="card stack">
            <h3>📄 Bài mẫu <span className="badge">Band {result.sampleBand}</span></h3>
            <div className="w-sample">{result.sample}</div>
            {result.notes_vi && <><h4 style={{ margin: 0 }}>💡 Gợi ý</h4><div className="w-notes">{result.notes_vi}</div></>}
          </div>
        </>
      )}
    </>
  );
}
