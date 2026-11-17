import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, logActivity } from '../lib/api.js';
import { useLang } from '../lib/lang.jsx';
import { useAuth } from '../lib/auth.jsx';
import { deckQuery } from '../lib/levels.js';
import { speak } from '../lib/speech.js';
import DeckPicker from '../components/DeckPicker.jsx';

const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};
// Bỏ dấu thanh pinyin / chữ thường / bỏ khoảng trắng (chấm từ tiếng Trung gõ bằng pinyin)
const loose = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ü/g, 'v').toLowerCase().replace(/[\s'’.,!?]/g, '');

// Tách câu thành các đơn vị để chấm: tiếng Anh theo từ, tiếng Trung theo chữ
function tokens(s, lang) {
  if (lang === 'zh') return [...s.replace(/[\s，。！？；：、“”‘’,.!?;:'"()（）…—-]/g, '')];
  return s.toLowerCase().replace(/[’]/g, "'").replace(/[^\p{L}\p{N}'\s-]/gu, ' ').split(/\s+/).filter(Boolean);
}

// So khớp dãy chuẩn với dãy người gõ (LCS): đánh dấu đơn vị nào của câu chuẩn đã gõ đúng
function diff(target, typed) {
  const n = target.length, m = typed.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = target[i] === typed[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (target[i] === typed[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  const same = dp[0][0];
  return { hit, score: Math.round((same / Math.max(n, m, 1)) * 100) };
}

// Hiển thị câu chuẩn: chữ gõ đúng màu xanh, gõ thiếu/sai màu đỏ (giữ nguyên dấu câu)
function Marked({ text, lang, hit }) {
  let k = 0;
  if (lang === 'zh') {
    return <span className="zh">{[...text].map((ch, i) => (tokens(ch, lang).length
      ? <span key={i} className={hit[k++] ? 'dict-ok' : 'dict-miss'}>{ch}</span> : <span key={i}>{ch}</span>))}</span>;
  }
  return <span>{text.split(/(\s+)/).map((part, i) => {
    const n = tokens(part, lang).length;
    if (!n) return <span key={i}>{part}</span>;
    const ok = hit.slice(k, k + n).every(Boolean);
    k += n;
    return <span key={i} className={ok ? 'dict-ok' : 'dict-miss'}>{part}</span>;
  })}</span>;
}

export default function Dictation() {
  const { lang } = useLang();
  const myLevel = useAuth().user.levels?.[lang];
  const [params] = useSearchParams();
  const [deck, setDeck] = useState(params.get('deck') || '');
  const [target, setTarget] = useState('sentence'); // sentence | word
  const [cards, setCards] = useState(null);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState(null);
  const [hint, setHint] = useState(false);
  const [stats, setStats] = useState({ n: 0, total: 0 });
  const inputRef = useRef(null);

  useEffect(() => {
    setCards(null);
    api(`/cards?lang=${lang}${deckQuery(deck, myLevel)}`).then((d) => setCards(d.cards)).catch(() => setCards([]));
  }, [lang, deck]); // eslint-disable-line react-hooks/exhaustive-deps

  const pool = useMemo(() => (cards || []).filter((c) => (target === 'sentence' ? c.example : c.term)), [cards, target]);
  useEffect(() => { setQueue(shuffle(pool).slice(0, 50)); setIdx(0); setTyped(''); setResult(null); setHint(false); setStats({ n: 0, total: 0 }); }, [pool]);

  const card = queue[idx];
  const text = card ? (target === 'sentence' ? card.example : card.term) : '';
  const meaning = card ? (target === 'sentence' ? card.example_vi : card.meaning_vi) : '';

  // Tự đọc khi sang câu mới
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => speak(text, lang, target === 'sentence' ? 0.85 : 0.9), 250);
    inputRef.current?.focus();
    return () => clearTimeout(t);
  }, [text, lang, target]);

  const check = (e) => {
    e.preventDefault();
    if (result || !typed.trim()) return;
    let res = diff(tokens(text, lang), tokens(typed, lang));
    // Từ tiếng Trung: chấp nhận gõ pinyin không dấu
    if (lang === 'zh' && target === 'word' && card.phonetic && loose(typed) === loose(card.phonetic)) {
      res = { hit: tokens(text, lang).map(() => true), score: 100 };
    }
    setResult(res);
    setStats((s) => ({ n: s.n + 1, total: s.total + res.score }));
    logActivity({ kind: 'quiz', lang, cardId: card.id, correct: res.score >= 80, score: res.score });
  };

  const next = () => {
    setIdx((i) => (i + 1 < queue.length ? i + 1 : 0));
    if (idx + 1 >= queue.length) setQueue(shuffle(pool).slice(0, 50));
    setTyped(''); setResult(null); setHint(false);
  };

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>🎧 Nghe chép chính tả</h2>
        <DeckPicker lang={lang} value={deck} onChange={setDeck} />
        <div className="seg">
          <button className={target === 'sentence' ? 'active' : ''} onClick={() => setTarget('sentence')}>Câu</button>
          <button className={target === 'word' ? 'active' : ''} onClick={() => setTarget('word')}>Từ</button>
        </div>
      </div>

      {cards === null && <div className="muted">Đang tải…</div>}
      {cards && !card && <div className="card center-text muted">Phạm vi này chưa có {target === 'sentence' ? 'câu ví dụ' : 'từ'} nào để luyện.</div>}

      {card && (
        <div className="card dictation center-text">
          <div className="muted small">
            {target === 'sentence' ? 'Câu' : 'Từ'} {idx + 1}/{queue.length}
            {stats.n > 0 && <> · Điểm trung bình {Math.round(stats.total / stats.n)}</>}
          </div>
          <div className="row center" style={{ marginTop: 0 }}>
            <button className="btn primary" onClick={() => speak(text, lang, target === 'sentence' ? 0.85 : 0.9)}>🔊 Nghe</button>
            <button className="btn" onClick={() => speak(text, lang, 0.55)}>🐢 Chậm</button>
            <button className="btn ghost" onClick={() => setHint((h) => !h)}>{hint ? 'Ẩn gợi ý' : '💡 Gợi ý nghĩa'}</button>
          </div>
          {hint && <div className="muted">{meaning}</div>}

          <form onSubmit={check} className="type-form">
            {target === 'sentence' ? (
              <textarea ref={inputRef} rows={2} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!result}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) check(e); }}
                placeholder={lang === 'zh' ? 'Gõ lại câu bằng chữ Hán…' : 'Gõ lại câu bạn nghe được…'} lang={lang === 'zh' ? 'zh-CN' : 'en'} />
            ) : (
              <input ref={inputRef} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!result}
                placeholder={lang === 'zh' ? 'Gõ chữ Hán hoặc pinyin…' : 'Gõ từ bạn nghe được…'} lang={lang === 'zh' ? 'zh-CN' : 'en'} />
            )}
            {!result && <button className="btn primary">Kiểm tra</button>}
          </form>

          {result && (
            <div className={`feedback ${result.score >= 90 ? 'ok' : result.score >= 60 ? 'warn' : 'bad'}`}>
              <div className="score">{result.score}<span className="small">/100</span></div>
              <div className="dict-answer"><Marked text={text} lang={lang} hit={result.hit} /></div>
              {card.phonetic && target === 'word' && <div className="muted small">{card.phonetic}</div>}
              <div className="muted small">{meaning}</div>
              <div className="small">Bạn gõ: “{typed}”</div>
              <button className="btn primary" onClick={next} autoFocus>Tiếp ›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
