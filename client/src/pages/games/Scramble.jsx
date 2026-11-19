import { useEffect, useMemo, useRef, useState } from 'react';
import { scriptClass, useLang } from '../../lib/lang.jsx';
import { speak } from '../../lib/speech.js';
import { GameOver, GameStart, shuffle, useGameCards } from '../../components/GameKit.jsx';

const ROUND = 10;
// Từ phù hợp để xếp: tiếng Anh 3–10 chữ cái; tiếng Trung 2–4 chữ Hán; tiếng Nhật 2–5 ký tự (không có ～)
const fits = (c, lang) => (lang === 'en' ? /^[A-Za-z]{3,10}$/.test(c.term)
  : lang === 'zh' ? /^\p{Script=Han}{2,4}$/u.test(c.term)
    : /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]{2,5}$/u.test(c.term));

// Mảnh chữ của một từ: tiếng Anh xáo các chữ cái; tiếng Trung/Nhật thêm 3 chữ gây nhiễu
function makeTiles(card, pool, lang) {
  const chars = [...(lang === 'en' ? card.term.toUpperCase() : card.term)];
  let tiles = chars;
  if (lang !== 'en') {
    const extra = shuffle(pool.flatMap((c) => [...c.term]).filter((ch) => !chars.includes(ch))).slice(0, 3);
    tiles = [...chars, ...new Set(extra)];
  }
  let out;
  for (let k = 0; k < 10; k++) { out = shuffle(tiles); if (out.slice(0, chars.length).join('') !== chars.join('')) break; }
  return out.map((ch, i) => ({ ch, i }));
}

