import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const nf = (n) => Number(n || 0).toLocaleString('vi-VN');

export default function Rank() {
  const [rank, setRank] = useState(null);
  const [period, setPeriod] = useState('week');
  const [board, setBoard] = useState(null);

  useEffect(() => { api('/rank').then(setRank); }, []);
  useEffect(() => { setBoard(null); api(`/leaderboard?period=${period}`).then(setBoard); }, [period]);

  if (!rank) return <div className="muted">Đang tải…</div>;
  const t = rank.tier;

  return (
    <div className="stack">
      <h2>🏆 Xếp hạng</h2>

      <div className="card rank-card">
        <div className="rank-icon">{t.icon}</div>
        <div className="rank-info">
          <div className="muted small">Bậc của bạn</div>
          <div className="rank-name">{t.label}</div>
          <div className="small">{nf(rank.xp)} XP · tuần này +{nf(rank.weekXp)} XP · 🔥 {rank.streak} ngày</div>
          {t.next ? (
            <>
              <div className="bar rank-bar"><div style={{ width: `${t.progress}%` }} /></div>
              <div className="small muted">Còn {nf(t.next.remaining)} XP để lên {t.next.icon} {t.next.name}</div>
            </>
          ) : <div className="small">Bạn đã ở bậc cao nhất! 👑</div>}
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <h3>Bảng xếp hạng</h3>
          <div className="seg">
            <button className={period === 'week' ? 'active' : ''} onClick={() => setPeriod('week')}>Tuần này</button>
            <button className={period === 'all' ? 'active' : ''} onClick={() => setPeriod('all')}>Mọi thời điểm</button>
          </div>
        </div>
        {!board ? <div className="muted">Đang tải…</div> : board.top.length === 0 ? (
          <p className="muted">Chưa ai ghi điểm {period === 'week' ? 'tuần này' : ''}. Hãy là người đầu tiên!</p>
        ) : (
          <ol className="leaderboard">
            {board.top.map((r) => (
              <li key={r.position} className={r.me ? 'me' : ''}>
                <span className="lb-pos">{r.position <= 3 ? ['🥇', '🥈', '🥉'][r.position - 1] : r.position}</span>
                <span className="lb-name">{r.name}{r.me && ' (bạn)'}</span>
                <span className="lb-tier small muted">{r.tier.icon} {r.tier.label}</span>
                <span className="lb-xp">{nf(r.xp)} XP</span>
              </li>
            ))}
          </ol>
        )}
        {board?.me && board.me.position > 50 && (
          <div className="small">Vị trí của bạn: #{board.me.position} / {board.participants} · {nf(board.me.xp)} XP</div>
        )}
        {board && !board.me && <div className="small muted">Bạn chưa có điểm {period === 'week' ? 'tuần này' : ''} — học một chút để lên bảng nhé.</div>}
        <div className="small muted">Bảng tuần tính từ thứ Hai. Có thể ẩn tên của bạn trong ⚙️ Cài đặt.</div>
      </div>

      <div className="card">
        <h3>Các bậc</h3>
        <div className="tier-ladder">
          {rank.tiers.map((x) => (
            <div key={x.key} className={`tier ${x.key === t.key ? 'current' : rank.xp >= x.min ? 'passed' : ''}`}>
              <div className="tier-icon">{x.icon}</div>
              <div className="small"><strong>{x.name}</strong></div>
              <div className="small muted">{nf(x.min)} XP</div>
            </div>
          ))}
        </div>
        <div className="small muted">Mỗi bậc (trừ Tập sự và Huyền thoại) chia 3 hạng: III → II → I.</div>
      </div>

      <div className="card">
        <h3>Cách nhận XP</h3>
        <table className="word-table xp-table">
          <tbody>
            <tr><td>🃏 Flashcard nhớ / quên</td><td>+10 / +4</td></tr>
            <tr><td>❓ Quiz đúng / sai</td><td>+10 / +3</td></tr>
            <tr><td>✍️ Viết chữ Hán tốt / chưa tốt</td><td>+15 / +5</td></tr>
            <tr><td>🎤 Phát âm</td><td>+5 + điểm/10 (tối đa +15)</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
