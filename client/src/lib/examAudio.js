// Phát bài nghe TOEIC / IELTS bằng giọng máy: mỗi người nói một giọng (nam / nữ), đọc lần lượt từng dòng
import { getRateFactor, getVoiceChoice, ttsSupported, voicesFor } from './speech.js';

const FEMALE = /Samantha|Karen|Moira|Tessa|Fiona|Victoria|Allison|Ava|Susan|Zira|Aria|Jenny|Sonia|Libby|Natasha|Clara|Emma|Michelle|Female|Serena|Kate|Hazel|Catherine|Kathy|Shelley|Sandy|Flo|Grandma|Google US English/i;
const MALE = /Daniel|Alex|Fred|Tom\b|Aaron|Arthur|Gordon|Rishi|David|Mark|Guy|Ryan|Christopher|Eric|Brian|Andrew|William|Liam|Male|George|James|Thomas|Oliver|Eddy|Reed|Rocko|Grandpa|Ralph/i;

// Gán giọng cho M, W, M2, W2, N. Thiếu giọng nam/nữ thì dùng chung giọng nhưng đổi cao độ để phân biệt.
export function castVoices() {
  const list = voicesFor('en');
  const chosen = list.find((v) => v.voiceURI === getVoiceChoice('en'));
  const females = list.filter((v) => FEMALE.test(v.name) && !MALE.test(v.name));
  const males = list.filter((v) => MALE.test(v.name));
  if (chosen && FEMALE.test(chosen.name)) females.unshift(chosen);
  if (chosen && MALE.test(chosen.name)) males.unshift(chosen);
  const any = list[0] || null;
  const pick = (arr, i) => arr[i] || arr[0] || null;
  const W = pick(females, 0) || any, W2 = pick(females, 1) || W;
  const M = pick(males, 0) || any, M2 = pick(males, 1) || M;
  const same = (a, b) => a && b && a.voiceURI === b.voiceURI;
  return {
    W: { voice: W, pitch: 1 },
    W2: { voice: W2, pitch: same(W, W2) ? 1.2 : 1 },
    M: { voice: M, pitch: same(M, W) ? 0.75 : 1 },
    M2: { voice: M2, pitch: same(M2, M) ? (same(M, W) ? 0.6 : 0.85) : 1 },
    N: { voice: W, pitch: 1 },
  };
}

// Chỉ một bài nghe phát tại một thời điểm: phát bài mới thì bài cũ dừng (và báo onEnd để nút của nó trở lại)
let current = null;

// Đọc lần lượt các dòng [{s, t}]; trả về { stop }. onLine(i) báo dòng đang đọc, onEnd() khi xong hoặc bị dừng.
export function playLines(lines, { onLine, onEnd, rate = 0.95, gap = 450 } = {}) {
  current?.stop();
  if (!ttsSupported() || !lines?.length) { onEnd?.(); return { stop() {} }; }
  const cast = castVoices();
  let i = 0, stopped = false, timer = null;
  speechSynthesis.cancel();
  const next = () => {
    if (stopped) return;
    if (i >= lines.length) { onEnd?.(); return; }
    const line = lines[i];
    onLine?.(i);
    const role = cast[line.s] || cast.N;
    const u = new SpeechSynthesisUtterance(line.t);
    if (role.voice) { u.voice = role.voice; u.lang = role.voice.lang.replace('_', '-'); } else u.lang = 'en-US';
    u.pitch = role.pitch;
    u.rate = Math.min(2, Math.max(0.3, rate * getRateFactor()));
    u.onend = () => { i++; timer = setTimeout(next, gap); };
    u.onerror = () => { i++; timer = setTimeout(next, gap); };
    speechSynthesis.speak(u);
  };
  const ctl = {
    stop() {
      if (stopped) return;
      stopped = true; clearTimeout(timer); speechSynthesis.cancel();
      if (current === ctl) current = null;
      onEnd?.();
    },
  };
  current = ctl;
  next();
  return ctl;
}

// TOEIC Part 2: câu hỏi + 3 câu đáp (A), (B), (C) do người khác giới đọc
export function part2Lines(group) {
  const q = group.audio?.[0] || { s: 'W', t: '' };
  const other = q.s.startsWith('W') ? 'M' : 'W';
  const opts = group.blocks?.[0]?.questions?.[0]?.options || [];
  return [q, ...opts.map((o, i) => ({ s: other, t: `${'ABC'[i]}. ${o}` }))];
}
