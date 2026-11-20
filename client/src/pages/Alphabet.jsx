import { useState } from 'react';
import { useLang } from '../lib/lang.jsx';
import { speak } from '../lib/speech.js';
import SpeakButton from '../components/SpeakButton.jsx';
import { HanziStroke, KanaStroke, TracePad } from '../components/WritingPad.jsx';
import {
  EN_LETTERS, KANA_ROWS, DAKUTEN_ROWS, YOON_ROWS, KANA_SPECIAL, KANA_RULES, toKatakana,
  PINYIN_INITIALS, PINYIN_FINALS, TONES, BASIC_STROKES, STROKE_RULES,
} from '../data/alphabet.js';

const Seg = ({ value, onChange, items }) => (
  <div className="seg">{items.map(([k, label]) => <button key={k} className={value === k ? 'active' : ''} onClick={() => onChange(k)}>{label}</button>)}</div>
);

// ---------- Tiếng Anh ----------
function English() {
  const [sel, setSel] = useState(EN_LETTERS[0]);
  const [view, setView] = useState('trace');
  return (
    <>
      <div className="alpha-grid">
        {EN_LETTERS.map((l) => (
          <button key={l.letter} className={`alpha-cell ${l.vowel ? 'vowel' : ''} ${sel.letter === l.letter ? 'sel' : ''}`} onClick={() => { setSel(l); speak(l.letter, 'en', 0.7); }}>
            <b>{l.letter}{l.lower}</b>
          </button>
        ))}
      </div>
      <div className="small muted">Ô tô màu là <b>nguyên âm</b> (A E I O U); còn lại là phụ âm. Chạm một chữ để nghe tên chữ.</div>
      <div className="card alpha-detail">
        <div className="alpha-big">
          <div className="alpha-letters">{sel.letter}<span>{sel.lower}</span></div>
          <div>Đọc là “<b>{sel.name}</b>” <span className="muted">{sel.ipa}</span></div>
          <div className="row center">
            <SpeakButton text={sel.letter} lang="en" label="Tên chữ" />
            <SpeakButton text={sel.word} lang="en" label={sel.word} />
          </div>
          <div className="muted small"><b>{sel.letter}</b> — {sel.word}: {sel.meaning}</div>
        </div>
        <div>
          <Seg value={view} onChange={setView} items={[['trace', 'Chữ hoa'], ['trace2', 'Chữ thường']]} />
          <div style={{ marginTop: 8 }}><TracePad glyph={view === 'trace' ? sel.letter : sel.lower} /></div>
          <div className="small muted center-text" style={{ marginTop: 6 }}>Đồ theo nét mờ bằng ngón tay hoặc chuột.</div>
        </div>
      </div>
    </>
  );
}

