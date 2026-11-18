import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { countWords } from './ExamWriting.jsx';

const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
const load = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } };
// Có dùng từ cho sẵn không (nhận cả dạng chia: cook → cooking, cooked)
const hasWord = (text, w) => {
  const t = text.toLowerCase(), x = w.toLowerCase();
  if (t.includes(x)) return true;
  const stem = x.length > 4 ? x.replace(/(e|y|s)$/, '') : x;
  return new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t);
};
// Thang chấm từng câu (theo mô tả của bài thi TOEIC Writing)
const RUBRIC = {
  q1_5: { max: 3, hint: '3: một câu đúng ngữ pháp, dùng đủ 2 từ, hợp với tranh · 2: có lỗi làm câu khó hiểu · 1: thiếu từ / không hợp tranh · 0: bỏ trống' },
  q6_7: { max: 4, hint: '4: làm đủ mọi yêu cầu, tổ chức rõ, giọng phù hợp · 3: thiếu 1 yêu cầu hoặc lỗi nhỏ · 2: thiếu nhiều / khó hiểu · 1–0: lạc đề / bỏ trống' },
  q8: { max: 5, hint: '5: quan điểm rõ, lý do + ví dụ thuyết phục, ~300 từ, ít lỗi · 4: tốt nhưng còn chỗ chưa phát triển · 3: ý còn mơ hồ · 2–1: rời rạc · 0: bỏ trống' },
};

