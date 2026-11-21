import { Fragment } from 'react';
import { scriptClass } from '../lib/lang.jsx';

// ---------- Công thức tô màu theo vai trò ----------
const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const ROLE_LABEL = { subj: 'Chủ ngữ', verb: 'Động từ', obj: 'Danh từ / tân ngữ', adj: 'Tính từ', adv: 'Trạng từ', wh: 'Từ hỏi', fixed: 'Từ cố định', opt: 'Có thể bỏ' };

function roleOf(raw) {
  const t = raw.replace(/^[(（]|[)）]$/g, '').replace(/[?？!！。.…]+$/, '').trim();
  if (!t) return null;
  if (VI.test(t) && !/^[A-Za-z0-9\s/\-.,?!…+]+$/.test(t)) return 'note';
  if (/^(S|S1|S2|Subject|主語|主语|代词)$/i.test(t) && t !== 's') return 'subj';
  if (/^(O|O1|O2|N|N1|N2|N3|Noun|danh từ|人|物)([\s/(（].*)?$/i.test(t) || /^N[\s(（]/.test(t)) return 'obj';
  if (/^(V|V\d|V-ing|V-ed|V3|V2|Vて|Vた|Vない|Vます|V辞書形|V普通形|V\s*[A-Za-z]*|Ving|P\.?P\.?)([\s/(（\-].*)?$/.test(t) || /^V[぀-ヿ一-鿿]/.test(t)) return 'verb';
  if (/^(Adj|adj|A|Aい|Aな|Adj1|Adj2|tính từ|形容詞)([\s/(（\-].*)?$/i.test(t)) return 'adj';
  if (/^(Adv|adv|trạng từ)([\s/(（].*)?$/i.test(t)) return 'adv';
  if (/^(Wh|Wh-word|疑問詞|疑问词)/i.test(t)) return 'wh';
  return 'fixed';
}

// Tách công thức thành các khối; trả về null nếu không đủ cấu trúc để vẽ khối
export function parseFormula(f, lang) {
  if (/^例|^Ví dụ/.test(f) || / · /.test(f)) return null;
  // Bỏ phần chú thích tiếng Việt đứng cuối trong ngoặc: "N を V (tân ngữ)"
  let s = f.replace(/\s*[(（][^()（）]*[)）]\s*$/, (m) => (VI.test(m) ? '' : m)).trim();
  let parts = s.includes('+') ? s.split(/\s*\+\s*/) : (lang === 'ja' ? s.split(/\s+/) : [s]);
  parts = parts.map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 9) return null;
  const toks = parts.map((raw) => {
    const optional = /^[(（].*[)）]$/.test(raw);
    const role = roleOf(raw);
    return { raw: optional ? raw.replace(/^[(（]|[)）]$/g, '') : raw, role, optional };
  });
  if (toks.some((t) => !t.role)) return null;
  return toks;
}

export function FormulaBlocks({ formulas, lang }) {
  return (
    <div className="gk-formulas">
      {formulas.map((f) => {
        const toks = parseFormula(f, lang);
        if (!toks) return <div key={f} className={`gk-formula-plain ${scriptClass(lang)}`}>{f}</div>;
        return (
          <div key={f} className="gk-formula">
            {toks.map((t, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="gk-plus">+</span>}
                <span className={`gk-block r-${t.role} ${t.optional ? 'opt' : ''} ${scriptClass(lang)}`}>
                  {t.raw}
                  {t.role !== 'note' && <small>{t.optional ? 'có thể bỏ' : ROLE_LABEL[t.role]}</small>}
                </span>
              </Fragment>
            ))}
          </div>
        );
      })}
      <div className="gk-legend">
        {['subj', 'verb', 'obj', 'adj', 'fixed'].map((r) => <span key={r} className={`gk-dot r-${r}`}>{ROLE_LABEL[r]}</span>)}
      </div>
    </div>
  );
}

// Các từ cố định của công thức đầu tiên → dùng để tô sáng trong câu ví dụ
export function keyWordsOf(point, lang) {
  const out = new Set();
  for (const f of point.formula.slice(0, 2)) {
    const toks = parseFormula(f, lang);
    if (!toks) continue;
    for (const t of toks) {
      if (t.role !== 'fixed') continue;
      for (const w of t.raw.split('/')) {
        const x = w.replace(/[()（）…~〜+\-?!"]/g, '').trim();
        if (!x || VI.test(x) || x.length > 14) continue;
        if (lang === 'en' && !/^[A-Za-z']+$/.test(x)) continue;
        out.add(x);
      }
    }
  }
  return [...out].sort((a, b) => b.length - a.length);
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function Highlight({ text, words, lang }) {
  if (!words.length) return text;
  const body = words.map(esc).join('|');
  const re = lang === 'en' ? new RegExp(`\\b(${body})\\b`, 'gi') : new RegExp(`(${body})`, 'g');
  const out = []; let last = 0; let m; let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={k++}>{text.slice(last, m.index)}</Fragment>);
    out.push(<mark key={k++} className="gk-hl">{m[0]}</mark>);
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < text.length) out.push(<Fragment key={k++}>{text.slice(last)}</Fragment>);
  return out;
}

// ---------- Dòng thời gian ----------
const TIMELINE = {
  habit: { title: 'Lặp đi lặp lại / sự thật', dots: [50, 90, 130, 170, 210, 250, 290] },
  now: { title: 'Đúng lúc nói', dots: [170] },
  'now-range': { title: 'Đang diễn ra quanh lúc nói', bar: [125, 215] },
  'past-point': { title: 'Một mốc đã xong trong quá khứ', dots: [80] },
  'past-range': { title: 'Kéo dài rồi kết thúc trong quá khứ', bar: [45, 125] },
  'past-interrupt': { title: 'Đang diễn ra thì bị việc khác xen vào', bar: [40, 135], dots: [100], dotY: 28, dotLabel: 'xen vào' },
  'past-before-past': { title: 'Việc xảy ra trước một việc quá khứ khác', dots: [60, 120], nums: ['1', '2'] },
  'past-to-now': { title: 'Bắt đầu từ quá khứ, kéo dài tới bây giờ', bar: [55, 170], arrow: true },
  'past-result': { title: 'Xảy ra trong quá khứ, kết quả còn tới bây giờ', dots: [80], dashTo: 170 },
  'future-point': { title: 'Một mốc trong tương lai', dots: [250] },
  'future-range': { title: 'Diễn ra suốt một khoảng trong tương lai', bar: [220, 295] },
  'future-near': { title: 'Sắp xảy ra / đã có dự định', dots: [225], dashFrom: 170 },
  'future-before-future': { title: 'Xong trước một mốc trong tương lai', dots: [225, 285], nums: ['1', '2'] },
};

export function Timeline({ kind }) {
  const t = TIMELINE[kind];
  if (!t) return null;
  const Y = 56;
  return (
    <div className="gk-timeline">
      <svg viewBox="0 0 330 100" role="img" aria-label={t.title}>
        <line x1="10" y1={Y} x2="318" y2={Y} className="tl-axis" />
        <polygon points={`318,${Y - 5} 328,${Y} 318,${Y + 5}`} className="tl-axis-head" />
        <line x1="170" y1={Y - 22} x2="170" y2={Y + 10} className="tl-now" />
        <text x="170" y="14" textAnchor="middle" className="tl-label now">Bây giờ</text>
        <text x="10" y="92" className="tl-label">Quá khứ</text>
        <text x="320" y="92" textAnchor="end" className="tl-label">Tương lai</text>
        {t.dashTo && <line x1={t.dots[0]} y1={Y} x2={t.dashTo} y2={Y} className="tl-dash" />}
        {t.dashTo && <polygon points={`${t.dashTo},${Y - 6} ${t.dashTo + 9},${Y} ${t.dashTo},${Y + 6}`} className="tl-dash-head" />}
        {t.dashFrom && <line x1={t.dashFrom} y1={Y} x2={t.dots[0]} y2={Y} className="tl-dash" />}
        {t.bar && <rect x={t.bar[0]} y={Y - 9} width={t.bar[1] - t.bar[0]} height="18" rx="9" className="tl-bar" />}
        {t.arrow && <polygon points={`${t.bar[1]},${Y - 8} ${t.bar[1] + 10},${Y} ${t.bar[1]},${Y + 8}`} className="tl-bar-head" />}
        {(t.dots || []).map((x, i) => (
          <g key={i}>
            <circle cx={x} cy={t.dotY || Y} r="9" className="tl-dot" />
            {t.nums && <text x={x} y={Y + 4} textAnchor="middle" className="tl-num">{t.nums[i]}</text>}
            {t.dotLabel && <text x={x} y={(t.dotY || Y) - 14} textAnchor="middle" className="tl-label">{t.dotLabel}</text>}
          </g>
        ))}
      </svg>
      <div className="small muted gk-timeline-cap">{t.title}</div>
    </div>
  );
}

// ---------- Tìm chỗ sai: so sánh câu sai với câu đúng ----------
const norm = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[\p{P}\p{S}\s]/gu, '');

export function tokenize(s, lang) {
  if (lang === 'en') return s.split(/\s+/).filter(Boolean);
  return [...s].filter((c) => c.trim());
}

// Trả về chỉ số các token của câu sai không có trong câu đúng (LCS)
export function wrongIndexes(wrong, right, lang) {
  const a = tokenize(wrong, lang).map(norm); const b = tokenize(right, lang).map(norm);
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const keep = new Set(); let i = 0; let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { keep.add(i); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return a.map((_, k) => k).filter((k) => !keep.has(k) && a[k]);
}
