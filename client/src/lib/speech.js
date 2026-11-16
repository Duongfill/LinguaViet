// Text-to-speech và nhận dạng giọng nói qua Web Speech API (Chrome/Edge hỗ trợ tốt nhất)
export const LOCALE = { en: 'en-US', zh: 'zh-CN' };

let voicesCache = [];
function loadVoices() {
  if (typeof speechSynthesis === 'undefined') return [];
  voicesCache = speechSynthesis.getVoices();
  return voicesCache;
}
if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

export const ttsSupported = () => typeof speechSynthesis !== 'undefined';

export function speak(text, lang, rate = 0.9) {
  if (!ttsSupported() || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LOCALE[lang] || lang;
  u.rate = rate;
  const prefix = u.lang.slice(0, 2);
  const voices = voicesCache.length ? voicesCache : loadVoices();
  const voice = voices.find((v) => v.lang === u.lang) || voices.find((v) => v.lang?.startsWith(prefix));
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const sttSupported = () => !!Recognition;

const STT_ERRORS = {
  'not-allowed': 'Trình duyệt chưa cho phép dùng micro. Hãy cấp quyền micro cho trang này.',
  'service-not-allowed': 'Trình duyệt chưa cho phép nhận dạng giọng nói.',
  'no-speech': 'Không nghe thấy giọng nói, hãy bấm mic và đọc lại.',
  'audio-capture': 'Không mở được micro (có thể ứng dụng khác đang dùng micro).',
  network: 'Lỗi mạng khi nhận dạng giọng nói, hãy thử lại.',
  'language-not-supported': 'Thiết bị chưa hỗ trợ nhận dạng ngôn ngữ này.',
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_LISTEN_MS = 12000; // tự dừng nếu nghe quá lâu

// Chrome chỉ cho một phiên nhận dạng chạy tại một thời điểm. Nếu phiên cũ chưa kết thúc hẳn
// (vd. vừa bấm Sau/Trước khi đang nghe) mà đã start phiên mới thì phiên mới lỗi "aborted"
// hoặc không nghe được gì — nên phải huỷ phiên cũ và chờ nó nhả micro ('end') rồi mới bắt đầu.
let active = null; // { rec, ended: Promise<void> }

// Dừng phiên đang nghe (khi chuyển từ hoặc rời trang)
export function stopListening() {
  if (active) { try { active.rec.abort(); } catch { /* đã dừng */ } }
}

// Nghe một lần. Trả về { promise, abort, stop }:
// - promise → { transcripts: string[], aborted?: boolean }; chỉ kết thúc khi trình duyệt đã nhả micro
// - abort(): huỷ, promise trả { aborted: true } (không coi là lỗi)
// - stop(): dừng nghe và chấm phần đã nói
export function listen(lang) {
  let rec = null;
  let cancelled = false;
  let stopRequested = false;
  const promise = (async () => {
    // Chờ phiên cũ nhả micro; dừng giọng đọc mẫu để mic không thu lại tiếng máy
    if (active) { const prev = active; stopListening(); await Promise.race([prev.ended, wait(1000)]); }
    if (ttsSupported()) speechSynthesis.cancel();
    if (cancelled) return { transcripts: [], aborted: true };

    rec = new Recognition();
    rec.lang = LOCALE[lang] || lang;
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 5;
    let markEnded;
    const me = { rec, ended: new Promise((r) => { markEnded = r; }) };
    active = me;

    return new Promise((resolve, reject) => {
      let result = null;
      let error = null;
      const finish = () => { markEnded(); if (active === me) active = null; };
      const timer = setTimeout(() => { try { rec.stop(); } catch { /* bỏ qua */ } }, MAX_LISTEN_MS);
      rec.onresult = (e) => {
        result = Array.from(e.results[0] || []).map((a) => a.transcript);
        try { rec.stop(); } catch { /* bỏ qua */ }
      };
      rec.onerror = (e) => { error = e.error; };
      rec.onend = () => {
        clearTimeout(timer);
        finish();
        if (result) resolve({ transcripts: result });
        else if (cancelled || error === 'aborted') resolve({ transcripts: [], aborted: true });
        else if (error) reject(new Error(STT_ERRORS[error] || `Lỗi nhận dạng giọng nói (${error}), hãy thử lại.`));
        else resolve({ transcripts: [] });
      };
      try {
        rec.start();
        if (stopRequested) rec.stop();
      } catch {
        clearTimeout(timer);
        finish();
        reject(new Error('Micro đang bận, hãy bấm lại sau 1 giây.'));
      }
    });
  })();
  return {
    promise,
    abort: () => { cancelled = true; try { rec?.abort(); } catch { /* bỏ qua */ } },
    stop: () => { stopRequested = true; try { rec?.stop(); } catch { /* bỏ qua */ } },
  };
}

// Chuẩn hoá để so sánh: bỏ dấu câu, chữ thường
function normalize(s, lang) {
  let t = s.toLowerCase().replace(/[.,!?;:'"，。！？；：、“”‘’\s]/g, lang === 'zh' ? '' : ' ');
  return t.replace(/\s+/g, ' ').trim();
}

function levenshtein(a, b) {
  const A = [...a], B = [...b];
  const dp = Array.from({ length: A.length + 1 }, (_, i) => [i, ...Array(B.length).fill(0)]);
  for (let j = 1; j <= B.length; j++) dp[0][j] = j;
  for (let i = 1; i <= A.length; i++)
    for (let j = 1; j <= B.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
  return dp[A.length][B.length];
}

// Điểm 0..100 = độ giống nhau giữa câu mẫu và kết quả nhận dạng tốt nhất
export function scorePronunciation(target, transcripts, lang) {
  const t = normalize(target, lang);
  let best = { score: 0, heard: transcripts[0] || '' };
  for (const h of transcripts) {
    const n = normalize(h, lang);
    const len = Math.max([...t].length, [...n].length) || 1;
    const score = Math.round((1 - levenshtein(t, n) / len) * 100);
    if (score > best.score) best = { score, heard: h };
  }
  return best;
}
