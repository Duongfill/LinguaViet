import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LevelPicker from './components/LevelPicker.jsx';
import { levelShort } from './lib/levels.js';
import { useAuth } from './lib/auth.jsx';
import { LangProvider, LANG_INFO, useLang } from './lib/lang.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Decks from './pages/Decks.jsx';
import Flashcards from './pages/Flashcards.jsx';
import Quiz from './pages/Quiz.jsx';
import Hanzi from './pages/Hanzi.jsx';
import Speak from './pages/Speak.jsx';
import Journey from './pages/Journey.jsx';
import Rank from './pages/Rank.jsx';
import Settings from './pages/Settings.jsx';
import Weak from './pages/Weak.jsx';
import Match from './pages/Match.jsx';
import Dictation from './pages/Dictation.jsx';
import Translate from './pages/Translate.jsx';
import Exams from './pages/Exams.jsx';
import ExamRun from './pages/ExamRun.jsx';
import Writing, { IeltsBankTask } from './pages/Writing.jsx';
import Grammar from './pages/Grammar.jsx';
import Games from './pages/Games.jsx';
import Alphabet from './pages/Alphabet.jsx';
import Kids from './pages/Kids.jsx';
import KidsLearn from './pages/kids/KidsLearn.jsx';
import KidsPick from './pages/kids/KidsPick.jsx';
import KidsBalloons from './pages/kids/KidsBalloons.jsx';
import Rain from './pages/games/Rain.jsx';
import TrueFalse from './pages/games/TrueFalse.jsx';
import Scramble from './pages/games/Scramble.jsx';
import GrammarPoint from './pages/GrammarPoint.jsx';

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Đang tải…</div>;
  if (!user) return <Login />;
  return (
    <LangProvider>
      <Shell />
    </LangProvider>
  );
}

