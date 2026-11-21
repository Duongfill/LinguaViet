import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import KANA_STROKES from '../data/kana-strokes.json';

const startOf = (d) => { const m = /^[Mm]\s*(-?[\d.]+)[ ,]\s*(-?[\d.]+)/.exec(d); return m ? [Number(m[1]), Number(m[2])] : [0, 0]; };

// Hoạt ảnh thứ tự nét của một ký tự kana (dữ liệu nét: KanjiVG, CC BY-SA 3.0)
export function KanaStroke({ char, size = 200 }) {
  const strokes = KANA_STROKES[char];
  const [run, setRun] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => { setRun((r) => r + 1); }, [char]);
  if (!strokes) return <div className="muted small">Chưa có dữ liệu nét cho “{char}”.</div>;
  return (
    <div className="kana-stroke">
      <svg viewBox="0 0 109 109" width={size} height={size} className="hanzi-box kana-svg" role="img" aria-label={`Thứ tự nét của ${char}`}>
        <g className="ks-ghost">{strokes.map((d, i) => <path key={i} d={d} />)}</g>
        <g key={run} className={`ks-live ${still ? 'still' : ''}`}>
          {strokes.map((d, i) => <path key={i} d={d} pathLength="1" style={{ animationDelay: `${i * 0.8}s` }} />)}
          {strokes.map((d, i) => {
            const [x, y] = startOf(d);
            return <g key={`n${i}`} className="ks-num" style={{ animationDelay: `${i * 0.8}s` }}>
              <circle cx={x} cy={y} r="5" /><text x={x} y={y + 3} textAnchor="middle">{i + 1}</text>
            </g>;
          })}
        </g>
      </svg>
      <div className="row center" style={{ marginTop: 6 }}>
        <button className="btn ghost sm" onClick={() => { setStill(false); setRun((r) => r + 1); }}>▶ Xem lại</button>
        <button className="btn ghost sm" onClick={() => { setStill(true); setRun((r) => r + 1); }}>Hiện đủ nét</button>
      </div>
    </div>
  );
}

// Hoạt ảnh + tập viết chữ Hán (hanzi-writer)
export function HanziStroke({ char, size = 200 }) {
  const box = useRef(null);
  const writer = useRef(null);
  const [quiz, setQuiz] = useState(false);
  useEffect(() => {
    if (!box.current) return undefined;
    box.current.innerHTML = '';
    setQuiz(false);
    const w = HanziWriter.create(box.current, char, { width: size, height: size, padding: 10, showOutline: true, strokeAnimationSpeed: 1, delayBetweenStrokes: 250 });
    writer.current = w;
    w.animateCharacter();
    return () => { writer.current = null; };
  }, [char, size]);
  return (
    <div className="kana-stroke">
      <div ref={box} className="hanzi-box" style={{ width: size, height: size }} />
      <div className="row center" style={{ marginTop: 6 }}>
        <button className="btn ghost sm" onClick={() => { writer.current?.cancelQuiz(); setQuiz(false); writer.current?.animateCharacter(); }}>▶ Xem lại</button>
        <button className={`btn sm ${quiz ? 'primary' : ''}`} onClick={() => { setQuiz(true); writer.current?.quiz(); }}>✍️ Tự viết từng nét</button>
      </div>
    </div>
  );
}

// Tập viết theo nét mờ: vẽ bằng ngón tay / chuột lên khung
export function TracePad({ glyph, kana = false, className = '', size = 220 }) {
  const cv = useRef(null);
  const drawing = useRef(false);
  const [guide, setGuide] = useState(true);
  const strokes = kana ? KANA_STROKES[glyph] : null;

  const clear = () => { const c = cv.current; if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height); };
  useEffect(clear, [glyph]);
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr; c.height = size * dpr;
  }, [size]);

  const pos = (e) => {
    const r = cv.current.getBoundingClientRect();
    return [(e.clientX - r.left) * (cv.current.width / r.width), (e.clientY - r.top) * (cv.current.height / r.height)];
  };
  const down = (e) => {
    e.preventDefault();
    cv.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const ctx = cv.current.getContext('2d');
    const [x, y] = pos(e);
    ctx.lineWidth = 7 * (window.devicePixelRatio || 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = getComputedStyle(cv.current).color;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.01, y); ctx.stroke();
  };
  const move = (e) => {
    if (!drawing.current) return;
    const ctx = cv.current.getContext('2d');
    const [x, y] = pos(e);
    ctx.lineTo(x, y); ctx.stroke();
  };
  const up = () => { drawing.current = false; };

  return (
    <div className="kana-stroke">
      <div className="trace-box hanzi-box" style={{ width: size, height: size }}>
        {guide && (strokes
          ? <svg viewBox="0 0 109 109" className="trace-guide"><g className="ks-ghost strong">{strokes.map((d, i) => <path key={i} d={d} />)}</g></svg>
          : <div className={`trace-guide trace-text ${className}`} style={{ fontSize: size * 0.72 }}>{glyph}</div>)}
        <canvas ref={cv} className="trace-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
      </div>
      <div className="row center" style={{ marginTop: 6 }}>
        <button className="btn ghost sm" onClick={clear}>🧽 Xoá</button>
        <button className="btn ghost sm" onClick={() => setGuide((g) => !g)}>{guide ? 'Ẩn nét mờ' : 'Hiện nét mờ'}</button>
      </div>
    </div>
  );
}
