// Text-to-speech và nhận dạng giọng nói qua Web Speech API (Chrome/Edge hỗ trợ tốt nhất)
export const LOCALE = { en: 'en-US', zh: 'zh-CN', ja: 'ja-JP' };

let voicesCache = [];
const voiceListeners = new Set();
function loadVoices() {
  if (typeof speechSynthesis === 'undefined') return [];
  voicesCache = speechSynthesis.getVoices();
  voiceListeners.forEach((fn) => fn());
  return voicesCache;
}
if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', loadVoices);
  else speechSynthesis.onvoiceschanged = loadVoices;
}
// Danh sách giọng của trình duyệt có thể tới muộn → trang Cài đặt đăng ký nghe để vẽ lại
export function onVoicesChanged(fn) { voiceListeners.add(fn); return () => voiceListeners.delete(fn); }

export const ttsSupported = () => typeof speechSynthesis !== 'undefined';

// ---------- Chọn giọng ----------
// Giọng phổ biến (theo thứ tự ưu tiên) trên iPhone/Mac, Windows/Edge, Android/Chrome
const POPULAR = {
  en: [/Samantha/i, /Daniel/i, /Karen/i, /Aria/i, /Jenny/i, /Google US English/i, /Google UK English Female/i, /Guy/i, /Zira/i, /David/i, /Moira/i, /Alex/i],
  zh: [/Ting-?Ting/i, /Xiaoxiao/i, /Google 普通话/i, /Mei-?Jia/i, /Yunxi/i, /Huihui/i, /Yaoyao/i, /Kangkang/i, /Li-?li/i],
  ja: [/Kyoko/i, /Otoya/i, /Nanami/i, /Google 日本語/i, /Keita/i, /Hattori/i, /O-?ren/i, /Ayumi/i, /Haruka/i, /Ichiro/i],
};
// Giọng "vui" của Apple — không hợp để học
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox)/i;
const vLang = (v) => (v.lang || '').replace('_', '-');

// Các giọng của một ngôn ngữ trên máy này, giọng phổ biến / tự nhiên lên đầu
export function voicesFor(lang) {
  // Đọc thẳng danh sách hiện tại (rẻ); không gọi loadVoices() vì nó báo cho trang Cài đặt vẽ lại → lặp vô hạn
  const live = ttsSupported() ? speechSynthesis.getVoices() : [];
  const voices = live.length ? live : voicesCache;
  const prefix = (LOCALE[lang] || lang).slice(0, 2).toLowerCase();
  const rank = (v) => {
    const i = (POPULAR[lang] || []).findIndex((re) => re.test(v.name));
    let r = i >= 0 ? i : 50;
    if (/Natural|Neural|Premium|Enhanced|Nâng cao/i.test(v.name)) r -= 0.5; // giọng chất lượng cao
    if (vLang(v) !== LOCALE[lang]) r += 0.25;                                 // khác vùng (vd en-GB, zh-TW)
    return r;
  };
  return voices
    .filter((v) => vLang(v).toLowerCase().startsWith(prefix) && !NOVELTY.test(v.name))
    .filter((v) => lang !== 'zh' || !/HK|yue|Cantonese|粤|廣東/i.test(vLang(v) + v.name)) // bỏ tiếng Quảng Đông
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { if (v == null || v === '') localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* bỏ qua */ } },
};
// Giọng đã chọn lưu trên từng máy (mỗi máy có bộ giọng khác nhau); '' = tự động
export const getVoiceChoice = (lang) => store.get(`langapp.voice.${lang}`) || '';
export const setVoiceChoice = (lang, uri) => store.set(`langapp.voice.${lang}`, uri);
export const getRateFactor = () => Number(store.get('langapp.voiceRate')) || 1;
export const setRateFactor = (x) => store.set('langapp.voiceRate', x === 1 ? '' : String(x));

export function pickVoice(lang) {
  const list = voicesFor(lang);
  const chosen = getVoiceChoice(lang);
  return (chosen && list.find((v) => v.voiceURI === chosen)) || list[0] || null;
}

