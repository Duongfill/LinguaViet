import { useEffect, useState } from 'react';
import { useLang, scriptClass } from '../../lib/lang.jsx';
import { speak } from '../../lib/speech.js';
import { phoneticOf, wordOf } from '../../data/kids.js';
import { KidsHeader, TopicBar, sfx, useTopic } from '../../components/KidsKit.jsx';

const RATE = 0.8;

// 🖼️ Xem hình & nghe: chạm hình để nghe, mũi tên chuyển hình, có chế độ tự chạy
export default function KidsLearn() {
  const { lang } = useLang();
  const [topic, setTopic] = useTopic();
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(false);
  const [jig, setJig] = useState(0);
  const items = topic.items;
  const it = items[idx % items.length];

  useEffect(() => { setIdx(0); }, [topic.key]);
  const say = () => { speak(wordOf(it, lang), lang, RATE); setJig((j) => j + 1); };
  const go = (d) => { sfx.tap(); setIdx((i) => (i + d + items.length) % items.length); };

  // Mỗi lần đổi hình thì đọc luôn (nếu trình duyệt cho phép)
  useEffect(() => { speak(wordOf(it, lang), lang, RATE); }, [idx, topic.key, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!auto) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), 3800);
    return () => clearInterval(t);
  }, [auto, items.length]);
  useEffect(() => () => { try { speechSynthesis.cancel(); } catch { /* bỏ qua */ } }, []);

  return (
    <div className="kids-wrap page-narrow">
      <KidsHeader title="Xem hình & nghe" />
      <TopicBar topic={topic} onChange={setTopic} />
      <button className="kid-card" onClick={say} aria-label="Nghe lại">
        <span key={jig} className={`kid-emoji ${it.digit ? 'count' : ''}`}>{it.emoji}</span>
        {it.digit && <span className="kid-digit">{it.digit}</span>}
        <span className={`kid-word ${scriptClass(lang)}`}>{wordOf(it, lang)}</span>
        {phoneticOf(it, lang) && <span className="kid-phon">{phoneticOf(it, lang)}</span>}
        <span className="kid-vi">{it.vi}</span>
        <span className="kid-speaker">🔊</span>
      </button>
      <div className="kid-nav">
        <button className="kid-round" onClick={() => go(-1)} aria-label="Hình trước">◀</button>
        <button className={`kid-round auto ${auto ? 'on' : ''}`} onClick={() => { sfx.tap(); setAuto((a) => !a); }} aria-label="Tự chạy">{auto ? '⏸' : '▶'}</button>
        <button className="kid-round" onClick={() => go(1)} aria-label="Hình sau">▶</button>
      </div>
      <div className="kid-dots">{items.map((_, i) => <span key={i} className={i === idx % items.length ? 'on' : ''} />)}</div>
    </div>
  );
}
