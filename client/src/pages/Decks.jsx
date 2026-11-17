import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useLang } from '../lib/lang.jsx';
import { useAuth } from '../lib/auth.jsx';
import SpeakButton from '../components/SpeakButton.jsx';
import { MINE, groupByLevel, levelLabel } from '../lib/levels.js';
import WordSearch from '../components/WordSearch.jsx';
import MyWords from '../components/MyWords.jsx';

export default function Decks() {
  const { lang } = useLang();
  const myLevel = useAuth().user.levels?.[lang];
  const [decks, setDecks] = useState([]);
  const [level, setLevel] = useState('');
  const [open, setOpen] = useState(null);
  const [cards, setCards] = useState([]);
  const [myVersion, setMyVersion] = useState(0); // tăng khi "Từ của tôi" thay đổi để tải lại

  const loadDecks = () => api(`/decks?lang=${lang}`).then((d) => { setDecks(d.decks); return d.decks; });
  useEffect(() => {
    setOpen(null);
    loadDecks().then((list) => {
      const groups = groupByLevel(list).filter(([l]) => l !== MINE);
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

  const groups = groupByLevel(decks).filter(([l]) => l !== MINE);
  const myChanged = () => { setMyVersion((v) => v + 1); loadDecks(); };
  const shown = level ? groups.filter(([l]) => l === level) : groups;

  return (
    <div className="stack">
      <h2 style={{ margin: 0 }}>Bộ từ vựng</h2>
      <WordSearch lang={lang} onAdded={myChanged} />
      <MyWords lang={lang} version={myVersion} onChange={myChanged} />
      <div className="toolbar">
        <h3 style={{ margin: 0 }}>Kho từ theo trình độ</h3>
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
