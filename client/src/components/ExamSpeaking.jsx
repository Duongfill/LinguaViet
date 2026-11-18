import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { playLines } from '../lib/examAudio.js';

const BANDS = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

// Ghi âm câu trả lời để tự nghe lại (chỉ lưu trên máy, không gửi lên server)
function Recorder() {
  const [state, setState] = useState('idle'); // idle | rec | done | error
  const [url, setUrl] = useState(null);
  const [sec, setSec] = useState(0);
  const rec = useRef(null), timer = useRef(null), chunks = useRef([]);
  useEffect(() => () => { clearInterval(timer.current); rec.current?.stream?.getTracks().forEach((t) => t.stop()); }, []);
  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(new Blob(chunks.current, { type: r.mimeType || 'audio/webm' })));
        setState('done');
      };
      r.start(); rec.current = r;
      setSec(0); setState('rec');
      timer.current = setInterval(() => setSec((s) => s + 1), 1000);
    } catch { setState('error'); }
  };
  const stop = () => { clearInterval(timer.current); rec.current?.stop(); };
  if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices) return <span className="small muted">Trình duyệt không hỗ trợ ghi âm.</span>;
  return (
    <div className="recorder">
      {state === 'rec' ? <button className="btn danger sm" onClick={stop}>⏹ Dừng ({sec}s)</button>
        : <button className="btn sm" onClick={start}>🎙️ {state === 'done' ? 'Ghi lại' : 'Ghi âm câu trả lời'}</button>}
      {state === 'done' && url && <audio controls src={url} />}
      {state === 'error' && <span className="small error-text">Chưa được phép dùng micro.</span>}
    </div>
  );
}

function AskButton({ text }) {
  const [on, setOn] = useState(false);
  const ctl = useRef(null);
  useEffect(() => () => ctl.current?.stop(), []);
  return (
    <button className="btn ghost sm" onClick={() => {
      if (on) { ctl.current?.stop(); setOn(false); return; }
      setOn(true); ctl.current = playLines([{ s: 'M', t: text }], { onEnd: () => setOn(false) });
    }}>{on ? '⏹' : '🔊'} Nghe giám khảo hỏi</button>
  );
}

function QA({ n, q, sample }) {
  const [show, setShow] = useState(false);
  return (
    <div className="sp-q">
      <div><span className="q-num">{n}</span> <strong>{q}</strong></div>
      <div className="row" style={{ marginTop: 6 }}>
        <AskButton text={q} />
        <Recorder />
        <button className="btn ghost sm" onClick={() => setShow((v) => !v)}>{show ? 'Ẩn' : 'Xem'} câu trả lời mẫu</button>
      </div>
      {show && <div className="w-sample small">{sample}</div>}
    </div>
  );
}

// Thẻ đề Part 2: 1 phút chuẩn bị, 2 phút nói
function CueCard({ p2 }) {
  const [phase, setPhase] = useState('ready'); // ready | prep | talk | done
  const [left, setLeft] = useState(0);
  const [show, setShow] = useState(false);
  const t = useRef(null);
  useEffect(() => () => clearInterval(t.current), []);
  const run = (ph, secs, nextPh) => {
    clearInterval(t.current); setPhase(ph); setLeft(secs);
    t.current = setInterval(() => setLeft((s) => {
      if (s <= 1) { clearInterval(t.current); if (nextPh === 'talk') run('talk', 120, 'done'); else setPhase('done'); return 0; }
      return s - 1;
    }), 1000);
  };
  return (
    <div className="stack">
      <div className="cue-card">
        <strong>{p2.cue}</strong>
        <div className="small">You should say:</div>
        <ul>{p2.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
      </div>
      <div className="row" style={{ marginTop: 0 }}>
        {phase === 'ready' && <button className="btn primary" onClick={() => run('prep', 60, 'talk')}>Bắt đầu: 1 phút chuẩn bị</button>}
        {phase === 'prep' && <><span className="exam-clock">📝 Chuẩn bị: {left}s</span><button className="btn sm" onClick={() => run('talk', 120, 'done')}>Nói luôn</button></>}
        {phase === 'talk' && <><span className="exam-clock low">🗣️ Nói: {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span><button className="btn sm" onClick={() => { clearInterval(t.current); setPhase('done'); }}>Xong</button></>}
        {phase === 'done' && <span className="ok-text">✓ Hết giờ — nghe lại bản ghi và so với bài mẫu</span>}
        <Recorder />
        <button className="btn ghost sm" onClick={() => setShow((v) => !v)}>{show ? 'Ẩn' : 'Xem'} bài mẫu</button>
      </div>
      {show && <div className="w-sample small">{p2.sample}</div>}
    </div>
  );
}

export default function ExamSpeaking({ exam, sec }) {
  const d = sec.data;
  const [band, setBand] = useState('');
  const [saved, setSaved] = useState(false);
  const save = async () => {
    await api(`/exams/${exam.id}/speaking`, { method: 'POST', body: { part: 'all', selfBand: Number(band) } }).catch((e) => alert(e.message));
    setSaved(true);
  };
  return (
    <div className="stack page-narrow exam-run">
      <div className="exam-bar">
        <Link to="/exams" className="btn ghost sm">←</Link>
        <div className="exam-bar-title"><strong>{exam.title}</strong> · Speaking</div>
      </div>
      <p className="muted small" style={{ margin: 0 }}>Nghe câu hỏi, tự trả lời to thành tiếng (ghi âm để nghe lại), rồi so với câu trả lời mẫu. Bản ghi chỉ nằm trên máy bạn.</p>

      <div className="card stack">
        <h3>Part 1 · {d.part1.topic} <span className="muted small">(4–5 phút)</span></h3>
        {d.part1.questions.map((q, i) => <QA key={i} n={i + 1} q={q} sample={d.part1.samples[i]} />)}
      </div>
      <div className="card stack">
        <h3>Part 2 · Cue card <span className="muted small">(1 phút chuẩn bị, 1–2 phút nói)</span></h3>
        <CueCard p2={d.part2} />
      </div>
      <div className="card stack">
        <h3>Part 3 · Thảo luận <span className="muted small">(4–5 phút)</span></h3>
        {d.part3.questions.map((q, i) => <QA key={i} n={i + 1} q={q} sample={d.part3.samples[i]} />)}
      </div>
      {d.vocab_vi?.length > 0 && (
        <div className="card stack">
          <h3>📚 Cụm từ hay</h3>
          <table className="word-table" style={{ marginTop: 0 }}><tbody>
            {d.vocab_vi.map((v) => <tr key={v.en}><td><strong>{v.en}</strong></td><td>{v.vi}</td></tr>)}
          </tbody></table>
        </div>
      )}
      <div className="card row" style={{ marginTop: 0 }}>
        <span>Tự đánh giá band Speaking:</span>
        <select value={band} onChange={(e) => setBand(e.target.value)}>
          <option value="">Band…</option>{BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <button className="btn primary sm" disabled={!band || saved} onClick={save}>{saved ? '✓ Đã lưu' : 'Lưu'}</button>
      </div>
    </div>
  );
}
