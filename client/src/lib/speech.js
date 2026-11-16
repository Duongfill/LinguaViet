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

// Trả về Promise<{ transcripts: string[] }>; hàm abort trả kèm để huỷ.
export function listen(lang) {
  const rec = new Recognition();
  rec.lang = LOCALE[lang] || lang;
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  const promise = new Promise((resolve, reject) => {
    let done = false;
    rec.onresult = (e) => {
      done = true;
      const alts = Array.from(e.results[0] || []).map((a) => a.transcript);
      resolve({ transcripts: alts });
    };
    rec.onerror = (e) => { done = true; reject(new Error(e.error === 'not-allowed' ? 'Trình duyệt chưa cho phép dùng micro' : e.error === 'no-speech' ? 'Không nghe thấy giọng nói' : `Lỗi nhận dạng: ${e.error}`)); };
    rec.onend = () => { if (!done) resolve({ transcripts: [] }); };
  });
  rec.start();
  return { promise, abort: () => rec.abort() };
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