// 🔤 Xếp chữ: ghép các chữ bị xáo trộn thành từ đúng theo nghĩa
export default function Scramble() {
  const { lang } = useLang();
  const { deck, setDeck, cards } = useGameCards(lang);
  const pool = useMemo(() => (cards || []).filter((c) => fits(c, lang)), [cards, lang]);
  const [phase, setPhase] = useState('start');
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [tiles, setTiles] = useState([]);
  const [built, setBuilt] = useState([]);   // chỉ số mảnh đã chọn
  const [hints, setHints] = useState(0);
  const [state, setState] = useState(null); // null | 'ok' | 'bad' | 'skip'
  const [score, setScore] = useState(0);
  const startedAt = useRef(0);
  const results = useRef([]);
  const card = queue[idx];
  const target = card ? [...(lang === 'en' ? card.term.toUpperCase() : card.term)] : [];

  const load = (q, i) => {
    setTiles(makeTiles(q[i], pool, lang)); setBuilt([]); setHints(0); setState(null);
    startedAt.current = Date.now();
  };
  const start = () => {
    const q = shuffle(pool).slice(0, ROUND);
    results.current = []; setScore(0); setQueue(q); setIdx(0); load(q, 0); setPhase('play');
  };
  const next = () => {
    if (idx + 1 >= queue.length) { setPhase('over'); return; }
    setIdx(idx + 1); load(queue, idx + 1);
  };
  const finish = (ok, kind) => {
    results.current.push({ card, ok });
    if (ok) {
      const secs = (Date.now() - startedAt.current) / 1000;
      setScore((s) => s + Math.max(20, Math.round(100 - secs * 3 - hints * 25)));
    }
    setState(kind);
    speak(card.term, lang);
    setTimeout(next, ok ? 900 : 1800);
  };

  // Đủ số chữ → tự kiểm tra
  useEffect(() => {
    if (phase !== 'play' || state || built.length !== target.length) return;
    const word = built.map((k) => tiles[k].ch).join('');
    if (word === target.join('')) finish(true, 'ok');
    else setState('bad');
  }, [built]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (state === 'bad') { const t = setTimeout(() => setState(null), 600); return () => clearTimeout(t); } return undefined; }, [state]);

  const pick = (k) => { if (state && state !== 'bad') return; if (!built.includes(k) && built.length < target.length) setBuilt((b) => [...b, k]); };
  const unpick = (pos) => { if (state === 'ok' || state === 'skip') return; setBuilt((b) => b.slice(0, pos)); };
  // Gợi ý: lần 1 hiện cách đọc; các lần sau điền sẵn chữ đúng tiếp theo
  const hint = () => {
    if (state) return;
    setHints((h) => h + 1);
    if (hints === 0 && card.phonetic && card.phonetic !== card.term) return;
    const okPrefix = [];
    for (let p = 0; p < built.length && tiles[built[p]].ch === target[p]; p++) okPrefix.push(built[p]);
    const need = target[okPrefix.length];
    const k = tiles.findIndex((t, j) => t.ch === need && !okPrefix.includes(j));
    if (k >= 0) setBuilt([...okPrefix, k]);
  };

  // Bàn phím (tiếng Anh): gõ chữ cái, Backspace xoá
  useEffect(() => {
    if (phase !== 'play' || lang !== 'en') return undefined;
    const onKey = (e) => {
      if (e.key === 'Backspace') { setBuilt((b) => b.slice(0, -1)); return; }
      const ch = e.key.toUpperCase();
      if (!/^[A-Z]$/.test(ch)) return;
      setBuilt((b) => {
        const k = tiles.findIndex((t, j) => t.ch === ch && !b.includes(j));
        return k >= 0 && b.length < target.length ? [...b, k] : b;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, lang, tiles, target.length]);

  if (phase === 'start') {
    return <GameStart icon="🔤" title="Xếp chữ" lang={lang} deck={deck} setDeck={setDeck} cards={pool} min={ROUND} onStart={start}
      rules={[lang === 'en' ? 'Xếp các chữ cái bị xáo trộn thành từ tiếng Anh đúng với nghĩa.' : 'Chọn đúng các chữ (có chữ gây nhiễu) và xếp thành từ đúng với nghĩa.',
        `${ROUND} từ mỗi ván; giải càng nhanh càng nhiều điểm.`, 'Gợi ý: lần đầu hiện cách đọc, sau đó điền sẵn từng chữ (mỗi lần trừ điểm).', lang === 'en' ? 'Máy tính: gõ chữ cái trên bàn phím, Backspace để xoá.' : 'Chạm chữ đã chọn để bỏ.']} />;
  }
  if (phase === 'over') {
    const correct = results.current.filter((r) => r.ok).length;
    return <GameOver game="scramble" lang={lang} score={score} correct={correct} total={results.current.length} results={results.current} onReplay={start} />;
  }
  return (
    <div className="stack page-narrow scr-game">
      <div className="rain-hud">
        <span>Từ {idx + 1}/{queue.length}</span>
        <strong className="rain-score">{score}</strong>
      </div>
      <div className="card stack center-text">
        <div className="tf-meaning">{card.meaning_vi}</div>
        {hints > 0 && card.phonetic && <div className={`phonetic ${scriptClass(lang)}`}>{card.phonetic}</div>}
        <div className={`scr-slots ${state || ''}`}>
          {target.map((_, p) => (
            <button key={p} className={`scr-slot ${scriptClass(lang)}`} onClick={() => unpick(p)} disabled={p >= built.length}>
              {state === 'skip' ? target[p] : built[p] != null ? tiles[built[p]].ch : ''}
            </button>
          ))}
        </div>
        <div className="scr-tiles">
          {tiles.map((t, k) => (
            <button key={k} className={`chip scr-tile ${scriptClass(lang)}`} disabled={built.includes(k) || state === 'ok' || state === 'skip'} onClick={() => pick(k)}>{t.ch}</button>
          ))}
        </div>
        {state === 'ok' && <div className="ok-text">✅ Chính xác!</div>}
        {state === 'skip' && <div className="muted">Đáp án: <strong className={scriptClass(lang)}>{card.term}</strong></div>}
        <div className="row center" style={{ marginTop: 0 }}>
          <button className="btn ghost sm" onClick={() => setBuilt([])} disabled={!built.length || !!state}>Xoá</button>
          <button className="btn sm" onClick={hint} disabled={!!state}>💡 Gợi ý</button>
          <button className="btn ghost sm" onClick={() => finish(false, 'skip')} disabled={!!state}>Bỏ qua ›</button>
        </div>
      </div>
    </div>
  );
}
