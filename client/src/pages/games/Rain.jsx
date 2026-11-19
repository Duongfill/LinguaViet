import { useCallback, useEffect, useRef, useState } from 'react';
import { scriptClass, useLang } from '../../lib/lang.jsx';
import { GameOver, GameStart, shuffle, useGameCards } from '../../components/GameKit.jsx';

const SLOTS = 6;
const LIVES = 3;

// 🌧️ Mưa từ: từ rơi xuống, chạm đúng nghĩa trước khi từ chạm đất
export default function Rain() {
  const { lang } = useLang();
  const { deck, setDeck, cards } = useGameCards(lang);
  const [phase, setPhase] = useState('start');
  const [, setTick] = useState(0);
  const g = useRef(null); // trạng thái ván chơi (đổi liên tục, không cần re-render từng thay đổi nhỏ)

  const start = () => {
    const pool = shuffle(cards);
    g.current = {
      pool, words: [], slots: shuffle(pool).slice(0, SLOTS), uid: 0,
      score: 0, lives: LIVES, combo: 0, level: 1, correct: 0, results: [],
      spawnIn: 600, last: performance.now(), flash: null, shake: null,
    };
    setPhase('play');
  };

  const randomCard = (exclude) => {
    const st = g.current;
    for (let k = 0; k < 30; k++) {
      const c = st.pool[Math.floor(Math.random() * st.pool.length)];
      if (!exclude.has(c.id)) return c;
    }
    return st.pool[0];
  };
  // Ô nghĩa của từ vừa biến mất → thay bằng nghĩa khác (không trùng từ đang rơi / ô khác)
  const refillSlot = (cardId) => {
    const st = g.current;
    const i = st.slots.findIndex((c) => c.id === cardId);
    if (i < 0) return;
    const busy = new Set([...st.words.map((w) => w.card.id), ...st.slots.map((c) => c.id)]);
    st.slots[i] = randomCard(busy);
  };
  const spawn = () => {
    const st = g.current;
    const active = new Set(st.words.map((w) => w.card.id));
    // Ưu tiên từ đang có sẵn trong ô nhưng chưa rơi; nếu không thì đặt nghĩa mới vào một ô "rảnh"
    let card = shuffle(st.slots).find((c) => !active.has(c.id));
    if (!card) return;
    if (Math.random() < 0.4) {
      const fresh = randomCard(new Set([...active, ...st.slots.map((c) => c.id)]));
      const free = st.slots.findIndex((c) => !active.has(c.id));
      if (free >= 0) { st.slots[free] = fresh; card = fresh; }
    }
    st.words.push({ uid: ++st.uid, card, y: -6, x: 4 + Math.random() * 62 });
  };

  // Vòng lặp chính
  useEffect(() => {
    if (phase !== 'play') return undefined;
    let raf;
    const step = (now) => {
      const st = g.current;
      const dt = Math.min(0.1, (now - st.last) / 1000);
      st.last = now;
      if (!document.hidden) {
        const speed = 7 + st.level * 1.6; // % chiều cao / giây
        for (const w of st.words) w.y += speed * dt;
        const fallen = st.words.filter((w) => w.y >= 100);
        for (const w of fallen) {
          st.lives -= 1; st.combo = 0;
          st.results.push({ card: w.card, ok: false });
          st.flash = { kind: 'miss', at: now };
        }
        if (fallen.length) {
          st.words = st.words.filter((w) => w.y < 100);
          fallen.forEach((w) => refillSlot(w.card.id));
        }
        st.spawnIn -= dt * 1000;
        const maxActive = Math.min(5, 1 + Math.ceil(st.level / 2));
        if (st.spawnIn <= 0 && st.words.length < maxActive) { spawn(); st.spawnIn = Math.max(800, 2600 - st.level * 180); }
        if (st.lives <= 0) { setPhase('over'); return; }
      }
      setTick((t) => t + 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = useCallback((i) => {
    const st = g.current;
    if (!st || phase !== 'play') return;
    const card = st.slots[i];
    const hits = st.words.filter((w) => w.card.id === card.id).sort((a, b) => b.y - a.y);
    if (hits.length) {
      const w = hits[0];
      st.words = st.words.filter((x) => x.uid !== w.uid);
      st.combo += 1; st.correct += 1;
      st.score += 10 * (1 + Math.floor(st.combo / 5)) + Math.round((100 - w.y) / 10);
      st.results.push({ card: w.card, ok: true });
      st.level = 1 + Math.floor(st.correct / 5);
      st.flash = { kind: 'hit', at: performance.now(), x: w.x, y: w.y };
      refillSlot(card.id);
    } else {
      st.combo = 0; st.score = Math.max(0, st.score - 5);
      st.shake = { i, at: performance.now() };
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'play') return undefined;
    const onKey = (e) => { const n = Number(e.key); if (n >= 1 && n <= SLOTS) tap(n - 1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, tap]);

  if (phase === 'start') {
    return <GameStart icon="🌧️" title="Mưa từ" lang={lang} deck={deck} setDeck={setDeck} cards={cards} onStart={start}
      rules={['Các từ rơi từ trên xuống — chạm ô NGHĨA đúng để xoá từ.', 'Từ chạm đất: mất 1 mạng (có 3 mạng).', 'Đúng liên tiếp 5, 10… lần: điểm nhân 2, 3…; xoá từ càng sớm càng nhiều điểm.', 'Máy tính: bấm phím 1–6 thay cho chạm.']} />;
  }
  const st = g.current;
  if (phase === 'over') {
    return <GameOver game="rain" lang={lang} score={st.score} correct={st.correct} total={st.results.length} results={st.results}
      extra={`cấp ${st.level}`} onReplay={start} />;
  }
  const now = performance.now();
  const missFlash = st.flash?.kind === 'miss' && now - st.flash.at < 350;
  return (
    <div className="stack page-narrow rain-game">
      <div className="rain-hud">
        <span>{'❤️'.repeat(st.lives)}{'🤍'.repeat(LIVES - st.lives)}</span>
        <span>Cấp {st.level}</span>
        {st.combo >= 3 && <span className="ok-text">🔥 ×{1 + Math.floor(st.combo / 5)} ({st.combo})</span>}
        <strong className="rain-score">{st.score}</strong>
      </div>
      <div className={`rain-field ${missFlash ? 'miss' : ''}`}>
        {st.words.map((w) => (
          <div key={w.uid} className={`rain-word ${w.y > 75 ? 'danger' : ''}`} style={{ left: `${w.x}%`, top: `${w.y}%` }}>
            <span className={scriptClass(lang)}>{w.card.term}</span>
            {lang !== 'en' && w.card.phonetic && <span className="small rain-read">{w.card.phonetic}</span>}
          </div>
        ))}
        {st.flash?.kind === 'hit' && now - st.flash.at < 400 && (
          <div className="rain-pop" style={{ left: `${st.flash.x}%`, top: `${st.flash.y}%` }}>✨</div>
        )}
        <div className="rain-ground" />
      </div>
      <div className="rain-slots">
        {st.slots.map((c, i) => (
          <button key={i} className={`rain-slot ${st.shake?.i === i && now - st.shake.at < 300 ? 'bad' : ''}`} onClick={() => tap(i)}>
            <span className="kbd-hint">{i + 1}</span>{c.meaning_vi}
          </button>
        ))}
      </div>
    </div>
  );
}
