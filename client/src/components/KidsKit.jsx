import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KIDS_TOPICS, topicByKey } from '../data/kids.js';

// ---------- Âm thanh vui (tự tạo bằng Web Audio, không cần file) ----------
let actx = null;
function ctx() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!actx) actx = new AC();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  } catch { return null; }
}
function tone(freq, start, dur, { type = 'sine', gain = 0.18, to } = {}) {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (to) o.frequency.exponentialRampToValueAtTime(to, c.currentTime + start + dur);
  g.gain.setValueAtTime(gain, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start); o.stop(c.currentTime + start + dur + 0.02);
}
export const sfx = {
  ok: () => { tone(660, 0, 0.14); tone(880, 0.12, 0.14); tone(1320, 0.24, 0.3); },
  no: () => { tone(330, 0, 0.18, { type: 'triangle', to: 220 }); },
  pop: () => { tone(900, 0, 0.12, { to: 180, gain: 0.25 }); },
  tap: () => { tone(520, 0, 0.08, { gain: 0.1 }); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.26)); },
};

// ---------- Sao: lưu trên máy ----------
const starKey = (lang) => `langapp.kids.stars.${lang}`;
export const getStars = (lang) => { try { return Number(localStorage.getItem(starKey(lang))) || 0; } catch { return 0; } };
export const addStars = (lang, n) => { try { localStorage.setItem(starKey(lang), String(getStars(lang) + n)); } catch { /* bỏ qua */ } };

export const shuffle = (a) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};

// Chủ đề đang chọn lấy từ ?topic=
export function useTopic() {
  const [params, setParams] = useSearchParams();
  const topic = topicByKey(params.get('topic'));
  return [topic, (k) => setParams({ topic: k }, { replace: true })];
}

export function TopicBar({ topic, onChange }) {
  return (
    <div className="kid-topics">
      {KIDS_TOPICS.map((t) => (
        <button key={t.key} className={`kid-topic ${t.key === topic.key ? 'on' : ''}`} onClick={() => { sfx.tap(); onChange(t.key); }}>
          <span>{t.icon}</span><small>{t.label}</small>
        </button>
      ))}
    </div>
  );
}

export function KidsHeader({ title }) {
  return (
    <div className="kid-head">
      <Link to="/kids" className="kid-back" aria-label="Về trang bé">🏠</Link>
      <h2>{title}</h2>
    </div>
  );
}

// Pháo hoa nhỏ tại điểm chạm
export function useBursts() {
  const [bursts, setBursts] = useState([]);
  const id = useRef(0);
  const add = (x, y) => {
    const b = { id: ++id.current, x, y };
    setBursts((l) => [...l, b]);
    setTimeout(() => setBursts((l) => l.filter((o) => o.id !== b.id)), 1000);
  };
  const layer = (
    <>
      {bursts.map((b) => (
        <div key={b.id} className="kid-burst" style={{ left: b.x, top: b.y }}>
          {['⭐', '✨', '💖', '🌟', '🎉', '✨', '⭐', '💫'].map((e, i) => (
            <span key={i} style={{ '--a': `${i * 45}deg` }}>{e}</span>
          ))}
        </div>
      ))}
    </>
  );
  return [add, layer];
}

// Chạm ở đâu thì bắn pháo hoa ở đó (toạ độ tương đối với phần tử bọc)
export function burstAt(e, wrapEl, add) {
  const r = wrapEl.getBoundingClientRect();
  add(e.clientX - r.left, e.clientY - r.top);
}

export function useTimers() {
  const list = useRef([]);
  useEffect(() => () => list.current.forEach(clearTimeout), []);
  return (fn, ms) => { const t = setTimeout(fn, ms); list.current.push(t); return t; };
}

export function StarRow({ n, total }) {
  return <div className="kid-stars">{Array.from({ length: total }, (_, i) => <span key={i} className={i < n ? 'on' : ''} style={{ animationDelay: `${i * 0.12}s` }}>⭐</span>)}</div>;
}
