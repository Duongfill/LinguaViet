import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { part2Lines, playLines } from '../lib/examAudio.js';
import ExamWriting from '../components/ExamWriting.jsx';
import ExamSpeaking from '../components/ExamSpeaking.jsx';
import ToeicWriting from '../components/ToeicWriting.jsx';

const L = 'ABCD';
const SPEAKER = { M: 'Nam', W: 'Nữ', M2: 'Nam 2', W2: 'Nữ 2', N: 'Thông báo' };
const TOEIC_HELP = {
  2: 'Nghe một câu hỏi/câu nói và ba câu đáp. Chọn câu đáp phù hợp nhất. (Câu đáp không in trên đề.)',
  3: 'Nghe các đoạn hội thoại, trả lời 3 câu hỏi cho mỗi đoạn.',
  4: 'Nghe các bài nói ngắn, trả lời 3 câu hỏi cho mỗi bài.',
  5: 'Chọn từ/cụm từ thích hợp nhất để hoàn thành câu.',
  6: 'Chọn từ, cụm từ hoặc câu thích hợp nhất để điền vào chỗ trống trong văn bản.',
  7: 'Đọc văn bản và trả lời câu hỏi.',
};
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* bỏ qua */ } },
};
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

export default function ExamRun() {
  const { id, section } = useParams();
  const [params] = useSearchParams();
  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api(`/exams/${id}`).then((d) => setExam(d.exam)).catch((e) => setError(e.message)); }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!exam) return <div className="muted">Đang tải đề…</div>;
  const sec = exam.sections[section];
  if (!sec) return <div className="card">Đề này không có phần {section}. <Link to="/exams">← Danh sách đề</Link></div>;
  if (section === 'writing') return sec.kind === 'toeic' ? <ToeicWriting exam={exam} sec={sec} /> : <ExamWriting exam={exam} sec={sec} />;
  if (section === 'speaking') return <ExamSpeaking exam={exam} sec={sec} />;
  return <Runner exam={exam} section={section} sec={sec} partsParam={params.get('parts')} />;
}

