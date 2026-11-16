import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { api, logActivity } from '../lib/api.js';
import { speak } from '../lib/speech.js';
import DeckPicker from '../components/DeckPicker.jsx';
import { useAuth } from '../lib/auth.jsx';
import { deckQuery } from '../lib/levels.js';
import SpeakButton from '../components/SpeakButton.jsx';

const SIZE = 240;
const isHan = (ch) => /\p{Script=Han}/u.test(ch);

export default function Hanzi() {
  const myLevel = useAuth().user.levels?.zh;
  const [deck, setDeck] = useState('');
  const [cards, setCards] = useState([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [mode, setMode] = useState('watch'); // watch | write
  const [status, setStatus] = useState('');
  const [showOutline, setShowOutline] = useState(true);
  const boxRef = useRef(null);
  const writerRef = useRef(null);

  useEffect(() => {
    api(`/cards?lang=zh${deckQuery(deck, myLevel)}`).then((d) => { setCards(d.cards); setCardIdx(0); setCharIdx(0); });
  }, [deck]);

  const card = cards[cardIdx];
  const chars = card ? [...card.term].filter(isHan) : [];
  const ch = chars[charIdx];

  useEffect(() => {
    if (!ch || !boxRef.current) return;
    boxRef.current.innerHTML = '';
    setStatus('');
    let cancelled = false;
    const writer = HanziWriter.create(boxRef.current, ch, {
      width: SIZE, height: SIZE, padding: 10,
      showOutline: mode === 'watch' || showOutline,
      showCharacter: false,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 250,
      strokeColor: '#2f6fed',
      radicalColor: '#e0565b',
      highlightColor: '#22a06b',
      drawingWidth: 22,
      showHintAfterMisses: 3,
      onLoadCharDataError: () => !cancelled && setStatus('⚠️ Không tải được dữ liệu nét chữ (cần kết nối mạng).'),
    });
    writerRef.current = writer;

    if (mode === 'watch') {
      writer.animateCharacter();
    } else {
      let mistakes = 0;
      writer.quiz({
        onMistake: () => { mistakes++; },
        onComplete: (s) => {
          const total = s.totalMistakes ?? mistakes;
          setStatus(total === 0 ? '🎉 Hoàn hảo! Không sai nét nào.' : `✅ Xong! Sai ${total} nét.`);
          logActivity({ kind: 'hanzi', lang: 'zh', cardId: card.id, correct: total <= 2, score: Math.max(0, 100 - total * 15) });
          speak(ch, 'zh');
        },
      });
    }
    return () => { cancelled = true; };
  }, [ch, mode, showOutline, card?.id]);

  const go = (delta) => {
    if (charIdx + delta >= 0 && charIdx + delta < chars.length) return setCharIdx(charIdx + delta);
    const ni = (cardIdx + delta + cards.length) % cards.length;
    setCardIdx(ni);
    setCharIdx(delta > 0 ? 0 : [...cards[ni].term].filter(isHan).length - 1);
  };

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>Luyện viết chữ Hán</h2>
        <DeckPicker lang="zh" value={deck} onChange={setDeck} />
        <div className="seg">
          <button className={mode === 'watch' ? 'active' : ''} onClick={() => setMode('watch')}>👀 Xem thứ tự nét</button>
          <button className={mode === 'write' ? 'active' : ''} onClick={() => setMode('write')}>✍️ Tự viết</button>
        </div>
      </div>

      {card && (
        <div className="card hanzi-layout">
          <div>
            <div className="hanzi-box" ref={boxRef} style={{ width: SIZE, height: SIZE }} />
            <div className="row">
              <button className="btn ghost" onClick={() => go(-1)}>‹ Trước</button>
              {mode === 'watch'
                ? <button className="btn" onClick={() => writerRef.current?.animateCharacter()}>↻ Xem lại</button>
                : <button className="btn" onClick={() => setShowOutline((v) => !v)}>{showOutline ? 'Ẩn nét mờ' : 'Hiện nét mờ'}</button>}
              <button className="btn ghost" onClick={() => go(1)}>Sau ›</button>
            </div>
            {status && <div className="feedback ok">{status}</div>}
          </div>
          <div className="hanzi-info">
            <div className="zh term">{[...card.term].map((c, i) => (
              <span key={i} className={chars[charIdx] === c && chars.indexOf(c) === charIdx ? 'hl' : ''}>{c}</span>
            ))}</div>
            <div className="phonetic">{card.phonetic} <SpeakButton text={card.term} lang="zh" /> <SpeakButton text={card.term} lang="zh" slow /></div>
            <div className="meaning">{card.meaning_vi}</div>
            <div className="example">{card.example}<div className="muted">{card.example_vi}</div></div>
            <p className="muted small">
              {mode === 'watch'
                ? 'Quan sát thứ tự nét (nét đỏ là bộ thủ). Sau đó chuyển sang "Tự viết" để luyện.'
                : 'Dùng chuột hoặc ngón tay viết từng nét theo đúng thứ tự. Sai 3 lần sẽ có gợi ý.'}
            </p>
            <div className="muted small">Thẻ {cardIdx + 1}/{cards.length} · Chữ {charIdx + 1}/{chars.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}
