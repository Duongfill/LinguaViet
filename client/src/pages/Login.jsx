import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth" onSubmit={submit}>
        <h1>📚 LinguaViet</h1>
        <p className="muted">Học tiếng Anh 🇬🇧 và tiếng Trung 🇨🇳 mỗi ngày</p>
        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Đăng nhập</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Đăng ký</button>
        </div>
        {mode === 'register' && (
          <label>Tên hiển thị<input value={form.name} onChange={set('name')} required autoComplete="name" /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
        <label>Mật khẩu<input type="password" value={form.password} onChange={set('password')} required minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</button>
      </form>
    </div>
  );
}
