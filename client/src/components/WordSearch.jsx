import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import SpeakButton from './SpeakButton.jsx';
import { scriptClass } from '../lib/lang.jsx';

// Ô tìm từ trong toàn bộ kho (không cần gõ dấu): tiếng Anh / chữ Hán / pinyin / nghĩa tiếng Việt
export default function WordSearch({ lang, onAdded }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [added, setAdded] = useState({}); // cardId -> 'ok' | thông báo lỗi
  const seq = useRef(0);

  useEffect(() => { setQ(''); setResults(null); setAdded({}); }, [lang]);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults(null); return undefined; }
    const my = ++seq.current;
    const t = setTimeout(() => {
      api(`/search?lang=${lang}&q=${encodeURIComponent(term)}`)
        .then((d) => { if (my === seq.current) setResults(d.cards); })
        .catch(() => { if (my === seq.current) setResults([]); });
    }, 250);
    return () => clearTimeout(t);
  }, [q, lang]);

  const add = async (c) => {
    try {
      await api('/my-cards', { method: 'POST', body: { fromCardId: c.id } });
      setAdded((a) => ({ ...a, [c.id]: 'ok' }));
      onAdded?.();
    } catch (e) {
      setAdded((a) => ({ ...a, [c.id]: e.status === 409 ? 'ok' : e.message }));
    }
  };

  return (
    <div className="card word-search">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={{
          en: '🔍 Tìm từ tiếng Anh hoặc nghĩa tiếng Việt (gõ không dấu cũng được)…',
          zh: '🔍 Tìm chữ Hán, pinyin (vd: nihao) hoặc nghĩa tiếng Việt…',
          ja: '🔍 Tìm chữ Nhật, kana (vd: ありがとう) hoặc nghĩa tiếng Việt…',
        }[lang]}
        aria-label="Tìm từ" />
      {results && (
        <div className="search-results">
          {results.length === 0 && <div className="muted small">Không tìm thấy từ nào. Bạn có thể tự thêm ở mục “Từ của tôi” bên dưới.</div>}
          {results.map((c) => (
            <div key={c.id} className="search-row">
              <div className="search-word">
                <strong className={scriptClass(lang)}>{c.term}</strong>
                <span className="muted small"> {c.phonetic}</span>
                <SpeakButton text={c.term} lang={lang} />
                <div>{c.meaning_vi}</div>
                <div className="muted small">
                  {c.mine ? '⭐ Từ của tôi' : `${c.deck_title}${c.level ? ` · ${c.level}` : ''}`}
                  {c.repetitions >= 2 ? ' · ✅ đã thuộc' : c.repetitions != null ? ' · đang học' : ''}
                </div>
              </div>
              {!c.mine && (
                added[c.id] === 'ok'
                  ? <span className="small ok-text">✓ Đã thêm</span>
                  : <button className="btn ghost sm" onClick={() => add(c)} title="Thêm vào Từ của tôi">＋ Của tôi</button>
              )}
              {added[c.id] && added[c.id] !== 'ok' && <div className="error small">{added[c.id]}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
