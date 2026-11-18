// Biểu đồ IELTS Writing Task 1 vẽ từ số liệu: bar / line / pie / table (SVG, theo màu sáng/tối của app)
const COLORS = ['#4f7cf7', '#22a06b', '#e0912a', '#d9534f', '#8e63d9'];
const fmt = (v) => (Math.abs(v) >= 1000 ? v.toLocaleString('en-US') : String(v));

export default function ExamChart({ chart }) {
  if (!chart) return null;
  const { type, title, unit, categories = [], series = [] } = chart;
  return (
    <figure className="exam-chart">
      <figcaption>{title}{unit && type !== 'pie' ? <span className="muted small"> ({unit})</span> : null}</figcaption>
      {type === 'process' ? <Process steps={chart.steps || []} />
        : type === 'table' ? <Table categories={categories} series={series} unit={unit} />
        : type === 'pie' ? <Pie categories={categories} series={series} />
          : <XY type={type} categories={categories} series={series} unit={unit} />}
      {type !== 'table' && type !== 'pie' && series.length > 1 && (
        <div className="chart-legend">
          {series.map((s, i) => <span key={s.name}><i style={{ background: COLORS[i % COLORS.length] }} />{s.name}</span>)}
        </div>
      )}
    </figure>
  );
}

function XY({ type, categories, series }) {
  const W = 640, H = 300, pl = 48, pr = 12, pt = 12, pb = 40;
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 0);
  const step = niceStep(max / 5);
  const top = Math.ceil(max / step) * step || 1;
  const x0 = pl, x1 = W - pr, y0 = H - pb, y1 = pt;
  const y = (v) => y0 - (v / top) * (y0 - y1);
  const band = (x1 - x0) / categories.length;
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={x0} x2={x1} y1={y(v)} y2={y(v)} className="chart-grid" />
          <text x={x0 - 6} y={y(v) + 4} textAnchor="end" className="chart-tick">{fmt(+v.toFixed(2))}</text>
        </g>
      ))}
      {categories.map((c, i) => (
        <text key={c} x={x0 + band * (i + 0.5)} y={y0 + 18} textAnchor="middle" className="chart-tick">{c}</text>
      ))}
      {type === 'bar' && series.map((s, si) => {
        const bw = (band * 0.75) / series.length;
        return s.values.map((v, i) => (
          <rect key={`${si}-${i}`} x={x0 + band * i + band * 0.125 + bw * si} y={y(v)} width={bw - 2} height={y0 - y(v)}
            fill={COLORS[si % COLORS.length]} rx="2"><title>{`${s.name} – ${categories[i]}: ${v}`}</title></rect>
        ));
      })}
      {type === 'line' && series.map((s, si) => (
        <g key={s.name}>
          <polyline fill="none" stroke={COLORS[si % COLORS.length]} strokeWidth="2.5"
            points={s.values.map((v, i) => `${x0 + band * (i + 0.5)},${y(v)}`).join(' ')} />
          {s.values.map((v, i) => <circle key={i} cx={x0 + band * (i + 0.5)} cy={y(v)} r="3.5" fill={COLORS[si % COLORS.length]}><title>{`${s.name} – ${categories[i]}: ${v}`}</title></circle>)}
        </g>
      ))}
      <line x1={x0} x2={x1} y1={y0} y2={y0} className="chart-axis" />
    </svg>
  );
}

function Pie({ categories, series }) {
  // Nhiều series → mỗi series một hình tròn (vd so sánh 2 năm)
  return (
    <div className="pie-row">
      {series.map((s) => {
        const total = s.values.reduce((a, b) => a + b, 0) || 1;
        let a0 = -Math.PI / 2;
        return (
          <div key={s.name} className="pie-one">
            <svg viewBox="-110 -110 220 220" className="chart-pie" role="img">
              {s.values.map((v, i) => {
                const a1 = a0 + (v / total) * Math.PI * 2;
                const large = a1 - a0 > Math.PI ? 1 : 0;
                const d = `M0,0 L${100 * Math.cos(a0)},${100 * Math.sin(a0)} A100,100 0 ${large} 1 ${100 * Math.cos(a1)},${100 * Math.sin(a1)} Z`;
                const mid = (a0 + a1) / 2;
                const el = (
                  <g key={i}>
                    <path d={d} fill={COLORS[i % COLORS.length]} stroke="var(--surface)" strokeWidth="1.5"><title>{`${categories[i]}: ${v}%`}</title></path>
                    {v / total > 0.06 && <text x={62 * Math.cos(mid)} y={62 * Math.sin(mid) + 4} textAnchor="middle" className="pie-label">{v}%</text>}
                  </g>
                );
                a0 = a1;
                return el;
              })}
            </svg>
            {series.length > 1 && <div className="small center-text">{s.name}</div>}
          </div>
        );
      })}
      <div className="chart-legend col">
        {categories.map((c, i) => <span key={c}><i style={{ background: COLORS[i % COLORS.length] }} />{c}</span>)}
      </div>
    </div>
  );
}

// Sơ đồ quy trình: các bước đánh số nối bằng mũi tên, tự xuống dòng theo bề ngang
function Process({ steps }) {
  return (
    <ol className="process-flow">
      {steps.map((s, i) => (
        <li key={i} className="process-step">
          <span className="process-num">{i + 1}</span>
          <strong>{s.label}</strong>
          {s.detail && <span className="small muted">{s.detail}</span>}
        </li>
      ))}
    </ol>
  );
}

function Table({ categories, series, unit }) {
  return (
    <div className="chart-table-wrap">
      <table className="word-table chart-table">
        <thead><tr><th>{unit ? `(${unit})` : ''}</th>{categories.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{series.map((s) => <tr key={s.name}><th>{s.name}</th>{s.values.map((v, i) => <td key={i}>{fmt(v)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function niceStep(raw) {
  if (raw <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