function Shell() {
  const { user, logout } = useAuth();
  const { lang, setLang } = useLang();
  const [picking, setPicking] = useState(false);
  const myLevel = user.levels?.[lang];
  const links = [
    ['/', 'Tổng quan', '🏠'],
    ['/journey', 'Hành trình', '🗺️'],
    ['/decks', 'Bộ từ', '📚'],
    ['/flashcards', 'Flashcard', '🃏'],
    ['/kids', 'Bé học', '🧸'],
    ['/alphabet', 'Bảng chữ cái', '🔠'],
    ['/grammar', 'Ngữ pháp', '📐'],
    ['/weak', 'Từ hay quên', '⚠️'],
    ['/quiz', 'Quiz', '❓'],
    ['/games', 'Trò chơi', '🎮'],
    ['/dictation', 'Chính tả', '🎧'],
    ['/translate', 'Dịch câu', '🔁'],
    ['/writing', 'Luyện viết', '🖊️'],
    ['/speak', 'Phát âm', '🎤'],
    ...(lang === 'en' ? [['/exams', 'Luyện đề TOEIC/IELTS', '📝']] : []),
    ...(lang === 'zh' ? [['/hanzi', 'Chữ Hán', '✍️']] : []),
    ['/rank', 'Xếp hạng', '🏆'],
    ['/settings', 'Cài đặt', '⚙️'],
  ];
  // Điện thoại: 4 mục chính ở thanh đáy, còn lại trong bảng "Thêm"
  const TAB_PATHS = ['/', '/flashcards', '/decks', '/speak'];
  const tabs = TAB_PATHS.map((p) => links.find((l) => l[0] === p));
  const more = links.filter((l) => !TAB_PATHS.includes(l[0]));
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => setMoreOpen(false), [pathname, lang]);
  const inMore = more.some(([to]) => pathname === to);
  // Máy tính: thanh bên trái chia nhóm
  const NAV_GROUPS = [
    ['Học', ['/', '/journey', '/kids', '/alphabet', '/flashcards', '/grammar', '/weak']],
    ['Luyện tập', ['/exams', '/games', '/quiz', '/dictation', '/translate', '/writing', '/speak', '/hanzi']],
    ['Từ vựng', ['/decks']],
    ['Khác', ['/rank', '/settings']],
  ];
  return (
    <div className="app">
      <aside className="sidebar" aria-label="Điều hướng">
        <div className="sb-brand">📚 LinguaViet</div>
        <div className="sb-langs" role="tablist" aria-label="Chọn ngôn ngữ">
          {Object.entries(LANG_INFO).map(([k, v]) => (
            <button key={k} role="tab" aria-selected={lang === k} className={lang === k ? 'active' : ''} onClick={() => setLang(k)}>
              <span aria-hidden>{v.flag}</span> {v.short}
            </button>
          ))}
        </div>
        {myLevel && (
          <button className="sb-level" onClick={() => setPicking(true)} title="Đổi trình độ">
            🎯 Trình độ <strong>{levelShort(myLevel)}</strong> <span aria-hidden>▾</span>
          </button>
        )}
        {myLevel && !picking && (
          <nav className="sb-nav">
            {NAV_GROUPS.map(([title, paths]) => {
              const items = paths.map((p) => links.find((l) => l[0] === p)).filter(Boolean);
              return (
                <div key={title} className="sb-group">
                  <div className="sb-title">{title}</div>
                  {items.map(([to, label, icon]) => (
                    <NavLink key={to} to={to} end={to === '/'}>
                      <span className="ico" aria-hidden>{icon}</span>{label}
                    </NavLink>
                  ))}
                </div>
              );
            })}
          </nav>
        )}
        <div className="sb-foot">
          <span className="muted small" title={user.email}>👤 {user.name}</span>
          <button className="btn ghost sm" onClick={logout}>Đăng xuất</button>
        </div>
      </aside>
      <header className="topbar">
        <div className="brand">📚<span className="brand-text"> LinguaViet</span></div>
        <div className="lang-switch" role="tablist" aria-label="Chọn ngôn ngữ">
          {Object.entries(LANG_INFO).map(([k, v]) => (
            <button key={k} role="tab" aria-selected={lang === k} className={lang === k ? 'active' : ''} onClick={() => setLang(k)}>
              {v.flag} <span className="hide-mobile">{v.label}</span><span className="show-mobile">{v.short}</span>
            </button>
          ))}
        </div>
        <div className="user">
          {myLevel && (
            <button className="btn sm level-btn" onClick={() => setPicking(true)} title="Đổi trình độ">
              🎯 {levelShort(myLevel)} ▾
            </button>
          )}
          <span className="muted hide-mobile">{user.name}</span>
          <button className="btn ghost sm hide-mobile" onClick={logout}>Đăng xuất</button>
        </div>
      </header>
      {!myLevel || picking ? (
        // Chưa chọn trình độ cho ngôn ngữ này -> bắt buộc chọn trước khi học
        <main className="content">
          <LevelPicker key={lang} lang={lang} onboarding={!myLevel} onDone={() => setPicking(false)} />
        </main>
      ) : (
      <>
      <nav className="nav">
        {links.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <span aria-hidden>{icon}</span> {label}
          </NavLink>
        ))}
      </nav>
      <main className="content" key={`${lang}-${myLevel}`}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/journey" element={<Journey />} />
          <Route path="/rank" element={<Rank />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/decks" element={<Decks />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/speak" element={<Speak />} />
          <Route path="/weak" element={<Weak />} />
          <Route path="/match" element={<Match />} />
          <Route path="/alphabet" element={<Alphabet />} />
          <Route path="/kids" element={<Kids />} />
          <Route path="/kids/learn" element={<KidsLearn />} />
          <Route path="/kids/pick" element={<KidsPick />} />
          <Route path="/kids/balloons" element={<KidsBalloons />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/rain" element={<Rain />} />
          <Route path="/games/truefalse" element={<TrueFalse />} />
          <Route path="/games/scramble" element={<Scramble />} />
          <Route path="/dictation" element={<Dictation />} />
          <Route path="/translate" element={<Translate />} />
          <Route path="/writing" element={<Writing />} />
          <Route path="/grammar" element={<Grammar />} />
          <Route path="/grammar/:id" element={<GrammarPoint />} />
          <Route path="/writing/ielts/:id" element={lang === 'en' ? <IeltsBankTask /> : <Navigate to="/writing" />} />
          <Route path="/exams" element={lang === 'en' ? <Exams /> : <Navigate to="/" />} />
          <Route path="/exams/:id/:section" element={lang === 'en' ? <ExamRun /> : <Navigate to="/" />} />
          <Route path="/hanzi" element={lang === 'zh' ? <Hanzi /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <nav className="tabbar" aria-label="Điều hướng">
        {tabs.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <span className="ico" aria-hidden>{icon}</span>{label}
          </NavLink>
        ))}
        <button className={inMore || moreOpen ? 'active' : ''} onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen}>
          <span className="ico" aria-hidden>☰</span>Thêm
        </button>
      </nav>
      {moreOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="sheet" role="dialog" aria-label="Các mục khác">
            <div className="sheet-grid">
              {more.map(([to, label, icon]) => (
                <NavLink key={to} to={to}>
                  <span className="ico" aria-hidden>{icon}</span>{label}
                </NavLink>
              ))}
            </div>
            <div className="sheet-foot">
              <span className="muted small">👤 {user.name}</span>
              <button className="btn ghost sm" onClick={logout}>Đăng xuất</button>
            </div>
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
