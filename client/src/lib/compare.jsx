// So khớp câu người học gõ / ghép với câu chuẩn — dùng cho Chính tả và Dịch câu.
// lang: 'en' | 'zh' | 'ja' | 'vi'
import { isCJK, scriptClass, toHiragana } from './lang.jsx';

export const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};

// Bỏ dấu thanh pinyin / chữ thường / bỏ khoảng trắng (chấm từ tiếng Trung gõ bằng pinyin, tiếng Nhật gõ kana)
export const loose = (s) => toHiragana(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ü/g, 'v').toLowerCase().replace(/[\s'’.,!?]/g, '');

const CJK_PUNCT = /[\s，。！？；：、“”‘’「」『』・,.!?;:'"()（）…—-]/g;

// Tách câu thành đơn vị để chấm: tiếng Anh / Việt theo từ, tiếng Trung / Nhật theo chữ
export function tokens(s, lang) {
  if (isCJK(lang)) return [...toHiragana(s).replace(CJK_PUNCT, '')];
  return s.normalize('NFC').toLowerCase().replace(/[’]/g, "'").replace(/[^\p{L}\p{N}'\s-]/gu, ' ').split(/\s+/).filter(Boolean);
}

// So khớp dãy chuẩn với dãy người gõ (LCS): đánh dấu đơn vị nào của câu chuẩn đã đúng
export function diff(target, typed) {
  const n = target.length, m = typed.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = target[i] === typed[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hit = new Array(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (target[i] === typed[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return { hit, score: Math.round((dp[0][0] / Math.max(n, m, 1)) * 100) };
}

// Câu chuẩn tô màu: phần đúng xanh, thiếu/sai đỏ (giữ nguyên dấu câu)
export function Marked({ text, lang, hit }) {
  let k = 0;
  if (isCJK(lang)) {
    return <span className={scriptClass(lang)}>{[...text].map((ch, i) => (tokens(ch, lang).length
      ? <span key={i} className={hit[k++] ? 'dict-ok' : 'dict-miss'}>{ch}</span> : <span key={i}>{ch}</span>))}</span>;
  }
  return <span>{text.split(/(\s+)/).map((part, i) => {
    const n = tokens(part, lang).length;
    if (!n) return <span key={i}>{part}</span>;
    const ok = hit.slice(k, k + n).every(Boolean);
    k += n;
    return <span key={i} className={ok ? 'dict-ok' : 'dict-miss'}>{part}</span>;
  })}</span>;
}

// Chia câu thành các "mảnh" để ghép lại: tiếng Anh / Việt theo từ, tiếng Trung / Nhật theo từ (Intl.Segmenter)
const PUNCT_ONLY = /^[\s\p{P}\p{S}]+$/u;
export function pieces(s, lang) {
  if (isCJK(lang) && typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter(lang === 'ja' ? 'ja' : 'zh', { granularity: 'word' });
    const out = [...seg.segment(s)].map((x) => x.segment).filter((x) => !PUNCT_ONLY.test(x));
    if (lang !== 'ja') return out;
    // Tiếng Nhật: gộp đuôi chia của động/tính từ (会 + いま + しょう → 会いましょう), giữ trợ từ đứng riêng
    const PARTICLES = new Set(['は', 'が', 'を', 'に', 'で', 'と', 'も', 'へ', 'の', 'か', 'よ', 'ね', 'や', 'から', 'まで', 'より', 'けど', 'けれど', 'だけ', 'しか']);
    return out.reduce((acc, p) => {
      const prev = acc[acc.length - 1];
      if (prev && /^\p{Script=Hiragana}+$/u.test(p) && !PARTICLES.has(p) && !PARTICLES.has(prev)) acc[acc.length - 1] = prev + p;
      else acc.push(p);
      return acc;
    }, []);
  }
  if (isCJK(lang)) return [...s].filter((x) => !PUNCT_ONLY.test(x));
  const words = s.split(/\s+/).map((w) => w.replace(/^[\p{P}]+|[\p{P}]+$/gu, '')).filter(Boolean);
  // Viết thường chữ đầu câu để không lộ từ nào đứng đầu (trừ "I" và từ viết hoa toàn bộ)
  if (words[0] && words[0] !== 'I' && words[0] !== words[0].toUpperCase()) words[0] = words[0][0].toLowerCase() + words[0].slice(1);
  return words;
}
