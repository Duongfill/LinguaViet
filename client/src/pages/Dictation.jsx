import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, logActivity } from '../lib/api.js';
import { useLang, INPUT_LANG, isCJK } from '../lib/lang.jsx';
import { Marked, diff, loose, shuffle, tokens } from '../lib/compare.jsx';
import { useAuth } from '../lib/auth.jsx';
import { deckQuery } from '../lib/levels.js';
import { speak } from '../lib/speech.js';
import DeckPicker from '../components/DeckPicker.jsx';

export default function Dictation() {
  const { lang } = useLang();
  const myLevel = useAuth().user.levels?.[lang];
  const [params] = useSearchParams();
  const [deck, setDeck] = useState(params.get('deck') || '');
  const [target, setTarget] = useState('sentence'); // sentence | word
  const [cards, setCards] = useState(null);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState(null);
  const [hint, setHint] = useState(false);
  const [stats, setStats] = useState({ n: 0, total: 0 });
  const inputRef = useRef(null);

  useEffect(() => {
    setCards(null);
    api(`/cards?lang=${lang}${deckQuery(deck, myLevel)}`).then((d) => setCards(d.cards)).catch(() => setCards([]));
  }, [lang, deck]); // eslint-disable-line react-hooks/exhaustive-deps

  const pool = useMemo(() => (cards || []).filter((c) => (target === 'sentence' ? c.example : c.term)), [cards, target]);
  useEffect(() => { setQueue(shuffle(pool).slice(0, 50)); setIdx(0); setTyped(''); setResult(null); setHint(false); setStats({ n: 0, total: 0 }); }, [pool]);

  const card = queue[idx];
  const text = card ? (target === 'sentence' ? card.example : card.term) : '';
  const meaning = card ? (target === 'sentence' ? card.example_vi : card.meaning_vi) : '';

  // Tự đọc khi sang câu mới
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => speak(text, lang, target === 'sentence' ? 0.85 : 0.9), 250);
    inputRef.current?.focus();
    return () => clearTimeout(t);
  }, [text, lang, target]);

  const check = (e) => {
    e.preventDefault();
    if (result || !typed.trim()) return;
    let res = diff(tokens(text, lang), tokens(typed, lang));
    // Từ tiếng Trung: chấp nhận gõ pinyin không dấu
    if (isCJK(lang) && target === 'word' && card.phonetic && loose(typed) === loose(card.phonetic)) {
      res = { hit: tokens(text, lang).map(() => true), score: 100 };
    }
    setResult(res);
    setStats((s) => ({ n: s.n + 1, total: s.total + res.score }));
    logActivity({ kind: 'quiz', lang, cardId: card.id, correct: res.score >= 80, score: res.score });
  };

  const next = () => {
    setIdx((i) => (i + 1 < queue.length ? i + 1 : 0));
    if (idx + 1 >= queue.length) setQueue(shuffle(pool).slice(0, 50));
    setTyped(''); setResult(null); setHint(false);
  };

  return (
    <div className="stack page-narrow">
      <div className="toolbar">
        <h2>🎧 Nghe chép chính tả</h2>
        <DeckPicker lang={lang} value={deck} onChange={setDeck} />
        <div className="seg">
          <button className={target === 'sentence' ? 'active' : ''} onClick={() => setTarget('sentence')}>Câu</button>
          <button className={target === 'word' ? 'active' : ''} onClick={() => setTarget('word')}>Từ</button>
        </div>
      </div>

      {cards === null && <div className="muted">Đang tải…</div>}
      {cards && !card && <div className="card center-text muted">Phạm vi này chưa có {target === 'sentence' ? 'câu ví dụ' : 'từ'} nào để luyện.</div>}

      {card && (
        <div className="card dictation center-text">
          <div className="muted small">
            {target === 'sentence' ? 'Câu' : 'Từ'} {idx + 1}/{queue.length}
            {stats.n > 0 && <> · Điểm trung bình {Math.round(stats.total / stats.n)}</>}
          </div>
          <div className="row center" style={{ marginTop: 0 }}>
            <button className="btn primary" onClick={() => speak(text, lang, target === 'sentence' ? 0.85 : 0.9)}>🔊 Nghe</button>
            <button className="btn" onClick={() => speak(text, lang, 0.55)}>🐢 Chậm</button>
            <button className="btn ghost" onClick={() => setHint((h) => !h)}>{hint ? 'Ẩn gợi ý' : '💡 Gợi ý nghĩa'}</button>
          </div>
          {hint && <div className="muted">{meaning}</div>}

          <form onSubmit={check} className="type-form">
            {target === 'sentence' ? (
              <textarea ref={inputRef} rows={2} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!result}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) check(e); }}
                placeholder={{ en: 'Gõ lại câu bạn nghe được…', zh: 'Gõ lại câu bằng chữ Hán…', ja: 'Gõ lại câu bằng tiếng Nhật…' }[lang]} lang={INPUT_LANG[lang]} />
            ) : (
              <input ref={inputRef} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!result}
                placeholder={{ en: 'Gõ từ bạn nghe được…', zh: 'Gõ chữ Hán hoặc pinyin…', ja: 'Gõ chữ Nhật hoặc kana…' }[lang]} lang={INPUT_LANG[lang]} />
            )}
            {!result && <button className="btn primary">Kiểm tra</button>}
          </form>

          {result && (
            <div className={`feedback ${result.score >= 90 ? 'ok' : result.score >= 60 ? 'warn' : 'bad'}`}>
              <div className="score">{result.score}<span className="small">/100</span></div>
              <div className="dict-answer"><Marked text={text} lang={lang} hit={result.hit} /></div>
              {card.phonetic && target === 'word' && <div className="muted small">{card.phonetic}</div>}
              <div className="muted small">{meaning}</div>
              <div className="small">Bạn gõ: “{typed}”</div>
              <button className="btn primary" onClick={next} autoFocus>Tiếp ›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
