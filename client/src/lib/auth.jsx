import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api('/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const handle = (d) => { setToken(d.token); setUser(d.user); };
  const value = {
    user,
    loading,
    login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }).then(handle),
    register: (name, email, password) => api('/auth/register', { method: 'POST', body: { name, email, password } }).then(handle),
    logout: () => { setToken(null); setUser(null); },
    refresh: () => api('/me').then((d) => setUser(d.user)),
    setLevel: (lang, level) => api('/me/level', { method: 'PUT', body: { lang, level } })
      .then((d) => setUser((u) => ({ ...u, levels: d.levels }))),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