function Runner({ exam, section, sec, partsParam }) {
  const wanted = partsParam ? partsParam.split(',').map(Number) : null;
  const parts = sec.parts.filter((p) => !wanted || wanted.includes(p.part));
  const questions = useMemo(() => parts.flatMap((p) => p.groups.flatMap((g) => g.blocks.flatMap((b) => b.questions))), [exam.id, section, partsParam]); // eslint-disable-line react-hooks/exhaustive-deps
  const key = `langapp.exam.${exam.id}.${section}.${partsParam || 'all'}`;
  const saved = store.get(key);
  const limit = Math.max(5 * 60, Math.round(sec.minutes * 60 * (questions.length / sec.total)));
  const [answers, setAnswers] = useState(saved?.answers || {});
  const [startedAt] = useState(() => saved?.startedAt || Date.now());
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const left = Math.round(limit - (now - startedAt) / 1000);

  useEffect(() => { if (!result) store.set(key, { answers, startedAt }); }, [answers]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (result) return undefined; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [result]);
  const submitRef = useRef(null);
  useEffect(() => { if (!result && left <= 0 && !busy) submitRef.current?.(true); }, [left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const answered = questions.filter((q) => answers[q.id] != null && answers[q.id] !== '').length;
  const setAns = (qid, v) => !result && setAnswers((a) => ({ ...a, [qid]: v }));

  const submit = async (auto = false) => {
    if (busy || result) return;
    if (!auto && answered < questions.length && !window.confirm(`Còn ${questions.length - answered} câu chưa làm. Nộp bài?`)) return;
    setBusy(true);
    try {
      const r = await api(`/exams/${exam.id}/submit`, { method: 'POST', body: { section, parts: wanted, answers, durationSec: Math.round((Date.now() - startedAt) / 1000) } });
      setResult({ ...r, map: Object.fromEntries(r.detail.map((d) => [d.id, d])) });
      store.del(key);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { alert(e.message); } finally { setBusy(false); }
  };
  submitRef.current = submit;

  const restart = () => { store.del(key); window.location.reload(); };
  const sectionName = section === 'listening' ? 'Listening' : 'Reading';

  return (
    <div className="stack exam-run">
      <div className="exam-bar">
        <Link to="/exams" className="btn ghost sm">←</Link>
        <div className="exam-bar-title"><strong>{exam.title}</strong> · {sectionName}{wanted ? ` · ${parts.map((p) => (exam.type === 'toeic' ? `Part ${p.part}` : p.title)).join(', ')}` : ''}</div>
        {!result && <div className={`exam-clock ${left < 120 ? 'low' : ''}`} title="Thời gian còn lại">⏱ {fmtClock(left)}</div>}
        <button className="btn sm" onClick={() => setShowNav((v) => !v)}>{result ? `✅ ${result.correct}/${result.total}` : `${answered}/${questions.length}`} ▾</button>
        {!result ? <button className="btn primary sm" onClick={() => submit()} disabled={busy}>Nộp bài</button>
          : <button className="btn sm" onClick={restart}>Làm lại</button>}
      </div>
      {showNav && (
        <div className="card q-palette">
          {questions.map((q) => {
            const r = result?.map[q.id];
            const cls = r ? (r.correct ? 'right' : 'wrong') : answers[q.id] != null && answers[q.id] !== '' ? 'done' : '';
            return <a key={q.id} href={`#q-${q.id}`} className={`q-dot ${cls}`} onClick={() => setShowNav(false)}>{q.num}</a>;
          })}
        </div>
      )}

      {result && <ResultCard exam={exam} section={section} result={result} parts={parts} />}

      {parts.map((p) => (
        <section key={p.part} className="stack exam-part">
          <h3 className="exam-part-title">{exam.type === 'toeic' ? p.title : `${sectionName} – ${p.title}`}</h3>
          {exam.type === 'toeic' && <p className="muted small" style={{ margin: 0 }}>{TOEIC_HELP[p.part]}</p>}
          {p.groups.map((g, gi) => (
            <Group key={gi} exam={exam} section={section} part={p.part} g={g} answers={answers} setAns={setAns} result={result} />
          ))}
        </section>
      ))}

      {!result && (
        <div className="row center">
          <button className="btn primary" onClick={() => submit()} disabled={busy}>{busy ? 'Đang chấm…' : `Nộp bài (${answered}/${questions.length})`}</button>
        </div>
      )}
    </div>
  );
}

function ResultCard({ exam, section, result, parts }) {
  const byPart = parts.map((p) => {
    const ds = result.detail.filter((d) => d.part === p.part);
    return { title: exam.type === 'toeic' ? `Part ${p.part}` : p.title, ok: ds.filter((d) => d.correct).length, n: ds.length };
  });
  const pct = Math.round((result.correct / Math.max(1, result.total)) * 100);
  return (
    <div className={`card result-card ${pct >= 70 ? 'good' : pct >= 50 ? 'mid' : 'low'}`}>
      <div className="result-main">
        {result.score != null ? (
          <div><div className="score">{result.score}{exam.type === 'toeic' ? <span className="small">/495</span> : ''}</div>
            <div className="small muted">{exam.type === 'toeic' ? `Điểm ${section === 'listening' ? 'Listening' : 'Reading'} ước lượng` : 'Band IELTS ước lượng'}</div></div>
        ) : (
          <div><div className="score">{pct}%</div><div className="small muted">Làm riêng phần — chưa quy đổi điểm</div></div>
        )}
        <div><strong>{result.correct}/{result.total}</strong> câu đúng</div>
      </div>
      <div className="result-parts">
        {byPart.map((b) => (
          <div key={b.title} className="small"><span className="muted">{b.title}:</span> {b.ok}/{b.n}</div>
        ))}
      </div>
      <div className="small muted">Kéo xuống để xem lại từng câu, đáp án, giải thích{section === 'listening' ? ' và lời thoại' : ''}.</div>
    </div>
  );
}

function AudioBox({ lines, label = 'Nghe' }) {
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState(-1);
  const [plays, setPlays] = useState(0);
  const ctl = useRef(null);
  useEffect(() => () => ctl.current?.stop(), []);
  const play = () => {
    ctl.current?.stop();
    setPlaying(true); setPlays((n) => n + 1);
    ctl.current = playLines(lines, { onLine: setLine, onEnd: () => { setPlaying(false); setLine(-1); } });
  };
  const stop = () => { ctl.current?.stop(); setPlaying(false); setLine(-1); };
  return (
    <div className="audio-box">
      {playing ? <button className="btn danger sm" onClick={stop}>⏹ Dừng</button>
        : <button className="btn primary sm" onClick={play}>▶ {plays ? 'Nghe lại' : label}</button>}
      <span className="small muted">{playing ? `Đang phát ${line + 1}/${lines.length}` : plays ? `Đã nghe ${plays} lần` : 'Bài thi thật chỉ nghe 1 lần'}</span>
    </div>
  );
}

function Transcript({ lines }) {
  return (
    <details className="transcript">
      <summary>📜 Lời thoại</summary>
      {lines.map((l, i) => <div key={i}><span className="spk">{SPEAKER[l.s] || l.s}:</span> {l.t}</div>)}
    </details>
  );
}

function Passage({ p, blankNums }) {
  let text = p.text || '';
  const parts = blankNums ? text.split(/\[(\d)\]/) : [text];
  return (
    <div className="passage">
      <div className="passage-kind">{p.title || p.kind}</div>
      <div className="passage-text">
        {parts.map((seg, i) => (i % 2 === 1
          ? <span key={i} className="blank-mark">({blankNums[Number(seg) - 1] ?? seg})</span>
          : <Fragment key={i}>{seg}</Fragment>))}
      </div>
    </div>
  );
}

function Group({ exam, section, part, g, answers, setAns, result }) {
  const toeic = exam.type === 'toeic';
  const qs = g.blocks.flatMap((b) => b.questions);
  const lines = toeic && part === 2 ? part2Lines(g) : g.audio;
  const audio = section === 'listening' && lines?.length ? lines : null;
  const blanks = toeic && part === 6 ? qs.map((q) => q.num) : null;
  const passages = toeic ? (g.passages || []) : [];
  const ieltsReading = !toeic && section === 'reading';

  const questionsEl = g.blocks.map((b, bi) => (
    <div key={bi} className="q-block">
      {b.instructions && <div className="q-instr">{b.instructions}</div>}
      {['headings', 'match'].includes(b.type) && (
        <ul className="opt-list">{b.options.map((o, i) => <li key={i}>{o}</li>)}</ul>
      )}
      {b.questions.map((q) => (
        <Question key={q.id} q={q} type={b.type} options={b.options} hideText={toeic && part === 2}
          value={answers[q.id]} onChange={(v) => setAns(q.id, v)} r={result?.map[q.id]} />
      ))}
    </div>
  ));

  return (
    <div className={`card exam-group ${ieltsReading ? 'split' : ''}`}>
      {ieltsReading ? (
        <>
          <div className="reading-pane">
            <h3>{g.title}</h3>
            {g.paragraphs?.map((p) => <p key={p.label}><strong className="para-label">{p.label}</strong> {p.text}</p>)}
          </div>
          <div className="questions-pane">{questionsEl}</div>
        </>
      ) : (
        <>
          {g.title && !toeic && <h3>{g.title}</h3>}
          {g.context && <div className="muted small">{g.context}</div>}
          {audio && <AudioBox lines={audio} label={toeic ? `Nghe (câu ${qs[0].num}${qs.length > 1 ? `–${qs[qs.length - 1].num}` : ''})` : 'Nghe phần này'} />}
          {passages.map((p, i) => <Passage key={i} p={p} blankNums={blanks} />)}
          {questionsEl}
          {result && audio && <Transcript lines={audio} />}
        </>
      )}
    </div>
  );
}

function Question({ q, type, options, hideText, value, onChange, r }) {
  const reviewed = !!r;
  const cls = reviewed ? (r.correct ? 'q right' : 'q wrong') : 'q';
  const correctText = () => {
    if (!r) return '';
    if (type === 'gap') return r.answer.join(' / ');
    if (type === 'tfng' || type === 'ynng') return r.answer;
    if (type === 'headings' || type === 'match') return options[r.answer];
    return `(${L[r.answer]}) ${hideText ? q.options[r.answer] : q.options[r.answer]}`;
  };
  return (
    <div className={cls} id={`q-${q.id}`}>
      <div className="q-head"><span className="q-num">{q.num}</span>{q.q && <span className="q-text">{type === 'gap' ? null : q.q}</span>}</div>
      {type === 'gap' && (
        <div className="gap-line">
          {q.q.split(/_{4,}/).map((seg, i, arr) => (
            <Fragment key={i}>{seg}{i < arr.length - 1 && (
              <input className="gap-input" value={value ?? ''} disabled={reviewed} onChange={(e) => onChange(e.target.value)}
                autoComplete="off" autoCapitalize="off" spellCheck={false} aria-label={`Câu ${q.num}`} />
            )}</Fragment>
          ))}
        </div>
      )}
      {(type === 'tfng' || type === 'ynng') && (
        <div className="q-opts inline">
          {(type === 'tfng' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN']).map((v) => (
            <button key={v} className={`q-opt ${value === v ? 'sel' : ''} ${reviewed && r.answer === v ? 'ans' : ''}`} disabled={reviewed} onClick={() => onChange(v)}>{v}</button>
          ))}
        </div>
      )}
      {(type === 'headings' || type === 'match') && (
        <select value={value ?? ''} disabled={reviewed} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}>
          <option value="">— chọn —</option>
          {options.map((o, i) => <option key={i} value={i}>{o.length > 70 ? o.slice(0, 70) + '…' : o}</option>)}
        </select>
      )}
      {type === 'mcq' && (
        <div className={`q-opts ${hideText ? 'inline' : ''}`}>
          {q.options.map((o, i) => (
            <button key={i} className={`q-opt ${value === i ? 'sel' : ''} ${reviewed && r.answer === i ? 'ans' : ''}`} disabled={reviewed} onClick={() => onChange(i)}>
              <span className="q-letter">{L[i]}</span>{hideText && !reviewed ? '' : <span>{o}</span>}
            </button>
          ))}
        </div>
      )}
      {reviewed && (
        <div className="q-explain">
          {r.correct ? '✅ Đúng' : <>❌ {r.given == null || r.given === '' ? 'Chưa làm' : 'Sai'} — đáp án: <strong>{correctText()}</strong></>}
          {r.explain && <div className="small">{r.explain}</div>}
        </div>
      )}
    </div>
  );
}
