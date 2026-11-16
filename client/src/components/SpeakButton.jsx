import { speak, ttsSupported } from '../lib/speech.js';

export default function SpeakButton({ text, lang, slow = false, label }) {
  if (!ttsSupported()) return null;
  return (
    <button type="button" className="btn ghost sm" title="Nghe phát âm"
      onClick={(e) => { e.stopPropagation(); speak(text, lang, slow ? 0.6 : 0.9); }}>
      {slow ? '🐢' : '🔊'}{label ? ` ${label}` : ''}
    </button>
  );
}
