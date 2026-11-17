import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import SpeakButton from './SpeakButton.jsx';
import { INPUT_LANG, PHONETIC_LABEL, isCJK, scriptClass } from '../lib/lang.jsx';

const EMPTY = { term: '', phonetic: '', meaning_vi: '', example: '', example_vi: '' };

// Bộ "Từ của tôi": tự thêm từ, xoá từ, mở học bằng Flashcard / Quiz / Phát âm
export default function MyWords({ lang, version, onChange }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/my-cards?lang=${lang}`).then(setData).catch(() => setData({ deck: null, cards: [] }));
  }, [lang, version]);
  useEffect(() => { setForm(EMPTY); setError(''); }, [lang]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api('/my-cards', { method: 'POST', body: { lang, ...form } });
      setForm(EMPTY);
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Xoá "${c.term}" khỏi Từ của tôi? Tiến độ ôn của từ này cũng bị xoá.`)) return;
    await api(`/my-cards/${c.id}`, { method: 'DELETE' }).catch((err) => setError(err.message));
    onChange?.();
  };

  const cards = data?.cards || [];
  const deckId = data?.deck?.id;

  return (
    <div className="card my-words">
      <button className="deck-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div>
          <strong>⭐ Từ của tôi</strong>
          <div className="muted small">Từ bạn tự thêm hoặc chọn từ kết quả tìm kiếm — chỉ mình bạn thấy</div>
        </div>
        <div className="small muted">
          {cards.filter((c) => c.repetitions >= 2).length}/{cards.length} đã thuộc {open ? '▲' : '▼'}
        </div>
      </button>

      {open && (
        <div className="stack" style={{ gap: 12, marginTop: 12 }}>
          {deckId && cards.length > 0 && (
            <div className="row" style={{ marginTop: 0 }}>
              <Link className="btn primary sm" to={`/flashcards?deck=${deckId}`}>🃏 Flashcard</Link>
              {cards.length >= 4 && <Link className="btn sm" to={`/quiz?deck=${deckId}`}>❓ Quiz</Link>}
              <Link className="btn sm" to={`/speak?deck=${deckId}`}>🎤 Phát âm</Link>
              {cards.length >= 3 && <Link className="btn sm" to={`/match?deck=${deckId}`}>🧩 Ghép thẻ</Link>}
            </div>
          )}

          <form className="my-word-form" onSubmit={submit}>
            <input value={form.term} onChange={set('term')} required maxLength={80}
              placeholder={{ en: 'Từ tiếng Anh *', zh: 'Chữ Hán *', ja: 'Từ tiếng Nhật *' }[lang]} lang={INPUT_LANG[lang]} />
            <input value={form.phonetic} onChange={set('phonetic')} maxLength={80} placeholder={PHONETIC_LABEL[lang]} />
            <input value={form.meaning_vi} onChange={set('meaning_vi')} required maxLength={200} placeholder="Nghĩa tiếng Việt *" />
            <input value={form.example} onChange={set('example')} maxLength={300} placeholder="Câu ví dụ (không bắt buộc)" />
            <input value={form.example_vi} onChange={set('example_vi')} maxLength={300} placeholder="Dịch câu ví dụ" />
            <button className="btn primary" disabled={saving}>{saving ? 'Đang lưu…' : '＋ Thêm từ'}</button>
          </form>
          {error && <div className="error">{error}</div>}

          {cards.length === 0 ? (
            <div className="muted small">Chưa có từ nào. Thêm ở ô trên, hoặc tìm từ rồi bấm “＋ Của tôi”.</div>
          ) : (
            <table className="word-table">
              <thead><tr><th>Từ</th><th>{PHONETIC_LABEL[lang]}</th><th>Nghĩa</th><th>Ví dụ</th><th /></tr></thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id}>
                    <td className={isCJK(lang) ? `hanzi-cell ${scriptClass(lang)}` : ''}>
                      <strong>{c.term}</strong> {c.repetitions >= 2 && <span title="Đã thuộc">✅</span>}
                    </td>
                    <td className="muted">{c.phonetic}</td>
                    <td>{c.meaning_vi}</td>
                    <td className="small">{c.example}<div className="muted">{c.example_vi}</div></td>
                    <td className="nowrap">
                      <SpeakButton text={c.term} lang={lang} />
                      <button className="btn ghost sm" onClick={() => remove(c)} aria-label={`Xoá ${c.term}`}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
