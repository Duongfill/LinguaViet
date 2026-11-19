import { useCallback, useEffect, useRef, useState } from 'react';
import { scriptClass, useLang } from '../../lib/lang.jsx';
import { speak } from '../../lib/speech.js';
import { GameOver, GameStart, shuffle, useGameCards } from '../../components/GameKit.jsx';

const SECONDS = 60;
const PENALTY = 2; // giây bị trừ khi trả lời sai

// ⚡ Đúng hay Sai: từ và nghĩa có khớp không? 60 giây, đúng liên tiếp để nhân điểm
export default function TrueFalse() {
  const { lang } = useLang();
  const { deck, setDeck, cards } = useGameCards(lang);
  const [phase, setPhase] = useState('start');
  const [q, setQ] = useState(null);       // { card, shown (thẻ có nghĩa được hiện), truth }
  const [stat, setStat] = useState({ score: 0, combo: 0, correct: 0 });
  const [endAt, setEndAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [fb, setFb] = useState(null);     // phản hồi ngắn: 'ok' | 'bad'
  const [sound, setSound] = useState(true);
  const results = useRef([]);
  const order = useRef([]);

  const nextQ = useCallback(() => {
    if (!order.current.length) order.current = shuffle(cards);
    const card = order.current.pop();
    const truth = Math.random() < 0.5;
    let shown = card;
    if (!truth) {
      do { shown = cards[Math.floor(Math.random() * cards.length)]; } while (shown.id === card.id);
    }
    setQ({ card, shown, truth });
    if (sound) speak(card.term, lang);
  }, [cards, lang, sound]);

  const start = () => {
    results.current = []; order.current = shuffle(cards);
    setStat({ score: 0, combo: 0, correct: 0 });
    setEndAt(Date.now() + SECONDS * 1000); setNow(Date.now());
    setPhase('play'); nextQ();
  };

  useEffect(() => {
    if (phase !== 'play') return undefined;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [phase]);
  const left = Math.max(0, endAt - now);
  useEffect(() => { if (phase === 'play' && left <= 0) setPhase('over'); }, [left, phase]);

  const answer = useCallback((saysTrue) => {
    if (phase !== 'play' || !q) return;
    const ok = saysTrue === q.truth;
    results.current.push({ card: q.card, ok });
    setStat((s) => {
      const combo = ok ? s.combo + 1 : 0;
      return { score: s.score + (ok ? 10 * (1 + Math.floor(combo / 5)) : 0), combo, correct: s.correct + (ok ? 1 : 0) };
    });
    if (!ok) setEndAt((e) => e - PENALTY * 1000);
    setFb({ kind: ok ? 'ok' : 'bad', at: Date.now(), q });
    nextQ();
  }, [phase, q, nextQ]);

  useEffect(() => {
    if (phase !== 'play') return undefined;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft' || e.key === '1') answer(true);
      if (e.key === 'ArrowRight' || e.key === '2') answer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, answer]);

  if (phase === 'start') {
    return (
      <>
        <GameStart icon="⚡" title="Đúng hay Sai" lang={lang} deck={deck} setDeck={setDeck} cards={cards} onStart={start}
          rules={[`${SECONDS} giây: mỗi lượt hiện một từ và một nghĩa — bấm ĐÚNG nếu khớp, SAI nếu không.`, `Đúng liên tiếp 5, 10… câu: điểm nhân 2, 3…; trả lời sai bị trừ ${PENALTY} giây.`, 'Máy tính: phím ← (Đúng) / → (Sai).']} />
        <label className="small inline page-narrow" style={{ margin: '0 auto' }}><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Đọc to từ khi hiện</label>
      </>
    );
  }
  if (phase === 'over') {
    return <GameOver game="truefalse" lang={lang} score={stat.score} correct={stat.correct} total={results.current.length} results={results.current} onReplay={start} />;
  }
  const showFb = fb && Date.now() - fb.at < 900;
  return (
    <div className="stack page-narrow tf-game">
      <div className="rain-hud">
        <span className={left < 10000 ? 'error-text' : ''}>⏱ {Math.ceil(left / 1000)}s</span>
        {stat.combo >= 3 && <span className="ok-text">🔥 ×{1 + Math.floor(stat.combo / 5)} ({stat.combo})</span>}
        <strong className="rain-score">{stat.score}</strong>
      </div>
      <div className="tf-bar"><div style={{ width: `${(left / (SECONDS * 1000)) * 100}%` }} /></div>
      {q && (
        <div className={`card tf-card ${showFb ? fb.kind : ''}`}>
          <div className={`term ${scriptClass(lang)}`}>{q.card.term}</div>
          {lang !== 'en' && <div className="phonetic">{q.card.phonetic}</div>}
          <div className="tf-eq">=</div>
          <div className="tf-meaning">{q.shown.meaning_vi}</div>
        </div>
      )}
      <div className="tf-buttons">
        <button className="btn ok big" onClick={() => answer(true)}><span className="kbd-hint">←</span>✓ Đúng</button>
        <button className="btn danger big" onClick={() => answer(false)}><span className="kbd-hint">→</span>✗ Sai</button>
      </div>
      {showFb && fb.kind === 'bad' && (
        <div className="small muted center-text">
          Vừa rồi: <strong className={scriptClass(lang)}>{fb.q.card.term}</strong> = {fb.q.card.meaning_vi}
        </div>
      )}
    </div>
  );
}
