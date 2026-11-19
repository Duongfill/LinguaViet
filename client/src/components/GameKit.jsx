// Bộ khung dùng chung cho các game từ vựng: tải từ, màn bắt đầu, màn kết thúc (lưu điểm + từ sai)
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { deckQuery } from '../lib/levels.js';
import { scriptClass } from '../lib/lang.jsx';
import DeckPicker from './DeckPicker.jsx';
import SpeakButton from './SpeakButton.jsx';

export const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};

// Từ trong phạm vi đã chọn (trình độ / bộ / từ hay quên); bỏ từ trùng nghĩa để câu hỏi không mơ hồ
export function useGameCards(lang) {
  const myLevel = useAuth().user.levels?.[lang];
  const [params] = useSearchParams();
  const [deck, setDeck] = useState(params.get('deck') || '');
  const [cards, setCards] = useState(null);
  useEffect(() => {
    setCards(null);
    api(`/cards?lang=${lang}${deckQuery(deck, myLevel)}`).then((d) => {
      const seen = new Set();
      setCards(d.cards.filter((c) => c.meaning_vi && !seen.has(c.meaning_vi) && seen.add(c.meaning_vi)));
    }).catch(() => setCards([]));
  }, [lang, deck]); // eslint-disable-line react-hooks/exhaustive-deps
  return { deck, setDeck, cards };
}

export const bestKey = (game, lang) => `langapp.game.${game}.${lang}`;

export function GameStart({ icon, title, rules, lang, deck, setDeck, cards, min = 8, onStart, best }) {
  const enough = cards && cards.length >= min;
  return (
    <div className="stack page-narrow">
      <div className="toolbar">
        <h2>{icon} {title}</h2>
        <Link to="/games" className="btn ghost sm">← Trò chơi</Link>
      </div>
      <div className="card stack game-start">
        <ul className="game-rules">{rules.map((r) => <li key={r}>{r}</li>)}</ul>
        <label className="small muted">Luyện từ trong:</label>
        <DeckPicker lang={lang} value={deck} onChange={setDeck} />
        {best != null && <div className="small">🏆 Kỷ lục của bạn: <strong>{best}</strong></div>}
        {cards === null ? <div className="muted">Đang tải từ…</div>
          : enough ? <button className="btn primary big" onClick={onStart}>▶ Bắt đầu</button>
            : <div className="error small">Phạm vi này có quá ít từ (cần ≥ {min}). Hãy chọn phạm vi khác.</div>}
      </div>
    </div>
  );
}

// Màn kết thúc: gửi điểm + kết quả từng từ, hiện kỷ lục và các từ trả lời sai
export function GameOver({ game, lang, score, correct, total, results, onReplay, extra }) {
  const [saved, setSaved] = useState(null);
  useEffect(() => {
    api(`/games/${game}/score`, { method: 'POST', body: { lang, score, correct, total, cards: results.map((r) => ({ id: r.card.id, correct: r.ok })) } })
      .then(setSaved).catch(() => setSaved({ best: score, newBest: false }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const missed = [...new Map(results.filter((r) => !r.ok).map((r) => [r.card.id, r.card])).values()];
  return (
    <div className="stack page-narrow">
      <div className={`card result-card ${saved?.newBest ? 'good' : 'mid'} center-text`}>
        <div className="score">{score}</div>
        <div>{saved?.newBest ? '🏆 Kỷ lục mới!' : saved ? `Kỷ lục: ${saved.best}` : ''}</div>
        <div className="small muted">Đúng {correct}/{total}{extra ? ` · ${extra}` : ''} · +{correct * 10} XP</div>
        <div className="row center" style={{ marginTop: 0 }}>
          <button className="btn primary" onClick={onReplay} autoFocus>↻ Chơi lại</button>
          <Link className="btn" to="/games">🎮 Trò chơi khác</Link>
        </div>
      </div>
      {missed.length > 0 && (
        <div className="card stack">
          <h3>📝 Từ cần nhớ ({missed.length}) <span className="small muted">— đã thêm vào Từ hay quên</span></h3>
          {missed.map((c) => (
            <div key={c.id} className="game-missed">
              <strong className={scriptClass(lang)}>{c.term}</strong> <span className="small muted">{c.phonetic}</span>
              <SpeakButton text={c.term} lang={lang} />
              <div className="small">{c.meaning_vi}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
