import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useLang } from '../lib/lang.jsx';
import { useAuth } from '../lib/auth.jsx';
import SpeakButton from '../components/SpeakButton.jsx';
import { groupByLevel, levelLabel } from '../lib/levels.js';

export default function Decks() {
  const { lang } = useLang();
  const myLevel = useAuth().user.levels?.[lang];
  const [decks, setDecks] = useState([]);
  const [level, setLevel] = useState('');
  const [open, setOpen] = useState(null);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    setOpen(null);
    api(`/decks?lang=${lang}`).then((d) => {
      setDecks(d.decks);
      const groups = groupByLevel(d.decks);
      // Mặc định mở trình độ người dùng đã chọn
      setLevel(groups.some(([l]) => l === myLevel) ? myLevel : groups[0]?.[0] || '');
    });
  }, [lang]);

  const toggle = async (deck) => {
    if (open === deck.id) return setOpen(null);
    setOpen(deck.id);
    setCards([]);
    const d = await api(`/decks/${deck.id}/cards`);
    setCards(d.cards);
  };

  const groups = groupByLevel(decks);
  const shown = level ? groups.filter(([l]) => l === level) : groups;

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>Bộ từ vựng</h2>
        <div className="chips" role="tablist" aria-label="Lọc theo trình độ">
          <button className={!level ? 'active' : ''} onClick={() => setLevel('')}>Tất cả</button>
          {groups.map(([l, list]) => (
            <button key={l} className={level === l ? 'active' : ''} onClick={() => setLevel(l)}>
              {l.replace('HSK', 'HSK ')} <span className="muted">({list.reduce((s, d) => s + d.card_count, 0)})</span>
            </button>
          ))}
        </div>
      </div>
      {shown.map(([l, list]) => (
        <section key={l} className="stack level-group">
          <h3 className="level-title">{levelLabel(l)} <span className="muted small">· {list.length} bộ · {list.reduce((s, d) => s + d.card_count, 0)} từ</span></h3>
      {list.map((d) => (
        <div key={d.id} className="card">
          <button className="deck-head" onClick={() => toggle(d)} aria-expanded={open === d.id}>
            <div>
              <strong>{d.title}</strong> <span className="badge">{d.level}</span>
              <div className="muted small">{d.description}</div>
            </div>
            <div className="small muted">{d.learned_count || 0}/{d.card_count} đã thuộc {open === d.id ? '▲' : '▼'}</div>
          </button>
          {open === d.id && (
            <table className="word-table">
              <thead><tr><th>Từ</th><th>{lang === 'zh' ? 'Pinyin' : 'Phiên âm'}</th><th>Nghĩa</th><th>Ví dụ</th><th /></tr></thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id}>
                    <td className={lang === 'zh' ? 'hanzi-cell' : ''}><strong>{c.term}</strong></td>
                    <td className="muted">{c.phonetic}</td>
                    <td>{c.meaning_vi}</td>
                    <td className="small">{c.example}<div className="muted">{c.example_vi}</div></td>
                    <td><SpeakButton text={c.term} lang={lang} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
        </section>
      ))}
    </div>
  );
}
