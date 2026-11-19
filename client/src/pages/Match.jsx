import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, logActivity } from '../lib/api.js';
import { useLang, scriptClass } from '../lib/lang.jsx';
import { useAuth } from '../lib/auth.jsx';
import { deckQuery } from '../lib/levels.js';
import { speak } from '../lib/speech.js';
import DeckPicker from '../components/DeckPicker.jsx';

const PAIRS = 6;
const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};
// Chọn các từ không trùng từ / nghĩa để mỗi ô chỉ ghép được với đúng một ô
function pickRound(cards) {
  const seenT = new Set(), seenM = new Set(), out = [];
  for (const c of shuffle(cards)) {
    if (seenT.has(c.term) || seenM.has(c.meaning_vi)) continue;
    seenT.add(c.term); seenM.add(c.meaning_vi); out.push(c);
    if (out.length === PAIRS) break;
  }
  return out;
}
const fmtTime = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;
const bestKey = (lang) => `langapp.match.best.${lang}`;
const readBest = (lang) => { try { return Number(localStorage.getItem(bestKey(lang))) || null; } catch { return null; } };

export default function Match() {
  const { lang } = useLang();
  const myLevel = useAuth().user.levels?.[lang];
  const [params] = useSearchParams();
  const [deck, setDeck] = useState(params.get('deck') || '');
  const [cards, setCards] = useState(null);
  const [round, setRound] = useState(null); // { left: [...], right: [...] }
  const [sel, setSel] = useState(null);     // { side, id }
  const [matched, setMatched] = useState(new Set());
  const [wrong, setWrong] = useState(null); // [leftId, rightId] đang nháy đỏ
  const [missed, setMissed] = useState(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [startAt, setStartAt] = useState(null);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState(null);
  const [best, setBest] = useState(() => readBest(lang));
  const timer = useRef(null);

  useEffect(() => {
    setCards(null); setRound(null); setResult(null);
    api(`/cards?lang=${lang}${deckQuery(deck, myLevel)}`).then((d) => setCards(d.cards)).catch(() => setCards([]));
  }, [lang, deck]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setBest(readBest(lang)), [lang]);
  useEffect(() => () => clearInterval(timer.current), []);

  const start = () => {
    const picked = pickRound(cards);
    setRound({ left: shuffle(picked), right: shuffle(picked) });
    setSel(null); setMatched(new Set()); setMissed(new Set()); setWrong(null);
    setMistakes(0); setResult(null); setStartAt(null); setNow(0);
    clearInterval(timer.current);
  };

  const finish = (doneAt) => {
    clearInterval(timer.current);
    const ms = doneAt - startAt;
    const isBest = mistakes === 0 && (!best || ms < best);
    if (isBest) { setBest(ms); try { localStorage.setItem(bestKey(lang), String(ms)); } catch { /* bỏ qua */ } }
    setResult({ ms, isBest });
    // Bảng xếp hạng: điểm = 1000 − thời gian (0,1 giây) − 50 × số lần sai (kết quả từng từ đã ghi khi ghép)
    api('/games/match/score', { method: 'POST', body: { lang, score: Math.max(50, Math.round(1000 - ms / 100 - mistakes * 50)), correct: round.left.length - missed.size, total: round.left.length } }).catch(() => {});
  };

  const tap = (side, card) => {
    if (result || matched.has(card.id) || wrong) return;
    if (!startAt) {
      const t0 = Date.now();
      setStartAt(t0);
      timer.current = setInterval(() => setNow(Date.now() - t0), 100);
    }
    if (side === 'left') speak(card.term, lang);
    if (!sel || sel.side === side) { setSel({ side, id: card.id }); return; }

    const leftId = side === 'left' ? card.id : sel.id;
    const rightId = side === 'right' ? card.id : sel.id;
    setSel(null);
    if (leftId === rightId) {
      const next = new Set(matched).add(leftId);
      setMatched(next);
      logActivity({ kind: 'quiz', lang, cardId: leftId, correct: !missed.has(leftId) });
      if (next.size === round.left.length) finish(Date.now());
    } else {
      setMistakes((m) => m + 1);
      setMissed((s) => new Set(s).add(leftId).add(rightId));
      setWrong([leftId, rightId]);
      setTimeout(() => setWrong(null), 600);
    }
  };

  const tileCls = (side, c) => {
    if (matched.has(c.id)) return 'tile done';
    if (wrong && wrong[side === 'left' ? 0 : 1] === c.id) return 'tile bad';
    if (sel?.side === side && sel.id === c.id) return 'tile sel';
    return 'tile';
  };

  const enough = cards && new Set(cards.map((c) => c.meaning_vi)).size >= 3;

  return (
    <div className="stack page-narrow">
      <div className="toolbar">
        <h2>🧩 Ghép thẻ</h2>
        <DeckPicker lang={lang} value={deck} onChange={setDeck} />
      </div>

      {!round && (
        <div className="card center-text">
          <p>Ghép mỗi từ với nghĩa đúng của nó, càng nhanh càng tốt. Sai thì từ đó được ghi vào <b>Từ hay quên</b>.</p>
          {best && <p className="muted small">Kỷ lục không sai lần nào: ⏱ {fmtTime(best)}</p>}
          {cards === null ? <div className="muted">Đang tải…</div> : (
            <>
              <button className="btn primary" onClick={start} disabled={!enough}>Bắt đầu</button>
              {!enough && <p className="muted small">Cần ít nhất 3 từ khác nhau trong phạm vi này.</p>}
            </>
          )}
        </div>
      )}

      {round && (
        <>
          <div className="match-bar">
            <span>⏱ {fmtTime(result ? result.ms : now)}</span>
            <span>✅ {matched.size}/{round.left.length}</span>
            <span>❌ {mistakes}</span>
            <button className="btn ghost sm" onClick={start}>↻ Ván mới</button>
          </div>
          <div className="match-grid">
            <div className="match-col">
              {round.left.map((c) => (
                <button key={c.id} className={tileCls('left', c)} onClick={() => tap('left', c)} disabled={matched.has(c.id)}>
                  <span className={scriptClass(lang)}>{c.term}</span>
                </button>
              ))}
            </div>
            <div className="match-col">
              {round.right.map((c) => (
                <button key={c.id} className={tileCls('right', c)} onClick={() => tap('right', c)} disabled={matched.has(c.id)}>
                  {c.meaning_vi}
                </button>
              ))}
            </div>
          </div>
          {result && (
            <div className={`feedback ${mistakes === 0 ? 'ok' : 'warn'}`}>
              <div className="score">⏱ {fmtTime(result.ms)}</div>
              <div>{result.isBest ? '🏆 Kỷ lục mới!' : mistakes === 0 ? '🎯 Không sai lần nào!' : `Sai ${mistakes} lần — các từ đó đã vào sổ Từ hay quên.`}</div>
              <button className="btn primary" onClick={start} autoFocus>Ván tiếp ›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