export default function ToeicWriting({ exam, sec }) {
  const key = `langapp.toeicw.${exam.id}`;
  const it = sec.items;
  const saved = load(key);
  const [ans, setAns] = useState(saved?.ans || {});
  const [startedAt] = useState(() => saved?.startedAt || Date.now());
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(null);
  const [marks, setMarks] = useState({});
  const [stored, setStored] = useState(false);
  const left = Math.round(sec.minutes * 60 - (now - startedAt) / 1000);

  useEffect(() => { if (!result) save(key, { ans, startedAt }); }, [ans]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (result) return undefined; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [result]);
  const set = (q) => (e) => setAns((a) => ({ ...a, [q]: e.target.value }));

  const submit = async () => {
    const empty = Array.from({ length: 8 }, (_, i) => `q${i + 1}`).filter((q) => !(ans[q] || '').trim()).length;
    if (empty && !window.confirm(`Còn ${empty} câu chưa viết. Nộp bài?`)) return;
    try {
      const r = await api(`/exams/${exam.id}/toeic-writing`, { method: 'POST', body: { answers: ans, durationSec: Math.round((Date.now() - startedAt) / 1000) } });
      setResult(r);
      try { localStorage.removeItem(key); } catch { /* bỏ qua */ }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { alert(e.message); }
  };

  const qs = Array.from({ length: 8 }, (_, i) => `q${i + 1}`);
  const maxOf = (q) => (q <= 'q5' ? 3 : q === 'q8' ? 5 : 4);
  const raw = qs.every((q) => marks[q] != null) ? qs.reduce((s, q) => s + marks[q], 0) : null;
  const scaled = raw == null ? null : Math.round((raw / 28) * 20) * 10;
  const storeScore = async () => {
    await api(`/exams/attempts/${result.attemptId}`, { method: 'PATCH', body: { selfBand: scaled } }).catch((e) => alert(e.message));
    setStored(true);
  };
  const Mark = ({ q }) => result && (
    <div className="tw-mark">
      <span className="small muted">Tự chấm:</span>
      {Array.from({ length: maxOf(q) + 1 }, (_, v) => (
        <button key={v} className={`q-opt ${marks[q] === v ? 'sel' : ''}`} onClick={() => setMarks((m) => ({ ...m, [q]: v }))}>{v}</button>
      ))}
    </div>
  );
  const k = result?.key;

  return (
    <div className="stack page-narrow exam-run">
      <div className="exam-bar">
        <Link to="/exams" className="btn ghost sm">←</Link>
        <div className="exam-bar-title"><strong>{exam.title}</strong> · Writing</div>
        {!result && <div className={`exam-clock ${left < 300 ? 'low' : ''}`}>⏱ {fmtClock(left)}</div>}
        {!result && <button className="btn primary sm" onClick={submit}>Nộp bài</button>}
      </div>

      {result && (
        <div className="card result-card mid">
          <div className="result-main">
            <div><div className="score">{scaled ?? '—'}<span className="small">/200</span></div><div className="small muted">Điểm Writing ước lượng (tự chấm)</div></div>
            <div className="small">Đọc bài mẫu bên dưới mỗi câu rồi chọn điểm cho từng câu.<br />Tổng thô: {raw ?? '—'}/28</div>
          </div>
          <button className="btn primary sm" disabled={scaled == null || stored} onClick={storeScore}>{stored ? '✓ Đã lưu' : 'Lưu kết quả'}</button>
        </div>
      )}

      <section className="stack">
        <h3 className="exam-part-title">Câu 1–5: Viết câu tả tranh</h3>
        <p className="muted small" style={{ margin: 0 }}>Viết MỘT câu tả bức tranh, dùng cả HAI từ cho sẵn (được đổi dạng từ, thứ tự tuỳ ý). {result && RUBRIC.q1_5.hint}</p>
        {it.q1_5.map((q, i) => {
          const id = `q${i + 1}`, v = ans[id] || '';
          return (
            <div key={id} className="card tw-pic">
              <div className="tw-scene" role="img" aria-label="Tranh">{q.scene}</div>
              <div className="tw-body">
                <div className="q-head"><span className="q-num">{i + 1}</span>
                  {q.words.map((w) => <span key={w} className={`chip-word ${v && hasWord(v, w) ? 'ok' : ''}`}>{w}</span>)}
                </div>
                <input value={v} onChange={set(id)} disabled={!!result} placeholder="Viết một câu…" lang="en" autoCapitalize="sentences" />
                {result && (
                  <div className="q-explain">
                    <div className="small"><strong>Tranh:</strong> {k.q1_5[i].alt}</div>
                    <div className="small"><strong>Câu mẫu:</strong> {k.q1_5[i].samples.join(' / ')}</div>
                    <Mark q={id} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="stack">
        <h3 className="exam-part-title">Câu 6–7: Trả lời email</h3>
        <p className="muted small" style={{ margin: 0 }}>Mỗi email nên dành khoảng 10 phút. {result && RUBRIC.q6_7.hint}</p>
        {it.q6_7.map((q, i) => {
          const id = `q${i + 6}`, v = ans[id] || '';
          return (
            <div key={id} className="card stack">
              <div className="passage">
                <div className="passage-kind">E-mail</div>
                <div className="passage-text small"><strong>From:</strong> {q.email.from}{'\n'}<strong>To:</strong> {q.email.to}{'\n'}<strong>Subject:</strong> {q.email.subject}{'\n\n'}{q.email.text}</div>
              </div>
              <div className="w-prompt"><span className="q-num">{i + 6}</span> {q.task}</div>
              <textarea className="w-text tw-short" rows={7} value={v} onChange={set(id)} disabled={!!result} lang="en" placeholder="Viết email trả lời…" />
              <div className="small muted">{countWords(v)} từ</div>
              {result && (
                <div className="q-explain">
                  <strong>Bài mẫu</strong><div className="w-sample small">{k.q6_7[i].sample}</div>
                  <div className="small">💡 {k.q6_7[i].notes_vi}</div>
                  <Mark q={id} />
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="stack">
        <h3 className="exam-part-title">Câu 8: Viết bài luận nêu ý kiến</h3>
        <p className="muted small" style={{ margin: 0 }}>Khoảng 30 phút, nên viết tối thiểu 300 từ. {result && RUBRIC.q8.hint}</p>
        <div className="card stack">
          <div className="w-prompt"><span className="q-num">8</span> {it.q8.prompt}</div>
          <textarea className="w-text" rows={14} value={ans.q8 || ''} onChange={set('q8')} disabled={!!result} lang="en" placeholder="Viết bài luận của bạn…" />
          <div className={countWords(ans.q8 || '') >= 300 ? 'small ok-text' : 'small muted'}>{countWords(ans.q8 || '')} / 300 từ</div>
          {result && (
            <div className="q-explain">
              <strong>Bài mẫu</strong><div className="w-sample small">{k.q8.sample}</div>
              <div className="small">💡 {k.q8.notes_vi}</div>
              <Mark q="q8" />
            </div>
          )}
        </div>
      </section>

      {!result && <div className="row center"><button className="btn primary" onClick={submit}>Nộp bài & xem bài mẫu</button></div>}
    </div>
  );
}