export function speak(text, lang, rate = 0.9, voice = null) {
  if (!ttsSupported() || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = voice || pickVoice(lang);
  u.lang = v ? vLang(v) : (LOCALE[lang] || lang);
  if (v) u.voice = v;
  u.rate = Math.min(2, Math.max(0.3, rate * getRateFactor()));
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
const MAX_LISTEN_MS = 12000;    // tự dừng nếu nghe quá lâu
const NO_SPEECH_MS = 7000;      // chưa nghe được gì sau chừng này thì dừng
const SILENCE_AFTER_MS = 1300;  // đã có lời mà im lặng chừng này thì coi như đọc xong
const FLICKER_MS = 1500;        // phiên kết thúc nhanh hơn mức này mà chưa có gì → mở lại 1 lần

// iPhone/iPad (mọi trình duyệt trên iOS đều là WebKit) và Safari trên Mac:
// thường không trả kết quả "chốt" khi interimResults=false và tự tắt rất sớm ở chế độ nghe 1 lần,
// nên ở đó nghe liên tục + lấy cả kết quả tạm, tự dừng khi người dùng im lặng.
const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
const isWebKit = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  || (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|Android/.test(ua));

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
// Lưu ý: khi không có phiên cũ, rec.start() chạy đồng bộ ngay trong cú bấm (Safari iOS yêu cầu vậy).
export function listen(lang) {
  let rec = null;
  let cancelled = false;
  let stopRequested = false;

  // Một lần mở micro; trả { transcripts, error, quick } khi phiên kết thúc
  const once = () => new Promise((resolve) => {
    rec = new Recognition();
    rec.lang = LOCALE[lang] || lang;
    rec.interimResults = true;
    rec.continuous = isWebKit;
    rec.maxAlternatives = 5;
    let markEnded;
    const me = { rec, ended: new Promise((r) => { markEnded = r; }) };
    active = me;

    const startedAt = Date.now();
    let latest = [];
    let error = null;
    let silenceTimer = null;
    const stopNow = () => { try { rec.stop(); } catch { /* bỏ qua */ } };
    const maxTimer = setTimeout(stopNow, MAX_LISTEN_MS);
    const noSpeechTimer = setTimeout(() => { if (!latest.length) stopNow(); }, NO_SPEECH_MS);

    rec.onresult = (e) => {
      const res = Array.from(e.results);
      const joined = res.map((r) => r[0]?.transcript || '').join(' ').replace(/\s+/g, ' ').trim();
      const alts = res.length === 1 ? Array.from(res[0]).map((a) => a.transcript.trim()) : [joined];
      const found = alts.filter(Boolean);
      if (found.length) latest = found;
      if (!rec.continuous && res.every((r) => r.isFinal)) { stopNow(); return; }
      // Nghe liên tục: đọc xong (im lặng một lúc) thì tự dừng
      if (rec.continuous && latest.length) {
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(stopNow, SILENCE_AFTER_MS);
      }
    };
    rec.onerror = (e) => { error = e.error; };
    rec.onend = () => {
      clearTimeout(maxTimer); clearTimeout(noSpeechTimer); clearTimeout(silenceTimer);
      markEnded();
      if (active === me) active = null;
      resolve({ transcripts: latest, error, quick: Date.now() - startedAt < FLICKER_MS });
    };
    try {
      rec.start();
      if (stopRequested) stopNow();
    } catch {
      clearTimeout(maxTimer); clearTimeout(noSpeechTimer);
      markEnded();
      if (active === me) active = null;
      resolve({ transcripts: [], error: 'busy', quick: true });
    }
  });

  const promise = (async () => {
    // Chờ phiên cũ nhả micro; dừng giọng đọc mẫu để mic không thu lại tiếng máy
    if (active) { const prev = active; stopListening(); await Promise.race([prev.ended, wait(1000)]); }
    if (ttsSupported() && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
    if (cancelled) return { transcripts: [], aborted: true };

    let r = await once();
    // Safari hay "nháy" (mở rồi tắt ngay, không lỗi, không chữ) — nhất là ngay sau khi phát giọng mẫu: mở lại 1 lần
    if (!r.transcripts.length && r.quick && !cancelled && !stopRequested
        && (!r.error || r.error === 'aborted' || r.error === 'busy' || r.error === 'audio-capture')) {
      await wait(300);
      if (cancelled) return { transcripts: [], aborted: true };
      r = await once();
    }

    if (r.transcripts.length) return { transcripts: r.transcripts }; // có chữ thì chấm, kể cả khi kèm lỗi
    if (cancelled || r.error === 'aborted') return { transcripts: [], aborted: true };
    if (r.error === 'busy') throw new Error('Micro đang bận, hãy bấm lại sau 1 giây.');
    if (r.error && r.error !== 'no-speech') throw new Error(STT_ERRORS[r.error] || `Lỗi nhận dạng giọng nói (${r.error}), hãy thử lại.`);
    return { transcripts: [] };
  })();

  return {
    promise,
    abort: () => { cancelled = true; try { rec?.abort(); } catch { /* bỏ qua */ } },
    stop: () => { stopRequested = true; try { rec?.stop(); } catch { /* bỏ qua */ } },
  };
}

// Chuẩn hoá để so sánh: bỏ dấu câu, chữ thường
function normalize(s, lang) {
  let t = s.toLowerCase().replace(/[.,!?;:'"，。！？；：、“”‘’\s]/g, lang === 'en' ? ' ' : '');
  // Tiếng Nhật: máy có thể trả katakana hoặc hiragana → coi như nhau
  if (lang === 'ja') t = t.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/[「」『』・]/g, '');
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
