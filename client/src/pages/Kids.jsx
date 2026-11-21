import { Link } from 'react-router-dom';
import { useLang, LANG_INFO } from '../lib/lang.jsx';
import { getStars, sfx } from '../components/KidsKit.jsx';

const GAMES = [
  ['/kids/learn', '🖼️', 'Xem hình & nghe', 'Chạm vào hình để nghe đọc', '#ffd6e0'],
  ['/kids/pick', '🎯', 'Chọn đúng hình', 'Nghe rồi chạm đúng hình', '#d6ecff'],
  ['/kids/balloons', '🎈', 'Bắn bóng bay', 'Chạm bóng có hình đúng', '#fff1b8'],
];

// 🧸 Khu của bé: dành cho trẻ dưới 5 tuổi — ít chữ, nút to, có âm thanh và hình động
export default function Kids() {
  const { lang } = useLang();
  const stars = getStars(lang);
  return (
    <div className="kids-wrap page-narrow">
      <div className="kid-hero">
        <div className="kid-mascots" aria-hidden="true">
          {['🐻', '🐰', '🐥', '🦊'].map((e, i) => <span key={e} style={{ animationDelay: `${i * 0.25}s` }}>{e}</span>)}
        </div>
        <h2>Bé học {LANG_INFO[lang].short} nào!</h2>
        <div className="kid-total">⭐ {stars}</div>
        <p className="kid-sub">Ba mẹ ngồi cùng bé nhé — bé chạm hình để nghe và chơi.</p>
      </div>
      <div className="kid-tiles">
        {GAMES.map(([to, icon, title, sub, bg]) => (
          <Link key={to} to={to} className="kid-tile" style={{ background: bg }} onClick={() => sfx.tap()}>
            <span className="kid-tile-icon">{icon}</span>
            <b>{title}</b>
            <small>{sub}</small>
          </Link>
        ))}
      </div>
    </div>
  );
}
