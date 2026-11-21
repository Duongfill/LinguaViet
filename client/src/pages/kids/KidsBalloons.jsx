import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang, scriptClass } from '../../lib/lang.jsx';
import { speak } from '../../lib/speech.js';
import { wordOf } from '../../data/kids.js';
import { KidsHeader, StarRow, TopicBar, addStars, burstAt, sfx, shuffle, useBursts, useTimers, useTopic } from '../../components/KidsKit.jsx';

const ROUNDS = 8;
const BALLOONS = 4;
const RATE = 0.8;
const COLORS = ['#ff7a8a', '#ffb347', '#6cc4ff', '#8bd66f', '#c58cff', '#ffd84d'];

function makeRound(items, avoidId) {
  let target;
  do { target = items[Math.floor(Math.random() * items.length)]; } while (items.length > 1 && target.id === avoidId);
  const others = shuffle(items.filter((x) => x.id !== target.id)).slice(0, BALLOONS - 1);
  const colors = shuffle(COLORS);
  return { target, balloons: shuffle([target, ...others]).map((it, i) => ({ it, color: colors[i] })) };
}

// 🎈 Bắn bóng bay: nghe từ, chạm quả bóng có hình đúng — bóng nổ và có pháo hoa
export default function KidsBalloons() {
  const { lang } = useLang();
  const [topic, setTopic] = useTopic();
  const [round, setRound] = useState(0);
  const [q, setQ] = useState(null);
  const [popped, setPopped] = useState(null);  // id bóng đã nổ
  const [wobble, setWobble] = useState(null);  // id bóng chạm sai
  const [firstTry, setFirstTry] = useState(0);
  const [missed, setMissed] = useState(false);
  const [done, setDone] = useState(false);
  const [addBurst, burstLayer] = useBursts();
  const wrap = useRef(null);
  const later = useTimers();

  const start = () => {
    setRound(0); setFirstTry(0); setMissed(false); setDone(false); setPopped(null); setWobble(null);
    const r = makeRound(topic.items, null); setQ(r);
    later(() => speak(wordOf(r.target, lang), lang, RATE), 400);
  };
  useEffect(start, [topic.key, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = () => q && speak(wordOf(q.target, lang), lang, RATE);

  const tap = (b, e) => {
    if (popped || done) return;
    if (b.it.id === q.target.id) {
      sfx.pop(); later(sfx.ok, 120); burstAt(e, wrap.current, addBurst);
      setPopped(b.it.id);
      speak(wordOf(q.target, lang), lang, RATE);
      const nextFirst = firstTry + (missed ? 0 : 1);
      if (!missed) setFirstTry(nextFirst);
      later(() => {
        if (round + 1 >= ROUNDS) { sfx.win(); addStars(lang, nextFirst); setDone(true); return; }
        const r = makeRound(topic.items, q.target.id);
        setQ(r); setRound(round + 1); setPopped(null); setMissed(false);
        later(() => speak(wordOf(r.target, lang), lang, RATE), 400);
      }, 1700);
    } else {
      sfx.no(); setMissed(true); setWobble(b.it.id);
      later(() => { setWobble(null); say(); }, 700);
    }
  };

  if (done) {
    return (
      <div className="kids-wrap page-narrow" ref={wrap}>
        <KidsHeader title="Bắn bóng bay" />
        <div className="kid-card done">
          <div className="kid-emoji">🎈🎉🎈</div>
          <h2>Bé giỏi lắm!</h2>
          <StarRow n={firstTry} total={ROUNDS} />
          <div className="kid-vi">{firstTry}/{ROUNDS} bóng đúng ngay lần đầu</div>
          <div className="kid-nav">
            <button className="kid-round wide" onClick={start}>🔄 Chơi lại</button>
            <Link className="kid-round wide" to="/kids">🏠 Về trang bé</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kids-wrap page-narrow" ref={wrap}>
      <KidsHeader title="Bắn bóng bay" />
      <TopicBar topic={topic} onChange={setTopic} />
      {q && (
        <>
          <div className="kid-progress"><div style={{ width: `${(round / ROUNDS) * 100}%` }} /></div>
          <button className="kid-ask" onClick={say}>
            <span className="kid-speaker big">🔊</span>
            <span className={`kid-word ${scriptClass(lang)}`}>{wordOf(q.target, lang)}</span>
          </button>
          <div className="balloon-sky" key={`${topic.key}-${round}`}>
            {q.balloons.map((b, i) => (
              <button key={b.it.id} className={`balloon ${popped === b.it.id ? 'pop' : ''} ${wobble === b.it.id ? 'wobble' : ''}`}
                style={{ '--c': b.color, animationDelay: `${i * 0.15}s`, '--bob': `${2.4 + i * 0.4}s` }} onClick={(e) => tap(b, e)} aria-label="Bóng bay">
                <span className="balloon-body"><span className={`kid-emoji ${b.it.digit ? 'count' : ''}`}>{b.it.emoji}</span>{b.it.digit && <span className="kid-digit">{b.it.digit}</span>}</span>
                <span className="balloon-string" />
              </button>
            ))}
          </div>
        </>
      )}
      {burstLayer}
    </div>
  );
}
