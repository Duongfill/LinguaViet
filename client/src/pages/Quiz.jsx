import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, logActivity } from '../lib/api.js';
import { useLang, INPUT_LANG, isCJK, scriptClass, toHiragana } from '../lib/lang.jsx';
import { useAuth } from '../lib/auth.jsx';
import { deckQuery } from '../lib/levels.js';
import { speak } from '../lib/speech.js';
import DeckPicker from '../components/DeckPicker.jsx';
import SpeakButton from '../components/SpeakButton.jsx';

const MODES = {
  meaning: 'Từ → chọn nghĩa',
  reverse: 'Nghĩa → chọn từ',
  listen: 'Nghe → chọn từ',
  type: 'Nghĩa → gõ từ',
};
const QUESTIONS = 10;

const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};
// Bỏ dấu thanh pinyin / chữ thường / bỏ khoảng trắng để chấm câu gõ
const loose = (s) => toHiragana(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ü/g, 'v').toLowerCase().replace(/[\s'’.,!?]/g, '');

function buildQuiz(cards) {
  return shuffle(cards).slice(0, QUESTIONS).map((card) => {
    const distractors = shuffle(cards.filter((c) => c.id !== card.id && c.meaning_vi !== card.meaning_vi)).slice(0, 3);
    return { card, options: shuffle([card, ...distractors]) };
  });
}

export default function Quiz() {
  const { lang } = useLang();
  const myLevel = useAuth().user.levels?.[lang];
  const [params] = useSearchParams();
  const [deck, setDeck] = useState(params.get('deck') || ''); // ?deck=weak từ trang "Từ hay quên"
  const [mode, setMode] = useState('meaning');
  const [cards, setCards] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [typed, setTyped] = useState('');
  const [score, setScore] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    api(`/cards?lang=${lang}${deckQuery(deck, myLevel)}`).then((d) => setCards(d.cards));
    setQuiz(null);
  }, [lang, deck]);

  const start = () => { setQuiz(buildQuiz(cards)); setIdx(0); setPicked(null); setTyped(''); setScore(0); };
  const q = quiz?.[idx];
  const finished = quiz && idx >= quiz.length;

  useEffect(() => {
    if (q && mode === 'listen') speak(q.card.term, lang);
    if (q && mode === 'type') inputRef.current?.focus();
  }, [q, mode, lang]);

  const choose = (opt) => {
    if (picked) return;
    const correct = opt.id === q.card.id;
    setPicked({ id: opt.id, correct });
    if (correct) setScore((s) => s + 1);
    logActivity({ kind: 'quiz', lang, cardId: q.card.id, correct });
    if (mode !== 'listen') speak(q.card.term, lang);
  };

  const submitTyped = (e) => {
    e.preventDefault();
    if (picked || !typed.trim()) return;
    const answers = [q.card.term, ...(isCJK(lang) && q.card.phonetic ? [q.card.phonetic] : [])];
    const correct = answers.some((a) => loose(a) === loose(typed));
    setPicked({ id: correct ? q.card.id : -1, correct });
    if (correct) setScore((s) => s + 1);
    logActivity({ kind: 'quiz', lang, cardId: q.card.id, correct });
    speak(q.card.term, lang);
  };

  const next = () => { setIdx((i) => i + 1); setPicked(null); setTyped(''); };

  // Phím tắt trên máy tính: 1–4 chọn đáp án, Enter sang câu tiếp
  useEffect(() => {
    const onKey = (e) => {
      if (!q || e.ctrlKey || e.metaKey || e.altKey) return;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
      if (picked && e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); next(); return; }
      if (!picked && !typing && mode !== 'type' && /^[1-4]$/.test(e.key)) {
        const opt = q.options[Number(e.key) - 1];
        if (opt) choose(opt);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const prompt = useMemo(() => {
    if (!q) return null;
    if (mode === 'meaning') return <div className={`term ${scriptClass(lang)}`}>{q.card.term}</div>;
    if (mode === 'listen') return <div className="term"><button className="btn big" onClick={() => speak(q.card.term, lang)}>🔊 Nghe lại</button></div>;
    return <div className="term meaning-prompt">{q.card.meaning_vi}</div>;
  }, [q, mode, lang]);

  return (
    <div className="stack page-narrow">
      <div className="toolbar">
        <h2>Quiz</h2>
        <DeckPicker lang={lang} value={deck} onChange={setDeck} />
        <select value={mode} onChange={(e) => { setMode(e.target.value); setQuiz(null); }} aria-label="Kiểu quiz">
          {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {!quiz && (
        <div className="card center-text">
          <p>{MODES[mode]} — {Math.min(QUESTIONS, cards.length)} câu hỏi</p>
          {mode === 'type' && lang === 'zh' && <p className="muted small">Có thể gõ chữ Hán hoặc pinyin (không cần dấu thanh), vd: nihao</p>}
          {mode === 'type' && lang === 'ja' && <p className="muted small">Có thể gõ chữ Nhật hoặc cách đọc bằng hiragana/katakana, vd: ありがとう</p>}
          <button className="btn primary" onClick={start} disabled={cards.length < 4}>Bắt đầu</button>
          {cards.length < 4 && <p className="muted small">Cần ít nhất 4 từ trong phạm vi này để làm quiz.</p>}
        </div>
      )}

      {finished && (
        <div className="card center-text">
          <h3>Kết quả: {score}/{quiz.length}</h3>
          <p>{score === quiz.length ? '🏆 Xuất sắc!' : score >= quiz.length * 0.7 ? '👍 Tốt lắm!' : '💪 Cố gắng thêm nhé!'}</p>
          <button className="btn primary" onClick={start}>Làm lại</button>
        </div>
      )}

      {q && (
        <div className="card quiz">
          <div className="muted small">Câu {idx + 1}/{quiz.length} · Đúng {score}</div>
          {prompt}
          {mode === 'type' ? (
            <form onSubmit={submitTyped} className="type-form">
              <input ref={inputRef} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!picked}
                placeholder={{ en: 'Gõ từ tiếng Anh…', zh: 'Gõ chữ Hán hoặc pinyin…', ja: 'Gõ chữ Nhật hoặc kana…' }[lang]} lang={INPUT_LANG[lang]} />
              {!picked && <button className="btn primary">Kiểm tra</button>}
            </form>
          ) : (
            <div className="options">
              {q.options.map((o, i) => {
                let cls = '';
                if (picked) cls = o.id === q.card.id ? 'right' : o.id === picked.id ? 'wrong' : 'dim';
                return (
                  <button key={o.id} className={`option ${cls}`} onClick={() => choose(o)}>
                    <span className="kbd-hint">{i + 1}</span>
                    {mode === 'meaning' ? o.meaning_vi : <span className={scriptClass(lang)}>{o.term}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {picked && (
            <div className={`feedback ${picked.correct ? 'ok' : 'bad'}`}>
              {picked.correct ? '✅ Chính xác!' : '❌ Chưa đúng.'}{' '}
              <strong className={scriptClass(lang)}>{q.card.term}</strong> <span className="muted">{q.card.phonetic}</span> — {q.card.meaning_vi}
              <SpeakButton text={q.card.term} lang={lang} />
              <div><button className="btn primary" onClick={next} autoFocus>Tiếp ›</button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
