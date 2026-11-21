import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang, scriptClass } from '../../lib/lang.jsx';
import { speak } from '../../lib/speech.js';
import { wordOf } from '../../data/kids.js';
import { KidsHeader, StarRow, TopicBar, addStars, burstAt, sfx, shuffle, useBursts, useTimers, useTopic } from '../../components/KidsKit.jsx';

const ROUNDS = 8;
const CHOICES = 3;
const RATE = 0.8;

function makeRound(items, avoidId) {
  let target;
  do { target = items[Math.floor(Math.random() * items.length)]; } while (items.length > 1 && target.id === avoidId);
  const others = shuffle(items.filter((x) => x.id !== target.id)).slice(0, CHOICES - 1);
  return { target, choices: shuffle([target, ...others]) };
}

// 🎯 Chọn đúng hình: nghe từ rồi chạm đúng hình. Sai không bị phạt, bé được nghe lại và chọn tiếp.
export default function KidsPick() {
  const { lang } = useLang();
  const [topic, setTopic] = useTopic();
  const [round, setRound] = useState(0);
  const [q, setQ] = useState(null);
  const [state, setState] = useState(null);   // { ok: id } | { bad: id } | null
  const [firstTry, setFirstTry] = useState(0);
  const [missed, setMissed] = useState(false);
  const [done, setDone] = useState(false);
  const [addBurst, burstLayer] = useBursts();
  const wrap = useRef(null);
  const later = useTimers();

  const start = () => {
    setRound(0); setFirstTry(0); setMissed(false); setDone(false); setState(null);
    const r = makeRound(topic.items, null); setQ(r);
    later(() => speak(wordOf(r.target, lang), lang, RATE), 300);
  };
  useEffect(start, [topic.key, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const say = () => q && speak(wordOf(q.target, lang), lang, RATE);

  const choose = (c, e) => {
    if (state?.ok || done) return;
    if (c.id === q.target.id) {
      sfx.ok(); burstAt(e, wrap.current, addBurst);
      setState({ ok: c.id });
      speak(wordOf(q.target, lang), lang, RATE);
      const gained = missed ? 0 : 1;
      const nextFirst = firstTry + gained;
      if (gained) setFirstTry(nextFirst);
      later(() => {
        if (round + 1 >= ROUNDS) { sfx.win(); addStars(lang, nextFirst); setDone(true); return; }
        const r = makeRound(topic.items, q.target.id);
        setQ(r); setRound(round + 1); setState(null); setMissed(false);
        later(() => speak(wordOf(r.target, lang), lang, RATE), 250);
      }, 1700);
    } else {
      sfx.no(); setMissed(true); setState({ bad: c.id });
      later(() => { setState(null); say(); }, 800);
    }
  };

  if (done) {
    return (
      <div className="kids-wrap page-narrow" ref={wrap}>
        <KidsHeader title="Chọn đúng hình" />
        <div className="kid-card done">
          <div className="kid-emoji">🎉</div>
          <h2>Giỏi quá!</h2>
          <StarRow n={firstTry} total={ROUNDS} />
          <div className="kid-vi">{firstTry}/{ROUNDS} hình đúng ngay lần đầu</div>
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
      <KidsHeader title="Chọn đúng hình" />
      <TopicBar topic={topic} onChange={setTopic} />
      {q && (
        <>
          <div className="kid-progress"><div style={{ width: `${(round / ROUNDS) * 100}%` }} /></div>
          <button className="kid-ask" onClick={say}>
            <span className="kid-speaker big">🔊</span>
            <span className={`kid-word ${scriptClass(lang)}`}>{state?.ok ? wordOf(q.target, lang) : '?'}</span>
          </button>
          <div className="kid-choices">
            {q.choices.map((c) => (
              <button key={c.id} onClick={(e) => choose(c, e)}
                className={`kid-choice ${state?.ok === c.id ? 'ok' : ''} ${state?.bad === c.id ? 'bad' : ''} ${state?.ok && state.ok !== c.id ? 'dim' : ''}`}>
                <span className={`kid-emoji ${c.digit ? 'count' : ''}`}>{c.emoji}</span>
                {c.digit && <span className="kid-digit">{c.digit}</span>}
              </button>
            ))}
          </div>
        </>
      )}
      {burstLayer}
    </div>
  );
}
