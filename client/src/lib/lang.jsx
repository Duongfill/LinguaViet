import { createContext, useContext, useState } from 'react';

const KEY = 'langapp.lang';
const LangCtx = createContext(null);

export const LANG_INFO = {
  en: { label: 'Tiếng Anh', short: 'Anh', flag: '🇬🇧', phonetic: 'IPA' },
  zh: { label: 'Tiếng Trung', short: 'Trung', flag: '🇨🇳', phonetic: 'Pinyin' },
  ja: { label: 'Tiếng Nhật', short: 'Nhật', flag: '🇯🇵', phonetic: 'Kana' },
};

// Tiếng Trung / Nhật: chữ tượng hình, không cách chữ bằng dấu cách
export const isCJK = (l) => l === 'zh' || l === 'ja';
// Lớp CSS cho chữ: 'zh' (font + cỡ chữ Hán); tiếng Nhật thêm 'ja' để dùng font Nhật
export const scriptClass = (l) => (l === 'zh' ? 'zh' : l === 'ja' ? 'zh ja' : '');
// Thuộc tính lang cho ô nhập (bàn phím điện thoại chọn đúng ngôn ngữ)
export const INPUT_LANG = { en: 'en', zh: 'zh-CN', ja: 'ja' };
export const PHONETIC_LABEL = { en: 'Phiên âm', zh: 'Pinyin', ja: 'Cách đọc' };
// Katakana → hiragana (để so khớp cách đọc)
export const toHiragana = (s) => s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { const v = localStorage.getItem(KEY); return LANG_INFO[v] ? v : 'en'; } catch { return 'en'; }
  });
  const setLang = (l) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  };
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
