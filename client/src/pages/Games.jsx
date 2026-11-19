import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { LANG_INFO, useLang } from '../lib/lang.jsx';

const GAMES = [
  { key: 'rain', to: '/games/rain', icon: '🌧️', name: 'Mưa từ', desc: 'Từ rơi xuống — chạm đúng nghĩa trước khi chạm đất. 3 mạng, càng lâu càng nhanh.' },
  { key: 'truefalse', to: '/games/truefalse', icon: '⚡', name: 'Đúng hay Sai', desc: '60 giây: từ và nghĩa có khớp không? Đúng liên tiếp để nhân điểm.' },
  { key: 'scramble', to: '/games/scramble', icon: '🔤', name: 'Xếp chữ', desc: 'Xếp các chữ bị xáo trộn thành từ đúng theo nghĩa. 10 từ, có gợi ý.' },
  { key: 'match', to: '/match', icon: '🧩', name: 'Ghép thẻ', desc: 'Ghép 6 cặp từ – nghĩa nhanh nhất có thể.' },
];

// Trang chọn game + kỷ lục của tôi + bảng xếp hạng tuần
export default function Games() {
  const { lang } = useLang();
  const [data, setData] = useState(null);
  const [board, setBoard] = useState('rain');
  useEffect(() => { api(`/games/scores?lang=${lang}`).then(setData).catch(() => setData({ mine: {}, boards: {} })); }, [lang]);
  const rows = data?.boards?.[board] || [];
  return (
    <div className="stack">
      <div className="toolbar"><h2>🎮 Trò chơi từ vựng</h2></div>
      <p className="muted small" style={{ margin: 0 }}>Mỗi từ trả lời đúng +10 XP; từ sai tự vào sổ ⚠️ Từ hay quên. Chọn trình độ, bộ từ hoặc "Từ hay quên" ở màn bắt đầu của mỗi game.</p>
      <div className="game-grid">
        {GAMES.map((g) => (
          <Link key={g.key} to={g.to} className="card game-card">
            <span className="game-icon">{g.icon}</span>
            <strong>{g.name}</strong>
            <span className="small muted">{g.desc}</span>
            <span className="small ok-text">{data?.mine?.[g.key] ? `🏆 ${data.mine[g.key].best} · ${data.mine[g.key].plays} ván` : 'Chưa chơi'}</span>
          </Link>
        ))}
      </div>
      <div className="card stack">
        <div className="toolbar">
          <h3 style={{ margin: 0, marginRight: 'auto' }}>🏅 Bảng xếp hạng tuần · {LANG_INFO[lang].label}</h3>
          <div className="seg">
            {GAMES.map((g) => <button key={g.key} className={board === g.key ? 'active' : ''} onClick={() => setBoard(g.key)} title={g.name}>{g.icon}</button>)}
          </div>
        </div>
        {!data ? <div className="muted">Đang tải…</div> : rows.length === 0 ? <div className="muted small">Tuần này chưa ai chơi {GAMES.find((g) => g.key === board).name}. Hãy là người đầu tiên!</div> : (
          <table className="word-table" style={{ marginTop: 0 }}><tbody>
            {rows.map((r) => (
              <tr key={r.rank} className={r.me ? 'me-row' : ''}>
                <td style={{ width: 40 }}>{['🥇', '🥈', '🥉'][r.rank - 1] || r.rank}</td>
                <td>{r.name}{r.me && ' (bạn)'}</td>
                <td style={{ textAlign: 'right' }}><strong>{r.best}</strong></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </div>
    </div>
  );
}
