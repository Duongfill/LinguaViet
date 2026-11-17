import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { groupByLevel, levelLabel, levelShort } from '../lib/levels.js';

// Dropdown chọn phạm vi từ: '' = trình độ của tôi, 'all' = tất cả, 'weak' = từ hay quên, số = một bộ cụ thể
export default function DeckPicker({ lang, value, onChange, myLabel = 'Trình độ của tôi' }) {
  const { user } = useAuth();
  const myLevel = user.levels?.[lang];
  const [decks, setDecks] = useState([]);
  useEffect(() => {
    api(`/decks?lang=${lang}`).then((d) => setDecks(d.decks)).catch(() => setDecks([]));
  }, [lang]);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Chọn phạm vi từ vựng">
      {myLevel && <option value="">{myLabel} ({levelShort(myLevel)})</option>}
      <option value="all">Tất cả trình độ</option>
      <option value="weak">⚠️ Từ hay quên</option>
      {groupByLevel(decks).map(([level, list]) => (
        <optgroup key={level} label={levelLabel(level)}>
          {list.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
