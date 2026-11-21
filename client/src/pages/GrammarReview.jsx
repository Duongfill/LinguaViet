import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { scriptClass, useLang } from '../lib/lang.jsx';
import { formatInterval, sm2Preview } from '../lib/srs.js';
import SpeakButton from '../components/SpeakButton.jsx';
import { FormulaBlocks, Timeline } from '../components/GrammarKit.jsx';

const GRADES = [
  { grade: 0, label: 'Quên', cls: 'danger' },
  { grade: 3, label: 'Khó', cls: 'warn' },
  { grade: 4, label: 'Nhớ', cls: 'ok' },
  { grade: 5, label: 'Dễ', cls: 'primary' },
];
const LETTERS = 'ABCD';

// Mỗi lượt ôn một bài, ngẫu nhiên một dạng: nhớ công thức / làm bài nhỏ / sửa câu sai
function makeFace(card) {
  const p = card.point;
  const kinds = ['formula'];
  if (p.exercises.length) kinds.push('quiz', 'quiz');
  if (p.mistakes.length) kinds.push('mistake');
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  if (kind === 'quiz') return { kind, x: p.exercises[Math.floor(Math.random() * p.exercises.length)] };
  if (kind === 'mistake') return { kind, m: p.mistakes[Math.floor(Math.random() * p.mistakes.length)] };
  return { kind };
}

export default function GrammarReview() {
  const { lang } = useLang();
  const [queue, setQueue] = useState(null);
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stat, setStat] = useState({ n: 0, ok: 0 });

  const load = () => {
    setQueue(null);
    api(`/grammar/review?lang=${lang}`).then((d) => {
      setTotal(d.total);
      setQueue(d.cards.map((c) => ({ ...c, face: makeFace(c) })));
      setFlipped(false); setStat({ n: 0, ok: 0 });
    }).catch(() => { setQueue([]); });
  };
  useEffect(load, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!queue) return <div className="muted">Đang tải…</div>;
  const card = queue[0];

  const rate = (grade) => {
    const n = sm2Preview(card.state, grade);
    api('/grammar/review', { method: 'POST', body: { point_id: card.point.id, grade } }).catch(() => {});
    const rest = queue.slice(1);
    setQueue(grade < 3 ? [...rest, { ...card, state: { ...card.state, ...n }, face: makeFace(card) }] : rest);
    setStat((s) => ({ n: s.n + 1, ok: s.ok + (grade >= 3 ? 1 : 0) }));
    setFlipped(false);
  };

  if (!card) {
    return (
      <div className="stack page-narrow">
        <div className="toolbar"><h2>🧠 Ôn thẻ ngữ pháp</h2></div>
        <div className="card center stack">
          <div style={{ fontSize: '3rem' }}>{stat.n ? '🎉' : '😌'}</div>
          <strong>{stat.n ? `Xong rồi! Nhớ ${stat.ok}/${stat.n} lượt.` : 'Chưa có thẻ nào đến hạn.'}</strong>
          <div className="muted small">{total === 0
            ? 'Làm bài tập một bài ngữ pháp hoặc bấm "Thêm vào thẻ ôn" thì bài đó sẽ vào thẻ ôn.'
            : `Đang có ${total} bài trong thẻ ôn — quay lại sau để ôn tiếp đúng lúc sắp quên.`}</div>
          <div className="row center"><Link className="btn primary" to="/grammar">📐 Về danh sách ngữ pháp</Link></div>
        </div>
      </div>
    );
  }

  const p = card.point;
  const f = card.face;
  const sc = scriptClass(lang);
  return (
    <div className="stack page-narrow">
      <div className="toolbar"><h2>🧠 Ôn thẻ ngữ pháp</h2><span className="small muted">Còn {queue.length} thẻ</span></div>
      <div className="card stack gk-review">
        <div className="small muted">{p.emoji} {p.title} <span className={sc}>{p.title_native}</span></div>

        {f.kind === 'formula' && (
          <>
            <div className="gk-q">Nhớ lại <strong>công thức</strong> và cách dùng của bài này:</div>
            <div className="muted">{p.summary_vi}</div>
            {flipped && (
              <>
                <FormulaBlocks formulas={p.formula} lang={lang} />
                {p.tip && <div className="gk-tip"><span className="gk-tip-ico">💡</span><div>{p.tip}</div></div>}
                {p.timeline && <Timeline kind={p.timeline} />}
                {p.examples[0] && <div className="gr-ex"><span className={sc}>{p.examples[0].t}</span> <SpeakButton text={p.examples[0].t} lang={lang} /><div className="small muted">{p.examples[0].vi}</div></div>}
              </>
            )}
          </>
        )}

        {f.kind === 'quiz' && (
          <>
            <div className="gk-q">Điền / chọn đáp án đúng:</div>
            <div className={`gr-q ${sc}`}>{f.x.q.split(/_{3,}/).map((s, k, arr) => <Fragment key={k}>{s}{k < arr.length - 1 && <span className="blank-mark">{flipped ? (f.x.type === 'mcq' ? f.x.options[f.x.answer] : f.x.answer[0]) : '____'}</span>}</Fragment>)}</div>
            {f.x.type === 'mcq' && <div className={`gk-opts ${sc}`}>{f.x.options.map((o, k) => <span key={k} className={`chip ${flipped && k === f.x.answer ? 'gk-chip-ok' : ''}`}>{LETTERS[k]}. {o}</span>)}</div>}
            {flipped && <div className="feedback ok"><div className="small">{f.x.explain}</div></div>}
          </>
        )}

        {f.kind === 'mistake' && (
          <>
            <div className="gk-q">Câu này <strong>sai</strong> — sửa lại thế nào?</div>
            <div className={`gr-q ${sc}`}>❌ <s>{f.m.wrong}</s></div>
            {flipped && (
              <div className="feedback ok">
                <div className={sc}>✅ {f.m.right} <SpeakButton text={f.m.right} lang={lang} /></div>
                <div className="small">{f.m.note_vi}</div>
              </div>
            )}
          </>
        )}

        {!flipped ? (
          <button className="btn primary wide" onClick={() => setFlipped(true)}>Xem đáp án</button>
        ) : (
          <div className="grades">
            {GRADES.map((g) => (
              <button key={g.grade} className={`btn ${g.cls} grade-btn`} onClick={() => rate(g.grade)}>
                <span>{g.label}</span><span className="grade-when">{formatInterval(sm2Preview(card.state, g.grade).interval)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