// ---------- Tiếng Nhật ----------
function Japanese() {
  const [tab, setTab] = useState('hira');
  const [sel, setSel] = useState({ kana: 'あ', romaji: 'a' });
  const [view, setView] = useState('watch');
  const kata = tab === 'kata' || tab === 'kata2';
  const rows = tab === 'hira' || tab === 'kata' ? KANA_ROWS : tab === 'hira2' || tab === 'kata2' ? [...DAKUTEN_ROWS, ...YOON_ROWS] : [];
  const conv = (k) => (kata ? toKatakana(k) : k);
  const shown = conv(sel.kana);
  const change = (t) => { setTab(t); const isK = t.startsWith('kata'); setSel((s) => ({ ...s, kana: isK ? toKatakana(s.kana) : s.kana.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)) })); };
  const pick = (c) => { setSel({ kana: c.kana, romaji: c.romaji }); speak(conv(c.kana), 'ja', 0.7); };
  return (
    <>
      <Seg value={tab} onChange={change} items={[['hira', 'Hiragana'], ['kata', 'Katakana'], ['hira2', 'Đục & ghép (あ)'], ['kata2', 'Đục & ghép (ア)']]} />
      <div className="kana-table">
        {rows.map(([label, cells]) => (
          <div key={label} className="kana-row">
            <div className="kana-label small muted">{label}</div>
            {cells.map((c) => (
              <button key={c.kana} className={`alpha-cell kana ja ${conv(c.kana) === shown ? 'sel' : ''}`} onClick={() => pick(c)}>
                <b>{conv(c.kana)}</b><span>{c.romaji}</span>
              </button>
            ))}
          </div>
        ))}
        {rows === KANA_ROWS && (
          <div className="kana-row">
            <div className="kana-label small muted">Đặc biệt</div>
            {KANA_SPECIAL.filter((s) => s.kana !== 'ん').map((c) => (
              <button key={c.kana} className={`alpha-cell kana ja ${conv(c.kana) === shown ? 'sel' : ''}`} onClick={() => pick(c)}>
                <b>{conv(c.kana)}</b><span>{c.romaji}</span>
              </button>
            ))}
            {kata && <button className={`alpha-cell kana ja ${shown === 'ー' ? 'sel' : ''}`} onClick={() => pick({ kana: 'ー', romaji: '(kéo dài)' })}><b>ー</b><span>(kéo dài)</span></button>}
          </div>
        )}
      </div>

      <div className="card alpha-detail">
        <div className="alpha-big">
          <div className="alpha-letters ja">{shown}</div>
          <div>Đọc là “<b>{sel.romaji}</b>”</div>
          <div className="row center"><SpeakButton text={shown} lang="ja" label="Nghe" /></div>
          {KANA_SPECIAL.find((s) => s.kana === sel.kana) && <div className="small muted">{KANA_SPECIAL.find((s) => s.kana === sel.kana).note}</div>}
        </div>
        <div>
          <Seg value={view} onChange={setView} items={[['watch', 'Xem thứ tự nét'], ['trace', 'Tập viết']]} />
          <div className="kana-pair">
            {[...shown].map((ch, i) => (
              <div key={`${ch}${i}${view}`}>
                {view === 'watch' ? <KanaStroke char={ch} size={[...shown].length > 1 ? 150 : 200} /> : <TracePad glyph={ch} kana size={[...shown].length > 1 ? 150 : 220} />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card"><b>Cần nhớ</b><ul className="small">{KANA_RULES.map((r) => <li key={r}>{r}</li>)}</ul></div>
    </>
  );
}

// ---------- Tiếng Trung ----------
function Chinese() {
  const [tab, setTab] = useState('init');
  const [sel, setSel] = useState(null);       // { sym, char, pinyin, meaning }
  const [strokeChar, setStrokeChar] = useState(BASIC_STROKES[0]);
  const list = tab === 'init' ? PINYIN_INITIALS : PINYIN_FINALS;
  return (
    <>
      <Seg value={tab} onChange={(t) => { setTab(t); setSel(null); }} items={[['init', 'Thanh mẫu (21+2)'], ['fin', 'Vận mẫu'], ['tone', '4 thanh điệu'], ['stroke', 'Nét & quy tắc viết']]} />

      {(tab === 'init' || tab === 'fin') && (
        <>
          <div className="alpha-grid zh-grid">
            {list.map((c) => (
              <button key={c.sym} className={`alpha-cell pin ${sel?.sym === c.sym ? 'sel' : ''}`} onClick={() => { setSel(c); speak(c.char, 'zh', 0.7); }}>
                <b>{c.sym}</b><span className="zh">{c.char}</span>
              </button>
            ))}
          </div>
          <div className="small muted">Chạm một ô để nghe chữ ví dụ. Thanh mẫu cần ghép với vận mẫu thành âm tiết (VD: b + à = bà).{tab === 'init' ? ' y, w thực chất là cách viết của i, u khi đứng đầu âm tiết.' : ' ü đọc như “uy” kéo tròn môi; sau j, q, x, y viết thành u (VD: 去 qù).'}</div>
          {sel && (
            <div className="card alpha-detail">
              <div className="alpha-big">
                <div className="alpha-letters">{sel.sym}</div>
                <div className="zh" style={{ fontSize: '2rem' }}>{sel.char}</div>
                <div><b>{sel.pinyin}</b> — {sel.meaning}</div>
                <div className="row center"><SpeakButton text={sel.char} lang="zh" label="Nghe" /><SpeakButton text={sel.char} lang="zh" slow label="Chậm" /></div>
              </div>
              <HanziStroke char={sel.char} />
            </div>
          )}
        </>
      )}

      {tab === 'tone' && (
        <div className="card stack">
          <div className="tone-grid">
            {TONES.map((t) => (
              <button key={t.n} className="alpha-cell tone" onClick={() => speak(t.char, 'zh', 0.7)}>
                <svg viewBox="0 0 40 30" width="52" height="40" aria-hidden="true">
                  <polyline fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    points={{ 1: '4,6 36,6', 2: '4,22 36,6', 3: '4,12 14,24 36,6', 4: '4,5 36,25', 0: '14,18 26,18' }[t.n]} />
                </svg>
                <b>{t.pinyin}</b><span className="zh">{t.char}</span>
              </button>
            ))}
          </div>
          <ul className="small">{TONES.map((t) => <li key={t.n}><b>{t.name}</b> ({t.mark}): {t.tip} VD <span className="zh">{t.char}</span> {t.pinyin} = {t.meaning}.</li>)}</ul>
          <div className="small muted">Dấu thanh đặt trên nguyên âm chính (a &gt; o, e &gt; i, u, ü). Hai thanh 3 liền nhau: chữ đầu đọc thành thanh 2 (你好 nǐ hǎo → ní hǎo).</div>
        </div>
      )}

      {tab === 'stroke' && (
        <>
          <div className="alpha-grid zh-grid">
            {BASIC_STROKES.map((s) => (
              <button key={s.name} className={`alpha-cell pin ${strokeChar.name === s.name ? 'sel' : ''}`} onClick={() => setStrokeChar(s)}>
                <b className="zh">{s.name}</b><span>{s.py}</span>
              </button>
            ))}
          </div>
          <div className="card alpha-detail">
            <div className="alpha-big">
              <div className="alpha-letters zh">{strokeChar.name}</div>
              <div><b>{strokeChar.py}</b> — nét {strokeChar.vi}</div>
              <div className="muted small">Xem trong chữ <b className="zh">{strokeChar.char}</b></div>
              <SpeakButton text={strokeChar.char} lang="zh" label="Nghe" />
            </div>
            <HanziStroke char={strokeChar.char} />
          </div>
          <div className="card"><b>Quy tắc thứ tự nét</b>
            <div className="rule-grid">
              {STROKE_RULES.map((r) => (
                <button key={r.zh} className="chip rule" onClick={() => setStrokeChar({ name: r.zh, py: '', vi: r.vi, char: r.char })}>
                  <span className="zh">{r.zh}</span><span className="small muted">{r.vi}</span>
                </button>
              ))}
            </div>
            <div className="small muted">Chạm một quy tắc để xem chữ ví dụ được viết theo quy tắc đó. Muốn tập viết chữ trong từ vựng, vào mục <b>Chữ Hán</b>.</div>
          </div>
        </>
      )}
    </>
  );
}

export default function Alphabet() {
  const { lang } = useLang();
  const titles = { en: 'Bảng chữ cái tiếng Anh', zh: 'Pinyin & nét chữ Hán', ja: 'Bảng chữ cái tiếng Nhật' };
  return (
    <div className="stack page-narrow">
      <div className="toolbar"><h2>🔠 {titles[lang]}</h2></div>
      {lang === 'en' && <English />}
      {lang === 'ja' && <Japanese />}
      {lang === 'zh' && <Chinese />}
    </div>
  );
}
