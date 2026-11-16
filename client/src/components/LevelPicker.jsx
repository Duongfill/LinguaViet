import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { LANG_INFO } from '../lib/lang.jsx';
import { LEVELS_BY_LANG, LEVEL_DESC, levelLabel } from '../lib/levels.js';

// Màn hình chọn trình độ. onboarding = true khi người dùng chưa chọn lần nào.
export default function LevelPicker({ lang, onDone, onboarding = false }) {
  const { user, setLevel } = useAuth();
  const current = user.levels?.[lang];
  const [counts, setCounts] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/levels').then((d) => setCounts(Object.fromEntries(d.levels.filter((x) => x.lang === lang).map((x) => [x.level, x.total]))));
  }, [lang]);

  const levels = LEVELS_BY_LANG[lang].filter((l) => counts[l]);
  const choose = async (level) => {
    setBusy(level);
    setError('');
    try { await setLevel(lang, level); onDone?.(); }
    catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="stack level-picker">
      <div>
        <h2>{onboarding ? `Trình độ ${LANG_INFO[lang].label} của bạn?` : `Đổi trình độ ${LANG_INFO[lang].label}`}</h2>
        <p className="muted">
          Chọn mức bạn muốn bắt đầu. Flashcard sẽ đưa từ mới từ mức này trở lên, bỏ qua các mức thấp hơn.
          Quiz, phát âm{lang === 'zh' ? ', luyện viết' : ''} mặc định dùng từ của mức này. Bạn có thể đổi bất cứ lúc nào.
        </p>
      </div>
      <div className="level-grid">
        {levels.map((l, i) => (
          <button key={l} className={`card level-option ${current === l ? 'current' : ''}`} onClick={() => choose(l)} disabled={!!busy}>
            <div className="level-head">
              <strong>{levelLabel(l)}</strong>
              {current === l && <span className="badge">Đang chọn</span>}
              {i === 0 && current !== l && <span className="badge soft">Mới bắt đầu</span>}
            </div>
            <div className="small">{LEVEL_DESC[l]}</div>
            <div className="muted small">{counts[l]} từ{busy === l ? ' · đang lưu…' : ''}</div>
          </button>
        ))}
      </div>
      {error && <div className="error">{error}</div>}
      {!onboarding && <button className="btn ghost" onClick={onDone}>Huỷ</button>}
    </div>
  );
}
