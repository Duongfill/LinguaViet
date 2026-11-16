import { createContext, useContext, useState } from 'react';

const KEY = 'langapp.lang';
const LangCtx = createContext(null);

export const LANG_INFO = {
  en: { label: 'Tiếng Anh', flag: '🇬🇧', phonetic: 'IPA' },
  zh: { label: 'Tiếng Trung', flag: '🇨🇳', phonetic: 'Pinyin' },
};

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(KEY) === 'zh' ? 'zh' : 'en'; } catch { return 'en'; }
  });
  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  };
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
