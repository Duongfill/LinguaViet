import { useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
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
    ['/quiz', 'Quiz', '❓'],
    ['/speak', 'Phát âm', '🎤'],
    ...(lang === 'zh' ? [['/hanzi', 'Chữ Hán', '✍️']] : []),
    ['/rank', 'Xếp hạng', '🏆'],
    ['/settings', 'Cài đặt', '⚙️'],
  ];
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">📚 LinguaViet</div>
        <div className="lang-switch" role="tablist" aria-label="Chọn ngôn ngữ">
          {Object.entries(LANG_INFO).map(([k, v]) => (
            <button key={k} role="tab" aria-selected={lang === k} className={lang === k ? 'active' : ''} onClick={() => setLang(k)}>
              {v.flag} {v.label}
            </button>
          ))}
        </div>
        <div className="user">
          {myLevel && (
            <button className="btn sm level-btn" onClick={() => setPicking(true)} title="Đổi trình độ">
              🎯 {levelShort(myLevel)} ▾
            </button>
          )}
          <span className="muted">{user.name}</span>
          <button className="btn ghost sm" onClick={logout}>Đăng xuất</button>
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
          <Route path="/hanzi" element={lang === 'zh' ? <Hanzi /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      </>
      )}
    </div>
  );
}
