import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, logActivity } from '../lib/api.js';
import { useLang, scriptClass } from '../lib/lang.jsx';
import { useAuth } from '../lib/auth.jsx';
import { deckQuery } from '../lib/levels.js';
import { listen, scorePronunciation, stopListening, sttSupported } from '../lib/speech.js';
import DeckPicker from '../components/DeckPicker.jsx';
import SpeakButton from '../components/SpeakButton.jsx';

export default function Speak() {
  const { lang } = useLang();
  const myLevel = useAuth().user.levels?.[lang];
  const [params] = useSearchParams();
  const [deck, setDeck] = useState(params.get('deck') || ''); // ?deck=weak từ trang "Từ hay quên"
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [target, setTarget] = useState('word'); // word | sentence
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const recRef = useRef(null);
  // Mỗi lần bấm mic / đổi thẻ tăng số phiên; kết quả của phiên cũ bị bỏ qua
  const sessionRef = useRef(0);

  const cancelRecording = () => {
    sessionRef.current++;
    recRef.current?.abort();
    recRef.current = null;
    stopListening();
    setRecording(false);
  };

  useEffect(() => {
    cancelRecording();
    api(`/cards?lang=${lang}${deckQuery(deck, myLevel)}`).then((d) => { setCards(d.cards); setIdx(0); setResult(null); setError(''); });
  }, [lang, deck]);

  // Rời trang: tắt mic
  useEffect(() => () => { sessionRef.current++; recRef.current?.abort(); stopListening(); }, []);

  const card = cards[idx];
  const text = card ? (target === 'sentence' && card.example ? card.example : card.term) : '';

  const record = async () => {
    // Đang nghe mà bấm lại → dừng và chấm phần đã nói
    if (recording) { recRef.current?.stop(); return; }
    if (!card) return;
    const session = ++sessionRef.current;
    const cardNow = card, textNow = text;
    setError('');
    setResult(null);
    setRecording(true);
    try {
      const r = listen(lang, { manual: true });
      recRef.current = r;
      const { transcripts, aborted } = await r.promise;
      if (session !== sessionRef.current || aborted) return;
      if (!transcripts.length) throw new Error('Không nghe thấy giọng nói, hãy bấm mic và đọc lại.');
      // Tiếng Nhật: máy có thể nghe ra chữ Hán hoặc kana → chấm theo cả cách viết lẫn cách đọc, lấy điểm cao hơn
      const targets = lang === 'ja' && target === 'word' && cardNow.phonetic ? [textNow, cardNow.phonetic] : [textNow];
      const res = targets.map((t) => scorePronunciation(t, transcripts, lang)).sort((a, b) => b.score - a.score)[0];
      setResult(res);
      logActivity({ kind: 'speak', lang, cardId: cardNow.id, correct: res.score >= 80, score: res.score });
    } catch (e) {
      if (session === sessionRef.current) setError(e.message);
    } finally {
      if (session === sessionRef.current) { recRef.current = null; setRecording(false); }
    }
  };

  const next = (d) => {
    cancelRecording();
    setIdx((i) => (i + d + cards.length) % cards.length);
    setResult(null);
    setError('');
  };

  const switchTarget = (t) => { cancelRecording(); setTarget(t); setResult(null); setError(''); };

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
    <div className="stack speak-page page-narrow">
      <div className="toolbar">
        <h2>Luyện phát âm</h2>
        <DeckPicker lang={lang} value={deck} onChange={setDeck} />
        <div className="seg">
          <button className={target === 'word' ? 'active' : ''} onClick={() => switchTarget('word')}>Từ</button>
          <button className={target === 'sentence' ? 'active' : ''} onClick={() => switchTarget('sentence')}>Câu ví dụ</button>
        </div>
      </div>

      {card && (
        <div className="card speak center-text">
          <div className="speak-word">
            <div className="muted small">{idx + 1}/{cards.length}</div>
            <div className={`term ${scriptClass(lang)} ${target === 'sentence' ? 'sentence' : ''}`}>{text}</div>
            {target === 'word' && <div className="phonetic">{card.phonetic}</div>}
            <div className="muted">{target === 'sentence' ? card.example_vi : card.meaning_vi}</div>
            <div className="row center listen-row">
              <SpeakButton text={text} lang={lang} label="Nghe mẫu" />
              <SpeakButton text={text} lang={lang} slow label="Chậm" />
            </div>
          </div>

          {/* Cụm điều khiển: ngay dưới từ; trên điện thoại dính ở đáy màn hình */}
          <div className="speak-controls">
            <button className="btn ghost nav-btn" onClick={() => next(-1)} aria-label="Từ trước">‹ Trước</button>
            <button className={`mic ${recording ? 'on' : ''}`} onClick={record} aria-label={recording ? 'Bấm để dừng' : 'Bấm để nói'}>
              {recording ? '⏹' : '🎤'}
            </button>
            <button className="btn ghost nav-btn" onClick={() => next(1)} aria-label="Từ sau">Sau ›</button>
            <div className="muted small mic-hint">{recording ? 'Đang nghe… đọc xong thì bấm ⏹ để dừng và chấm điểm' : 'Bấm micro để bắt đầu, đọc xong bấm lại để dừng'}</div>
          </div>
          {error && <div className="error">{error}</div>}
          {result && (
            <div className={`feedback ${verdict(result.score)[1]}`}>
              <div className="score">{result.score}<span className="small">/100</span></div>
              <div>{verdict(result.score)[0]}</div>
              <div className="small">Máy nghe được: “<span className={scriptClass(lang)}>{result.heard}</span>”</div>
              <button className="btn primary sm" onClick={() => next(1)}>Từ tiếp theo ›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
