import { useEffect, useRef, useState } from 'react';
import { api, logActivity } from '../lib/api.js';
import { useLang } from '../lib/lang.jsx';
import { useAuth } from '../lib/auth.jsx';
import { deckQuery } from '../lib/levels.js';
import { listen, scorePronunciation, sttSupported } from '../lib/speech.js';
import DeckPicker from '../components/DeckPicker.jsx';
import SpeakButton from '../components/SpeakButton.jsx';

export default function Speak() {
  const { lang } = useLang();
  const myLevel = useAuth().user.levels?.[lang];
  const [deck, setDeck] = useState('');
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [target, setTarget] = useState('word'); // word | sentence
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const recRef = useRef(null);

  useEffect(() => {
    api(`/cards?lang=${lang}${deckQuery(deck, myLevel)}`).then((d) => { setCards(d.cards); setIdx(0); setResult(null); });
  }, [lang, deck]);

  useEffect(() => () => recRef.current?.abort(), []);

  const card = cards[idx];
  const text = card ? (target === 'sentence' && card.example ? card.example : card.term) : '';

  const record = async () => {
    setError('');
    setResult(null);
    setRecording(true);
    try {
      const r = listen(lang);
      recRef.current = r;
      const { transcripts } = await r.promise;
      if (!transcripts.length) throw new Error('Không nghe thấy giọng nói, hãy thử lại');
      const res = scorePronunciation(text, transcripts, lang);
      setResult(res);
      logActivity({ kind: 'speak', lang, cardId: card.id, correct: res.score >= 80, score: res.score });
    } catch (e) {
      setError(e.message);
    } finally {
      setRecording(false);
    }
  };

  const next = (d) => { setIdx((i) => (i + d + cards.length) % cards.length); setResult(null); setError(''); };

  if (!sttSupported()) {
    return (
      <div className="card">
        <h2>Luyện phát âm</h2>
        <p>Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Hãy dùng <strong>Google Chrome</strong> hoặc <strong>Microsoft Edge</strong>.</p>
      </div>
    );
  }

  const verdict = (s) => (s >= 90 ? ['Tuyệt vời!', 'ok'] : s >= 70 ? ['Khá tốt, gần đúng rồi', 'warn'] : ['Chưa chuẩn, thử lại nhé', 'bad']);

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>Luyện phát âm</h2>
        <DeckPicker lang={lang} value={deck} onChange={setDeck} />
        <div className="seg">
          <button className={target === 'word' ? 'active' : ''} onClick={() => { setTarget('word'); setResult(null); }}>Từ</button>
          <button className={target === 'sentence' ? 'active' : ''} onClick={() => { setTarget('sentence'); setResult(null); }}>Câu ví dụ</button>
        </div>
      </div>

      {card && (
        <div className="card speak center-text">
          <div className="muted small">{idx + 1}/{cards.length}</div>
          <div className={`term ${lang === 'zh' ? 'zh' : ''} ${target === 'sentence' ? 'sentence' : ''}`}>{text}</div>
          {target === 'word' && <div className="phonetic">{card.phonetic}</div>}
          <div className="muted">{target === 'sentence' ? card.example_vi : card.meaning_vi}</div>
          <div className="row center">
            <SpeakButton text={text} lang={lang} label="Nghe mẫu" />
            <SpeakButton text={text} lang={lang} slow label="Chậm" />
          </div>
          <button className={`mic ${recording ? 'on' : ''}`} onClick={record} disabled={recording} aria-label="Bấm để nói">
            {recording ? '🎙️' : '🎤'}
          </button>
          <div className="muted small">{recording ? 'Đang nghe… hãy đọc to và rõ' : 'Bấm micro rồi đọc'}</div>
          {error && <div className="error">{error}</div>}
          {result && (
            <div className={`feedback ${verdict(result.score)[1]}`}>
              <div className="score">{result.score}<span className="small">/100</span></div>
              <div>{verdict(result.score)[0]}</div>
              <div className="small">Máy nghe được: “<span className={lang === 'zh' ? 'zh' : ''}>{result.heard}</span>”</div>
            </div>
          )}
          <div className="row center">
            <button className="btn ghost" onClick={() => next(-1)}>‹ Trước</button>
            <button className="btn ghost" onClick={() => next(1)}>Sau ›</button>
          </div>
        </div>
      )}
    </div>
  );
}
