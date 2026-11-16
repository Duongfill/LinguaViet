import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useLang } from '../lib/lang.jsx';
import { useAuth } from '../lib/auth.jsx';
import { deckQuery } from '../lib/levels.js';
import { speak } from '../lib/speech.js';
import DeckPicker from '../components/DeckPicker.jsx';
import SpeakButton from '../components/SpeakButton.jsx';

const GRADES = [
  { grade: 0, label: 'Quên', key: '1', cls: 'danger' },
  { grade: 3, label: 'Khó', key: '2', cls: 'warn' },
  { grade: 4, label: 'Nhớ', key: '3', cls: 'ok' },
  { grade: 5, label: 'Dễ', key: '4', cls: 'primary' },
];

export default function Flashcards() {
  const { lang } = useLang();
  const myLevel = useAuth().user.levels?.[lang];
  const [deck, setDeck] = useState('');
  const [queue, setQueue] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState({ total: 0, ok: 0 });
  const [autoSpeak, setAutoSpeak] = useState(true);

  const load = useCallback(() => {
    setQueue(null);
    setFlipped(false);
    setDone({ total: 0, ok: 0 });
    api(`/review/due?lang=${lang}&limit=20${deckQuery(deck, myLevel, 'min')}`).then((d) => setQueue(d.cards));
  }, [lang, deck]);
  useEffect(load, [load]);

  const card = queue?.[0];

  useEffect(() => {
    if (card && autoSpeak) speak(card.term, lang);
  }, [card?.id, queue?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = useCallback(async (grade) => {
    if (!card) return;
    const rest = queue.slice(1);
    // Thẻ bị "Quên" được đưa lại cuối hàng đợi để ôn lại trong phiên
    setQueue(grade < 3 ? [...rest, card] : rest);
    setFlipped(false);
    setDone((d) => ({ total: d.total + 1, ok: d.ok + (grade >= 3 ? 1 : 0) }));
    api('/review', { method: 'POST', body: { cardId: card.id, grade } }).catch(() => {});
  }, [card, queue]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); setFlipped((f) => !f); }
      const g = GRADES.find((x) => x.key === e.key);
      if (g && flipped) answer(g.grade);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, flipped]);

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>Flashcard</h2>
        <DeckPicker lang={lang} value={deck} onChange={setDeck} myLabel="Từ trình độ của tôi trở lên" />
        <label className="small inline"><input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} /> Tự phát âm</label>
      </div>

      {queue === null && <div className="muted">Đang tải…</div>}

      {queue && !card && (
        <div className="card center-text">
          <h3>🎉 Hoàn thành!</h3>
          <p>Bạn đã ôn {done.total} lượt, nhớ {done.ok} lượt. Không còn thẻ đến hạn.</p>
          <button className="btn primary" onClick={load}>Tải thêm thẻ</button>
        </div>
      )}

      {card && (
        <>
          <div className="muted small">Còn {queue.length} thẻ {card.isNew && <span className="badge">Mới</span>}</div>
          <div className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((f) => !f)}
            role="button" tabIndex={0} aria-label="Lật thẻ">
            <div className="face front">
              <div className={`term ${lang === 'zh' ? 'zh' : ''}`}>{card.term}</div>
              <SpeakButton text={card.term} lang={lang} />
              <div className="muted small hint">Bấm vào thẻ hoặc phím Space để lật</div>
            </div>
            <div className="face back">
              <div className={`term sm ${lang === 'zh' ? 'zh' : ''}`}>{card.term}</div>
              <div className="phonetic">{card.phonetic}</div>
              <div className="meaning">{card.meaning_vi}</div>
              {card.example && (
                <div className="example">
                  <div>{card.example} <SpeakButton text={card.example} lang={lang} /></div>
                  <div className="muted">{card.example_vi}</div>
                </div>
              )}
            </div>
          </div>
          {flipped ? (
            <div className="grades">
              {GRADES.map((g) => (
                <button key={g.grade} className={`btn ${g.cls}`} onClick={() => answer(g.grade)}>
                  {g.label} <span className="kbd">{g.key}</span>
                </button>
              ))}
            </div>
          ) : (
            <button className="btn primary wide" onClick={() => setFlipped(true)}>Xem đáp án</button>
          )}
        </>
      )}
    </div>
  );
}
