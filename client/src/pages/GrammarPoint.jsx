import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { INPUT_LANG, scriptClass, toHiragana, useLang } from '../lib/lang.jsx';
import { levelShort } from '../lib/levels.js';
import { shuffle } from '../lib/compare.jsx';
import SpeakButton from '../components/SpeakButton.jsx';
import { FormulaBlocks, Highlight, Timeline, keyWordsOf, tokenize, wrongIndexes } from '../components/GrammarKit.jsx';

const L = 'ABCD';
// So khớp: bỏ dấu câu, khoảng trắng, hoa thường; tiếng Nhật coi katakana = hiragana
const flat = (s) => toHiragana(String(s)).toLowerCase().normalize('NFC').replace(/[’]/g, "'").replace(/[\s\p{P}\p{S}]/gu, '');

// **in đậm** trong văn bản giải thích
function Rich({ text }) {
  return text.split(/\n{2,}/).map((para, i) => (
    <p key={i}>{para.split(/(\*\*[^*]+\*\*)/g).map((s, k) => (s.startsWith('**') ? <strong key={k}>{s.slice(2, -2)}</strong> : <Fragment key={k}>{s}</Fragment>))}</p>
  ));
}

export default function GrammarPoint() {
  const { id } = useParams();
  const nav = useNavigate();
  const { lang } = useLang();
  const [d, setD] = useState(null);
  const [mode, setMode] = useState('learn'); // learn | practice | spot
  const [inSrs, setInSrs] = useState(false);
  useEffect(() => {
    setD(null); setMode('learn'); window.scrollTo(0, 0);
    api(`/grammar/point/${id}`).then((x) => { setD(x); setInSrs(!!x.srs); }).catch(() => nav('/grammar'));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <div className="muted">Đang tải…</div>;
  const p = d.point;
  const kw = keyWordsOf(p, lang);
  const addSrs = () => api('/grammar/review/add', { method: 'POST', body: { point_id: p.id } }).then(() => setInSrs(true)).catch(() => {});
  if (p.lang !== lang) return <div className="card">Bài này thuộc ngôn ngữ khác. <Link to="/grammar">← Danh sách ngữ pháp</Link></div>;

  return (
    <div className="stack page-narrow gr-point">
      <div className="exam-bar">
        <Link to="/grammar" className="btn ghost sm">←</Link>
        <div className="exam-bar-title"><span className="badge">{levelShort(p.level)}</span> <strong>{p.title}</strong></div>
        {d.mine && <span className="small muted">Cao nhất {d.mine.best}%</span>}
      </div>

      {mode === 'learn' ? (
        <>
          <div className="card stack">
            <div><h2 style={{ margin: 0 }}>{p.emoji && <span className="gk-emoji">{p.emoji} </span>}{p.title}</h2><div className={`gr-native ${scriptClass(lang)}`}>{p.title_native}</div></div>
            <div className="muted">{p.summary_vi}</div>
            {p.tip && <div className="gk-tip"><span className="gk-tip-ico">💡</span><div><strong>Mẹo nhớ</strong><div>{p.tip}</div></div></div>}
            <FormulaBlocks formulas={p.formula} lang={lang} />
            {p.timeline && <Timeline kind={p.timeline} />}
            <details className="gk-more"><summary>📖 Xem giải thích chi tiết</summary><div className="gr-explain"><Rich text={p.explain_vi} /></div></details>
          </div>
          <div className="card stack">
            <h3>📌 Ví dụ</h3>
            {p.examples.map((e, i) => (
              <div key={i} className="gr-ex">
                <div><span className={scriptClass(lang)}><Highlight text={e.t} words={kw} lang={lang} /></span> <SpeakButton text={e.t} lang={lang} /></div>
                {(e.py || e.r) && <div className={`small gr-read ${scriptClass(lang)}`}>{e.py || e.r}</div>}
                <div className="small muted">{e.vi}</div>
              </div>
            ))}
          </div>
          <div className="card stack">
            <h3>⚠️ Lỗi hay gặp</h3>
            {p.mistakes.map((m, i) => (
              <div key={i} className="gr-mistake">
                <div className={scriptClass(lang)}>❌ <s>{m.wrong}</s></div>
                <div className={scriptClass(lang)}>✅ {m.right}</div>
                <div className="small muted">{m.note_vi}</div>
              </div>
            ))}
          </div>
          <button className="btn primary wide" onClick={() => { setMode('practice'); window.scrollTo(0, 0); }}>✍️ Làm bài tập ({p.exercises.length} câu)</button>
          <div className="row" style={{ marginTop: 0 }}>
            {p.mistakes.length > 0 && <button className="btn" onClick={() => { setMode('spot'); window.scrollTo(0, 0); }}>🔎 Tìm lỗi sai ({p.mistakes.length})</button>}
            <button className="btn" disabled={inSrs} onClick={addSrs}>{inSrs ? '🧠 Đã có trong thẻ ôn' : '🧠 Thêm vào thẻ ôn'}</button>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            {d.prev ? <Link className="btn ghost sm" to={`/grammar/${d.prev.id}`}>‹ {d.prev.title}</Link> : <span />}
            {d.next && <Link className="btn ghost sm" to={`/grammar/${d.next.id}`}>{d.next.title} ›</Link>}
          </div>
        </>
      ) : mode === 'spot' ? (
        <SpotError key={p.id} p={p} lang={lang} onBack={() => setMode('learn')} onPractice={() => setMode('practice')} />
      ) : (
        <Practice key={p.id} p={p} lang={lang} next={d.next} onBack={() => setMode('learn')}
          onSaved={(r) => setD((x) => ({ ...x, mine: { ...(x.mine || {}), best: Math.max(x.mine?.best || 0, r.pct), last: r.pct } }))} />
      )}
    </div>
  );
}

function Practice({ p, lang, next, onBack, onSaved }) {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [state, setState] = useState(null); // null | { ok, given }
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState([]); // chỉ số mảnh đã chọn (order)
  const [done, setDone] = useState(null);
  const x = p.exercises[i];
  const order = useMemo(() => (x?.type === 'order' ? shuffle(x.words.map((w, k) => ({ w, k }))) : []), [i]); // eslint-disable-line react-hooks/exhaustive-deps
  const cjk = lang !== 'en';

  const check = (given) => {
    let ok = false;
    if (x.type === 'mcq') ok = given === x.answer;
    if (x.type === 'gap') ok = x.answer.some((a) => flat(a) === flat(given));
    if (x.type === 'order') ok = flat(given) === flat(x.answer);
    setState({ ok, given });
    if (ok) setScore((s) => s + 1);
  };
  const go = async () => {
    if (i + 1 < p.exercises.length) { setI(i + 1); setState(null); setTyped(''); setPicked([]); return; }
    const r = await api(`/grammar/point/${p.id}/result`, { method: 'POST', body: { correct: score } }).catch(() => null);
    setDone(r || { pct: Math.round((score / p.exercises.length) * 100), correct: score, total: p.exercises.length });
    if (r) onSaved(r);
  };

  if (done) {
    return (
      <div className={`card result-card ${done.pct >= 70 ? 'good' : done.pct >= 50 ? 'mid' : 'low'}`}>
        <div className="result-main"><div className="score">{done.pct}%</div><div>{done.correct}/{done.total} câu đúng · +{done.correct * 10} XP</div></div>
        <div>{done.pct >= 90 ? '🏆 Nắm chắc rồi!' : done.pct >= 70 ? '👍 Khá tốt — bài đã tính là hoàn thành.' : '💪 Nên đọc lại phần giải thích rồi làm lại. Bài sẽ nằm trong mục "Cần ôn lại".'}</div>
        <div className="row" style={{ marginTop: 0 }}>
          <button className="btn" onClick={onBack}>📖 Xem lại bài</button>
          <button className="btn" onClick={() => { setI(0); setScore(0); setState(null); setTyped(''); setPicked([]); setDone(null); }}>↻ Làm lại</button>
          {next && <Link className="btn primary" to={`/grammar/${next.id}`}>Bài tiếp: {next.title} ›</Link>}
        </div>
      </div>
    );
  }

  const builtText = picked.map((k) => x.words[k]).join(cjk ? '' : ' ');
  return (
    <div className="card stack">
      <div className="muted small">Câu {i + 1}/{p.exercises.length} · Đúng {score}
        {' · '}{x.type === 'mcq' ? 'Chọn đáp án đúng' : x.type === 'gap' ? 'Điền vào chỗ trống' : 'Sắp xếp thành câu đúng'}</div>

      {x.type !== 'order' && <div className={`gr-q ${scriptClass(lang)}`}>{x.q.split(/_{3,}/).map((s, k, arr) => <Fragment key={k}>{s}{k < arr.length - 1 && <span className="blank-mark">{state && x.type === 'gap' ? x.answer[0] : '____'}</span>}</Fragment>)}</div>}

      {x.type === 'mcq' && (
        <div className="options">
          {x.options.map((o, k) => {
            let cls = '';
            if (state) cls = k === x.answer ? 'right' : k === state.given ? 'wrong' : 'dim';
            return <button key={k} className={`option ${cls}`} disabled={!!state} onClick={() => check(k)}><span className="kbd-hint">{k + 1}</span><span className={scriptClass(lang)}>{o}</span></button>;
          })}
        </div>
      )}

      {x.type === 'gap' && (
        <form className="type-form" onSubmit={(e) => { e.preventDefault(); if (!state && typed.trim()) check(typed); }}>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!state} lang={INPUT_LANG[lang]} autoFocus
            autoCapitalize="off" autoComplete="off" spellCheck={false} placeholder="Gõ đáp án…" />
          {!state && <button className="btn primary" disabled={!typed.trim()}>Kiểm tra</button>}
        </form>
      )}

      {x.type === 'order' && (
        <>
          <div className="small muted">{x.vi}</div>
          <div className={`tr-answer ${state ? (state.ok ? 'ok' : 'bad') : ''}`}>
            {picked.length === 0 && <span className="muted small">Chạm các mảnh bên dưới theo đúng thứ tự…</span>}
            {picked.map((k) => <button key={k} className={`chip ${scriptClass(lang)}`} disabled={!!state} onClick={() => setPicked((a) => a.filter((z) => z !== k))}>{x.words[k]}</button>)}
          </div>
          <div className="tr-bank">
            {order.map(({ w, k }) => <button key={k} className={`chip ${scriptClass(lang)}`} disabled={!!state || picked.includes(k)} onClick={() => setPicked((a) => [...a, k])}>{w}</button>)}
          </div>
          {!state && <div className="row center" style={{ marginTop: 0 }}>
            <button className="btn ghost" disabled={!picked.length} onClick={() => setPicked([])}>Xoá hết</button>
            <button className="btn primary" disabled={picked.length !== x.words.length} onClick={() => check(builtText)}>Kiểm tra</button>
          </div>}
        </>
      )}

      {state && (
        <div className={`feedback ${state.ok ? 'ok' : 'bad'}`}>
          <div>{state.ok ? '✅ Chính xác!' : '❌ Chưa đúng.'}{!state.ok && <> Đáp án: <strong className={scriptClass(lang)}>
            {x.type === 'mcq' ? `${L[x.answer]}. ${x.options[x.answer]}` : x.type === 'gap' ? x.answer.join(' / ') : x.answer}</strong></>}</div>
          {x.type === 'order' && <SpeakButton text={x.answer} lang={lang} label="Nghe câu đúng" />}
          <div className="small">{x.explain}</div>
          <button className="btn primary" onClick={go} autoFocus>{i + 1 < p.exercises.length ? 'Tiếp ›' : 'Xem kết quả'}</button>
        </div>
      )}
    </div>
  );
}

// 🔎 Tìm lỗi sai: chạm vào chỗ sai trong câu; câu thiếu từ thì chọn câu đúng
function SpotError({ p, lang, onBack, onPractice }) {
  const items = useMemo(() => shuffle(p.mistakes.map((m) => {
    const toks = tokenize(m.wrong, lang);
    const bad = wrongIndexes(m.wrong, m.right, lang);
    const spot = bad.length > 0 && bad.length <= Math.max(2, Math.floor(toks.length / 2));
    const options = spot ? null : shuffle([m.right, m.wrong, ...p.mistakes.filter((x) => x !== m).map((x) => x.right).slice(0, 1)]);
    return { m, toks, bad, spot, options };
  })), [p.id, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [res, setRes] = useState(null); // { ok, tapped }
  const it = items[i];

  const answer = (ok, tapped) => { if (res) return; setRes({ ok, tapped }); if (ok) setScore((x) => x + 1); };
  const next = () => { setI(i + 1); setRes(null); };

  if (!it) {
    return (
      <div className="card result-card good">
        <div className="result-main"><div className="score">{score}/{items.length}</div><div>lỗi tìm đúng</div></div>
        <div className="row" style={{ marginTop: 0 }}>
          <button className="btn" onClick={onBack}>📖 Xem lại bài</button>
          <button className="btn" onClick={() => { setI(0); setScore(0); setRes(null); }}>↻ Chơi lại</button>
          <button className="btn primary" onClick={onPractice}>✍️ Làm bài tập</button>
        </div>
      </div>
    );
  }
  return (
    <div className="card stack">
      <div className="muted small">Lỗi {i + 1}/{items.length} · Đúng {score} · {it.spot ? 'Chạm vào chỗ SAI trong câu' : 'Chọn câu ĐÚNG'}</div>
      {it.spot ? (
        <div className={`gk-spot ${scriptClass(lang)}`}>
          {it.toks.map((t, k) => {
            const isBad = it.bad.includes(k);
            const cls = res ? (isBad ? 'bad' : res.tapped === k ? 'miss' : '') : '';
            return <button key={k} className={`gk-tok ${cls}`} disabled={!!res} onClick={() => answer(isBad, k)}>{t}</button>;
          })}
        </div>
      ) : (
        <div className="options">
          {it.options.map((o, k) => {
            const right = o === it.m.right;
            const cls = res ? (right ? 'right' : res.tapped === k ? 'wrong' : 'dim') : '';
            return <button key={k} className={`option ${cls}`} disabled={!!res} onClick={() => answer(right, k)}><span className={scriptClass(lang)}>{o}</span></button>;
          })}
        </div>
      )}
      {res && (
        <div className={`feedback ${res.ok ? 'ok' : 'bad'}`}>
          <div>{res.ok ? '✅ Đúng rồi!' : '❌ Chưa đúng.'}</div>
          <div className={scriptClass(lang)}>❌ <s>{it.m.wrong}</s></div>
          <div className={scriptClass(lang)}>✅ {it.m.right} <SpeakButton text={it.m.right} lang={lang} /></div>
          <div className="small">{it.m.note_vi}</div>
          <button className="btn primary" onClick={next} autoFocus>{i + 1 < items.length ? 'Tiếp ›' : 'Xem kết quả'}</button>
        </div>
      )}
    </div>
  );
}
