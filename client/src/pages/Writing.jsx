import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { INPUT_LANG, LANG_INFO, scriptClass, useLang } from '../lib/lang.jsx';
import { useAuth } from '../lib/auth.jsx';
import { LEVELS_BY_LANG, levelShort } from '../lib/levels.js';
import SpeakButton from '../components/SpeakButton.jsx';
import { WritingTask, countWords } from '../components/ExamWriting.jsx';

// Độ dài: tiếng Anh đếm từ, tiếng Trung / Nhật đếm chữ
const measure = (s, lang) => (lang === 'en' ? countWords(s) : (s.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu) || []).length);
const unit = (lang) => (lang === 'en' ? 'từ' : 'chữ');
// Từ có xuất hiện trong bài (tiếng Anh nhận cả dạng chia; tiếng Nhật nhận gốc động/tính từ)
function usedIn(text, term, lang) {
  const t = text.toLowerCase(), w = term.toLowerCase().replace(/^to /, '').replace(/[～〜]/g, '').trim();
  if (!w) return false;
  if (t.includes(w)) return true;
  if (lang === 'en') { const st = w.length > 4 ? w.replace(/(e|y|ies|es|s)$/, '') : w; return st.length >= 3 && new RegExp(`\\b${st.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t); }
  if (lang === 'ja') { const b = w.replace(/[うくぐすつぬぶむるい]$/u, ''); return b !== w && b.length >= 1 && t.includes(b); }
  return false;
}
const fmtDate = (s) => new Date(s.replace(' ', 'T') + 'Z').toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function Writing() {
  const { lang } = useLang();
  const [params, setParams] = useSearchParams();
  const tabs = [['sentences', '✏️ Đặt câu'], ['daily', '📝 Theo chủ đề'], ...(lang === 'en' ? [['ielts', '🎓 IELTS']] : []), ['journal', '📔 Nhật ký']];
  const tab = tabs.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'sentences';
  return (
    <div className="stack page-narrow">
      <div className="toolbar">
        <h2>🖊️ Luyện viết {LANG_INFO[lang].label}</h2>
      </div>
      <div className="seg seg-wrap">
        {tabs.map(([k, label]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setParams({ tab: k })}>{label}</button>)}
      </div>
      {tab === 'sentences' && <Sentences key={lang} lang={lang} />}
      {tab === 'daily' && <Daily key={lang} lang={lang} />}
      {tab === 'ielts' && <IeltsList />}
      {tab === 'journal' && <Journal key={lang} lang={lang} />}
    </div>
  );
}

// ---------- Đặt câu với từ đã học ----------
function Sentences({ lang }) {
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [showEx, setShowEx] = useState({});
  const load = () => {
    setData(null); setText(''); setResult(null); setShowEx({});
    api(`/writing/words?lang=${lang}&n=3`).then(setData).catch(() => setData({ words: [] }));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  const words = data?.words || [];
  const usedNow = words.filter((w) => usedIn(text, w.term, lang)).length;
  const submit = async () => {
    const r = await api('/writing/sentences', { method: 'POST', body: { lang, cardIds: words.map((w) => w.id), text } }).catch((e) => alert(e.message));
    if (r) setResult(r);
  };
  if (!data) return <div className="muted">Đang tải…</div>;
  return (
    <div className="stack">
      <p className="muted small" style={{ margin: 0 }}>
        Viết 1–3 câu dùng cả 3 từ bên dưới{data.fromLearned ? ' (lấy từ những từ bạn đã học)' : ' (theo trình độ của bạn)'}. Mỗi từ dùng đúng được cộng XP.
      </p>
      <div className="ws-words">
        {words.map((w) => {
          const ok = usedIn(text, w.term, lang);
          return (
            <div key={w.id} className={`card ws-word ${ok ? 'ok' : ''}`}>
              <div><strong className={scriptClass(lang)}>{w.term}</strong> {ok && '✓'} <SpeakButton text={w.term} lang={lang} /></div>
              <div className="small muted">{w.phonetic}</div>
              <div className="small">{w.meaning_vi}</div>
              {w.example && (showEx[w.id]
                ? <div className="small ws-ex"><span className={scriptClass(lang)}>{w.example}</span><div className="muted">{w.example_vi}</div></div>
                : <button className="btn ghost sm" onClick={() => setShowEx((s) => ({ ...s, [w.id]: true }))}>Xem câu ví dụ</button>)}
            </div>
          );
        })}
      </div>
      <textarea className="w-text tw-short" rows={5} value={text} disabled={!!result} onChange={(e) => setText(e.target.value)}
        lang={INPUT_LANG[lang]} placeholder={`Viết câu ${LANG_INFO[lang].label} của bạn…`} />
      <div className="w-meta">
        <span className={usedNow === words.length ? 'ok-text' : 'muted'}>Đã dùng {usedNow}/{words.length} từ</span>
        {!result ? <button className="btn primary" disabled={!text.trim()} onClick={submit}>Nộp</button>
          : <button className="btn primary" onClick={load}>Bộ từ khác ›</button>}
      </div>
      {result && (
        <div className={`feedback ${result.used.length === words.length ? 'ok' : 'warn'}`}>
          <div>{result.used.length === words.length ? '🎉 Dùng đủ cả 3 từ!' : `Dùng được ${result.used.length}/${words.length} từ.`} +{result.used.length * 10} XP</div>
          <div className="small">Tự đọc lại câu của bạn và so với câu ví dụ của từng từ để kiểm tra ngữ pháp. Bài đã lưu vào Nhật ký.</div>
        </div>
      )}
    </div>
  );
}

// ---------- Viết theo chủ đề ----------
function Daily({ lang }) {
  const myLevel = useAuth().user.levels?.[lang];
  const [prompts, setPrompts] = useState(null);
  const [level, setLevel] = useState(myLevel || '');
  const [open, setOpen] = useState(null);
  useEffect(() => { api(`/writing/daily?lang=${lang}`).then((d) => setPrompts(d.prompts)).catch(() => setPrompts([])); }, [lang, open]);
  if (!prompts) return <div className="muted">Đang tải…</div>;
  if (!prompts.length) return <div className="card muted">Chưa có đề viết cho {LANG_INFO[lang].label}.</div>;
  if (open) return <DailyTask lang={lang} p={prompts.find((x) => x.id === open)} onBack={() => setOpen(null)} />;
  const shown = prompts.filter((p) => !level || p.level === level);
  return (
    <div className="stack">
      <div className="chips">
        <button className={!level ? 'active' : ''} onClick={() => setLevel('')}>Tất cả</button>
        {LEVELS_BY_LANG[lang].filter((l) => prompts.some((p) => p.level === l)).map((l) => (
          <button key={l} className={level === l ? 'active' : ''} onClick={() => setLevel(l)}>{levelShort(l)}</button>
        ))}
      </div>
      <div className="ws-grid">
        {shown.map((p) => (
          <button key={p.id} className="card ws-prompt" onClick={() => setOpen(p.id)}>
            <div className="row" style={{ marginTop: 0 }}><span className="badge">{levelShort(p.level)}</span>{p.done > 0 && <span className="small ok-text">✓ đã viết {p.done}</span>}</div>
            <strong>{p.topic_vi}</strong>
            <span className="small muted">{p.prompt_vi}</span>
            <span className="small muted">Tối thiểu {p.min} {unit(lang)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DailyTask({ lang, p, onBack }) {
  const key = `langapp.daily.${p.id}`;
  const [text, setText] = useState(() => { try { return localStorage.getItem(key) || ''; } catch { return ''; } });
  const [result, setResult] = useState(null);
  useEffect(() => { try { localStorage.setItem(key, text); } catch { /* bỏ qua */ } }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  const len = measure(text, lang);
  const submit = async () => {
    if (len < p.min && !window.confirm(`Bài mới ${len}/${p.min} ${unit(lang)}. Vẫn nộp?`)) return;
    const r = await api(`/writing/daily/${p.id}`, { method: 'POST', body: { text, length: len } }).catch((e) => alert(e.message));
    if (r) { setResult(r); try { localStorage.removeItem(key); } catch { /* bỏ qua */ } }
  };
  return (
    <div className="stack">
      <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={onBack}>← Danh sách đề</button>
      <div className="card stack">
        <div className="row" style={{ marginTop: 0 }}><span className="badge">{levelShort(p.level)}</span><strong>{p.topic_vi}</strong></div>
        <div className={`w-prompt ${scriptClass(lang)}`}>{p.prompt}</div>
        <div className="small muted">{p.prompt_vi}</div>
        <div className="ws-useful">
          {p.useful.map((u) => <span key={u.term} className="chip-word" title={u.meaning_vi}><span className={scriptClass(lang)}>{u.term}</span> <span className="muted small">· {u.meaning_vi}</span></span>)}
        </div>
      </div>
      <div className="card stack">
        <textarea className="w-text" rows={10} value={text} disabled={!!result} onChange={(e) => setText(e.target.value)} lang={INPUT_LANG[lang]}
          placeholder="Viết bài của bạn (bài nháp tự lưu trên máy này)…" />
        <div className="w-meta">
          <span className={len >= p.min ? 'ok-text' : 'muted'}>{len} / {p.min} {unit(lang)}</span>
          {!result ? <button className="btn primary" disabled={!text.trim()} onClick={submit}>Nộp & xem đoạn mẫu</button>
            : <button className="btn" onClick={onBack}>Đề khác ›</button>}
        </div>
      </div>
      {result && (
        <div className="card stack">
          <h3>📄 Đoạn mẫu <SpeakButton text={result.sample} lang={lang} /></h3>
          <div className={`w-sample ${scriptClass(lang)}`}>{result.sample}</div>
          <div className="w-notes small">{result.sample_vi}</div>
          <div className="small muted">So sánh bài của bạn với đoạn mẫu: ý chính, từ nối, cụm từ hay có thể học. Bài đã lưu vào Nhật ký.</div>
        </div>
      )}
    </div>
  );
}

// ---------- Ngân hàng IELTS Writing ----------
const TYPE = { bar: 'Biểu đồ cột', line: 'Biểu đồ đường', pie: 'Biểu đồ tròn', table: 'Bảng', process: 'Quy trình', opinion: 'Opinion', discussion: 'Discussion', 'problem-solution': 'Problem–Solution', 'advantages-disadvantages': 'Adv–Disadv', 'two-part': 'Two-part' };
function IeltsList() {
  const [items, setItems] = useState(null);
  const [task, setTask] = useState(1);
  useEffect(() => { api('/writing/ielts').then((d) => setItems(d.items)).catch(() => setItems([])); }, []);
  if (!items) return <div className="muted">Đang tải…</div>;
  return (
    <div className="stack">
      <div className="seg" style={{ alignSelf: 'flex-start' }}>
        <button className={task === 1 ? 'active' : ''} onClick={() => setTask(1)}>Task 1 ({items.filter((x) => x.task === 1).length})</button>
        <button className={task === 2 ? 'active' : ''} onClick={() => setTask(2)}>Task 2 ({items.filter((x) => x.task === 2).length})</button>
      </div>
      <p className="muted small" style={{ margin: 0 }}>Đề tự soạn theo dạng IELTS Academic. Viết xong xem bài mẫu band 7–8 và tự chấm 4 tiêu chí. Đề đầy đủ (cả Reading/Listening) ở mục 📝 Luyện đề.</p>
      <div className="ws-grid">
        {items.filter((x) => x.task === task).map((x) => (
          <Link key={x.id} to={`/writing/ielts/${x.id}`} className="card ws-prompt">
            <div className="row" style={{ marginTop: 0 }}><span className="badge">{TYPE[x.type] || x.type}</span>{x.mine?.best != null && <span className="small ok-text">Band {x.mine.best}</span>}</div>
            <strong>{x.title}</strong>
            {x.mine && <span className="small muted">Đã viết {x.mine.n} lần</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function IeltsBankTask() {
  const { id } = useParams();
  const nav = useNavigate();
  const [item, setItem] = useState(null);
  useEffect(() => { api(`/writing/ielts/${id}`).then((d) => setItem(d.item)).catch(() => nav('/writing?tab=ielts')); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!item) return <div className="muted">Đang tải…</div>;
  return (
    <div className="stack page-narrow exam-run">
      <div className="exam-bar">
        <Link to="/writing?tab=ielts" className="btn ghost sm">←</Link>
        <div className="exam-bar-title"><strong>IELTS Writing Task {item.task}</strong> · {item.title}</div>
      </div>
      <WritingTask task={item.task} prompt={item.prompt} chart={item.chart} minWords={item.task === 1 ? 150 : 250}
        draftKey={`langapp.writing.bank.${item.id}`}
        onSubmit={(text, durationSec) => api(`/writing/ielts/${item.id}`, { method: 'POST', body: { text, durationSec } })}
        onSaveBand={(r, band) => api(`/writing/entries/${r.attemptId}`, { method: 'PATCH', body: { selfScore: band } })} />
    </div>
  );
}

// ---------- Nhật ký ----------
const KIND = { sentences: '✏️ Đặt câu', prompt: '📝 Theo chủ đề', ielts: '🎓 IELTS' };
function Journal({ lang }) {
  const [entries, setEntries] = useState(null);
  const [open, setOpen] = useState(null);
  const load = () => api(`/writing/journal?lang=${lang}`).then((d) => setEntries(d.entries)).catch(() => setEntries([]));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const total = useMemo(() => (entries || []).reduce((s, e) => s + measure(e.text, lang), 0), [entries, lang]);
  const remove = async (e) => {
    if (!window.confirm('Xoá bài viết này khỏi nhật ký?')) return;
    await api(`/writing/entries/${e.id}`, { method: 'DELETE' }).catch(() => {});
    load();
  };
  if (!entries) return <div className="muted">Đang tải…</div>;
  if (!entries.length) return <div className="card muted">Chưa có bài viết nào. Hãy thử tab Đặt câu hoặc Theo chủ đề.</div>;
  return (
    <div className="stack">
      <div className="muted small">{entries.length} bài · tổng {total.toLocaleString('vi-VN')} {unit(lang)}</div>
      {entries.map((e) => (
        <div key={e.id} className="card ws-entry">
          <button className="deck-head" onClick={() => setOpen(open === e.id ? null : e.id)}>
            <div>
              <strong>{KIND[e.kind] || e.kind}</strong>{e.title && <span> · {e.title}</span>}
              <div className="small muted">{fmtDate(e.created_at)} · {measure(e.text, lang)} {unit(lang)}
                {e.kind === 'sentences' && e.meta && ` · dùng ${e.meta.used}/${e.meta.cards?.length} từ (${e.meta.cards?.join(', ')})`}
                {e.self_score != null && ` · tự chấm ${e.self_score}`}</div>
            </div>
            <span className="small muted">{open === e.id ? '▲' : '▼'}</span>
          </button>
          {open === e.id && (
            <>
              <div className={`w-sample ${scriptClass(lang)}`}>{e.text}</div>
              <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => remove(e)}>🗑 Xoá</button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
