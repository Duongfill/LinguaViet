import { useEffect, useState } from 'react';
import { LANG_INFO } from '../lib/lang.jsx';
import {
  getRateFactor, getVoiceChoice, onVoicesChanged, setRateFactor, setVoiceChoice, speak, ttsSupported, voicesFor,
} from '../lib/speech.js';

const SAMPLE = {
  en: 'Hello! Nice to meet you. Let’s learn English together.',
  zh: '你好！很高兴认识你。我们一起学中文吧。',
  ja: 'こんにちは！はじめまして。一緒に日本語を勉強しましょう。',
};
const POPULAR_N = 3;

// Chọn giọng đọc cho từng ngôn ngữ + tốc độ đọc (lưu trên máy này)
export default function VoiceSettings() {
  const [, setTick] = useState(0);
  const [choice, setChoice] = useState(() => Object.fromEntries(Object.keys(LANG_INFO).map((l) => [l, getVoiceChoice(l)])));
  const [rate, setRate] = useState(getRateFactor);
  useEffect(() => onVoicesChanged(() => setTick((t) => t + 1)), []);

  if (!ttsSupported()) return <p className="small muted">Trình duyệt này không hỗ trợ đọc thành tiếng.</p>;

  const choose = (lang, uri) => {
    setVoiceChoice(lang, uri);
    setChoice((c) => ({ ...c, [lang]: uri }));
    const v = voicesFor(lang).find((x) => x.voiceURI === uri);
    speak(SAMPLE[lang], lang, 0.9, v || null);
  };

  return (
    <>
      <p className="small muted">
        Giọng lấy từ thiết bị đang dùng nên mỗi máy chọn riêng. ⭐ là {POPULAR_N} giọng phổ biến, nghe rõ nhất trên máy này.
      </p>
      {Object.entries(LANG_INFO).map(([lang, info]) => {
        const list = voicesFor(lang);
        const top = list.slice(0, POPULAR_N);
        const rest = list.slice(POPULAR_N);
        const current = list.find((v) => v.voiceURI === choice[lang]) || list[0];
        return (
          <div key={lang} className="voice-row">
            <div className="voice-label">{info.flag} {info.label}</div>
            {list.length === 0 ? (
              <div className="small muted voice-missing">
                Máy chưa có giọng {info.label}. Windows: Cài đặt → Thời gian &amp; ngôn ngữ → thêm ngôn ngữ (kèm giọng nói).
                iPhone: Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói.
              </div>
            ) : (
              <div className="voice-controls">
                <select value={choice[lang] && list.some((v) => v.voiceURI === choice[lang]) ? choice[lang] : ''}
                  onChange={(e) => choose(lang, e.target.value)} aria-label={`Giọng ${info.label}`}>
                  <option value="">Tự động ({top[0]?.name})</option>
                  <optgroup label="⭐ Phổ biến">
                    {top.map((v) => <option key={v.voiceURI} value={v.voiceURI}>⭐ {v.name} · {v.lang}</option>)}
                  </optgroup>
                  {rest.length > 0 && (
                    <optgroup label="Giọng khác">
                      {rest.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>)}
                    </optgroup>
                  )}
                </select>
                <button className="btn sm" onClick={() => speak(SAMPLE[lang], lang, 0.9, current)}>▶ Nghe thử</button>
              </div>
            )}
          </div>
        );
      })}
      <label className="voice-rate">
        <span>Tốc độ đọc: <strong>{rate.toFixed(1)}×</strong></span>
        <input type="range" min="0.6" max="1.4" step="0.1" value={rate}
          onChange={(e) => { const x = Number(e.target.value); setRate(x); setRateFactor(x); }}
          onMouseUp={() => speak(SAMPLE.en, 'en')} onTouchEnd={() => speak(SAMPLE.en, 'en')} />
      </label>
    </>
  );
}
