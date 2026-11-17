import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, logActivity } from '../lib/api.js';
import { useLang, LANG_INFO, INPUT_LANG, scriptClass, isCJK } from '../lib/lang.jsx';
import { useAuth } from '../lib/auth.jsx';
import { deckQuery } from '../lib/levels.js';
import { speak } from '../lib/speech.js';
import { Marked, diff, pieces, shuffle, tokens } from '../lib/compare.jsx';
import DeckPicker from '../components/DeckPicker.jsx';
import SpeakButton from '../components/SpeakButton.jsx';

const ROUND = 30;

// Luyện dịch câu ví dụ: ngoại ngữ → tiếng Việt và ngược lại; ghép từ hoặc tự gõ
export default function Translate() {
  const { lang } = useLang();
  const myLevel = useAuth().user.levels?.[lang];
  const [params] = useSearchParams();
  const [deck, setDeck] = useState(params.get('deck') || '');
  const [dir, setDir] = useState('to_vi');     // to_vi: ngoại ngữ → Việt | from_vi: Việt → ngoại ngữ
  const [mode, setMode] = useState('build');   // build: ghép từ | type: tự gõ
  const [cards, setCards] = useState(null);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [bank, setBank] = useState([]);        // [{ id, text }]
  const [picked, setPicked] = useState([]);    // id các mảnh đã chọn, theo thứ tự
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState(null);  // { hit, score, mine }
  const [selfOk, setSelfOk] = useState(false);
  const [stats, setStats] = useState({ n: 0, ok: 0 });
  const inputRef = useRef(null);

  useEffect(() => {
    setCards(null);
    api(`/cards?lang=${lang}${deckQuery(deck, myLevel)}`).then((d) => setCards(d.cards)).catch(() => setCards([]));
  }, [lang, deck]); // eslint-disable-line react-hooks/exhaustive-deps

  const pool = useMemo(() => (cards || []).filter((c) => c.example && c.example_vi), [cards]);
  useEffect(() => { setQueue(shuffle(pool).slice(0, ROUND)); setIdx(0); setStats({ n: 0, ok: 0 }); }, [pool]);

  const card = queue[idx];
  const fromLang = dir === 'to_vi' ? lang : 'vi';
  const toLang = dir === 'to_vi' ? 'vi' : lang;
  const source = card ? (dir === 'to_vi' ? card.example : card.example_vi) : '';
  const answer = card ? (dir === 'to_vi' ? card.example_vi : card.example) : '';
  const glue = isCJK(toLang) ? '' : ' ';

  // Chuẩn bị câu mới: mảnh từ của đáp án + 2 mảnh gây nhiễu từ câu khác
  useEffect(() => {
    setPicked([]); setTyped(''); setResult(null); setSelfOk(false);
    if (!card) { setBank([]); return; }
    const own = pieces(answer, toLang);
    const ownSet = new Set(own.map((p) => p.toLowerCase()));
    const others = shuffle(pool.filter((c) => c.id !== card.id)).slice(0, 6)
      .flatMap((c) => pieces(dir === 'to_vi' ? c.example_vi : c.example, toLang))
      .filter((p) => !ownSet.has(p.toLowerCase()));
    const extra = shuffle([...new Set(others)]).slice(0, Math.min(3, Math.max(2, Math.round(own.length / 4))));
    setBank(shuffle([...own, ...extra]).map((text, i) => ({ id: i, text })));
    if (dir === 'to_vi') setTimeout(() => speak(card.example, lang, 0.85), 250);
    if (mode === 'type') setTimeout(() => inputRef.current?.focus(), 50);
  }, [card?.id, dir, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const built = picked.map((id) => bank.find((b) => b.id === id)?.text).join(glue);

  const check = (e) => {
    e?.preventDefault();
    const mine = mode === 'build' ? built : typed;
    if (result || !mine.trim()) return;
    const res = diff(tokens(answer, toLang), tokens(mine, toLang));
    setResult({ ...res, mine });
    if (dir === 'from_vi') speak(card.example, lang, 0.85);
  };

  const passed = result && (selfOk || result.score >= (mode === 'build' ? 100 : 80));

  const next = () => {
    if (result) {
      logActivity({ kind: 'quiz', lang, cardId: card.id, correct: !!passed, score: selfOk ? 100 : result.score });
      setStats((s) => ({ n: s.n + 1, ok: s.ok + (passed ? 1 : 0) }));
    }
    if (idx + 1 >= queue.length) { setQueue(shuffle(pool).slice(0, ROUND)); setIdx(0); } else setIdx((i) => i + 1);
  };

  const label = LANG_INFO[lang].short;

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>🔁 Dịch câu</h2>
        <DeckPicker lang={lang} value={deck} onChange={setDeck} />
        <div className="seg">
          <button className={dir === 'to_vi' ? 'active' : ''} onClick={() => setDir('to_vi')}>{label} → Việt</button>
          <button className={dir === 'from_vi' ? 'active' : ''} onClick={() => setDir('from_vi')}>Việt → {label}</button>
        </div>
        <div className="seg">
          <button className={mode === 'build' ? 'active' : ''} onClick={() => setMode('build')}>Ghép từ</button>
          <button className={mode === 'type' ? 'active' : ''} onClick={() => setMode('type')}>Tự gõ</button>
        </div>
      </div>

      {cards === null && <div className="muted">Đang tải…</div>}
      {cards && !card && <div className="card center-text muted">Phạm vi này chưa có câu ví dụ nào để luyện dịch.</div>}

      {card && (
        <div className="card translate stack">
          <div className="muted small">
            Câu {idx + 1}/{queue.length}{stats.n > 0 && <> · Đúng {stats.ok}/{stats.n}</>}
            {' · '}Dịch sang {toLang === 'vi' ? 'tiếng Việt' : LANG_INFO[lang].label}
          </div>
          <div className="tr-source">
            <span className={fromLang === 'vi' ? '' : scriptClass(lang)}>{source}</span>
            {fromLang !== 'vi' && <SpeakButton text={source} lang={lang} />}
          </div>

          {mode === 'build' ? (
            <>
              <div className={`tr-answer ${result ? (passed ? 'ok' : 'bad') : ''}`} aria-label="Câu bạn ghép">
                {picked.length === 0 && <span className="muted small">Chạm các từ bên dưới theo đúng thứ tự…</span>}
                {picked.map((id) => {
                  const b = bank.find((x) => x.id === id);
                  return (
                    <button key={id} className={`chip ${toLang !== 'vi' ? scriptClass(lang) : ''}`} disabled={!!result}
                      onClick={() => setPicked((p) => p.filter((x) => x !== id))}>{b?.text}</button>
                  );
                })}
              </div>
              <div className="tr-bank">
                {bank.map((b) => (
                  <button key={b.id} className={`chip ${toLang !== 'vi' ? scriptClass(lang) : ''}`}
                    disabled={!!result || picked.includes(b.id)} onClick={() => setPicked((p) => [...p, b.id])}>
                    {b.text}
                  </button>
                ))}
              </div>
              {!result && (
                <div className="row center" style={{ marginTop: 0 }}>
                  <button className="btn ghost" onClick={() => setPicked([])} disabled={!picked.length}>Xoá hết</button>
                  <button className="btn primary" onClick={check} disabled={!picked.length}>Kiểm tra</button>
                </div>
              )}
            </>
          ) : (
            <form onSubmit={check} className="type-form tr-type">
              <textarea ref={inputRef} rows={2} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!result}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) check(e); }}
                lang={toLang === 'vi' ? 'vi' : INPUT_LANG[lang]}
                placeholder={toLang === 'vi' ? 'Gõ bản dịch tiếng Việt…' : `Gõ câu ${LANG_INFO[lang].label}…`} />
              {!result && <button className="btn primary">Kiểm tra</button>}
            </form>
          )}

          {result && (
            <div className={`feedback ${passed ? 'ok' : result.score >= 50 ? 'warn' : 'bad'}`}>
              <div className="score">{selfOk ? '✓' : result.score}<span className="small">{selfOk ? '' : '/100'}</span></div>
              <div className="small muted">Câu mẫu:</div>
              <div className="dict-answer"><Marked text={answer} lang={toLang} hit={result.hit} /></div>
              {toLang !== 'vi' && <SpeakButton text={answer} lang={lang} label="Nghe câu mẫu" />}
              {mode === 'type' && <div className="small">Bạn viết: “{result.mine}”</div>}
              {mode === 'type' && !passed && (
                <>
                  <div className="small muted">Câu dịch có nhiều cách đúng — điểm chỉ so với câu mẫu.</div>
                  <button className="btn ghost sm" onClick={() => setSelfOk(true)}>✓ Ý mình đúng, tính là đúng</button>
                </>
              )}
              <button className="btn primary" onClick={next} autoFocus>Tiếp ›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
