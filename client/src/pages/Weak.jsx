import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useLang } from '../lib/lang.jsx';
import SpeakButton from '../components/SpeakButton.jsx';

const KIND = { review: 'Flashcard', quiz: 'Quiz', speak: 'Phát âm', hanzi: 'Viết chữ' };

// Sổ "Từ hay quên": từ chọn Quên / làm sai / đọc chưa chuẩn gần đây
export default function Weak() {
  const { lang } = useLang();
  const [cards, setCards] = useState(null);

  const load = () => api(`/weak?lang=${lang}`).then((d) => setCards(d.cards)).catch(() => setCards([]));
  useEffect(() => { setCards(null); load(); }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = async (id) => {
    setCards((cs) => cs.filter((c) => c.id !== id));
    await api(`/weak/${id}/dismiss`, { method: 'POST' }).catch(load);
  };

  return (
    <div className="stack">
      <div className="toolbar">
        <h2>⚠️ Từ hay quên</h2>
        {cards?.length > 0 && <span className="muted small">{cards.length} từ</span>}
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Tự gom từ bạn chọn <b>Quên</b> trong Flashcard, làm sai Quiz / Ghép thẻ / Chính tả, viết sai chữ Hán, hoặc đọc dưới 70 điểm (60 ngày gần đây).
        Làm đúng nhiều lần thì từ tự ra khỏi sổ.
      </p>

      {cards === null && <div className="muted">Đang tải…</div>}

      {cards?.length === 0 && (
        <div className="card center-text">
          <h3>🎉 Chưa có từ nào hay quên</h3>
          <p className="muted">Cứ học tiếp ở Flashcard, Quiz hay Phát âm — từ nào bạn hay sai sẽ tự xuất hiện ở đây.</p>
        </div>
      )}

      {cards?.length > 0 && (
        <>
          <div className="row" style={{ marginTop: 0 }}>
            <Link className="btn primary" to="/flashcards?deck=weak">🃏 Ôn bằng Flashcard</Link>
            {cards.length >= 4 && <Link className="btn" to="/quiz?deck=weak">❓ Làm Quiz</Link>}
            <Link className="btn" to="/speak?deck=weak">🎤 Luyện phát âm</Link>
            {cards.length >= 3 && <Link className="btn" to="/match?deck=weak">🧩 Ghép thẻ</Link>}
          </div>
          <div className="card" style={{ padding: 0 }}>
            <table className="word-table weak-table">
              <thead><tr><th>Từ</th><th>Nghĩa</th><th>Sai</th><th /></tr></thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong className={lang === 'zh' ? 'zh' : ''}>{c.term}</strong> <SpeakButton text={c.term} lang={lang} />
                      <div className="muted small">{c.phonetic}</div>
                    </td>
                    <td>{c.meaning_vi}<div className="muted small">{c.deck_title}</div></td>
                    <td className="small">
                      <span className="badge danger-soft">{c.fails}/{c.attempts} lần</span>
                      <div className="muted">{(c.fail_kinds || '').split(',').filter(Boolean).map((k) => KIND[k] || k).join(', ')}</div>
                    </td>
                    <td><button className="btn ghost sm" onClick={() => dismiss(c.id)} title="Ẩn khỏi sổ cho tới khi sai lại">✓ Đã nhớ</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
