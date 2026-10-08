export interface RadarDatum {
  label: string;
  value: number; // 0..100
}

export function RadarChart({ data, size = 340 }: { data: RadarDatum[]; size?: number }) {
  const n = data.length;
  if (n < 3) return null;
  const pad = 70;
  const cx = size / 2 + pad;
  const cy = size / 2 + pad / 2;
  const R = size / 2 - 10;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v] as const;
  };
  const poly = data.map((d, i) => pt(i, Math.max(0.02, d.value / 100)).join(',')).join(' ');
  const summary = data.map((d) => `${d.label} ${d.value}%`).join(', ');
  return (
    <svg className="radar" viewBox={`0 0 ${size + pad * 2} ${size + pad}`} role="img" aria-label={`Skill radar: ${summary}`}>
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} className="radar-ring" points={data.map((_, i) => pt(i, r).join(',')).join(' ')} />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} className="radar-axis" x1={cx} y1={cy} x2={x} y2={y} />;
      })}
      <polygon className="radar-area" points={poly} />
      {data.map((d, i) => {
        const [x, y] = pt(i, Math.max(0.02, d.value / 100));
        return <circle key={d.label} className="radar-dot" cx={x} cy={y} r={3.5} />;
      })}
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.13);
        const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
        return (
          <text key={d.label} className="radar-label" x={x} y={y} textAnchor={anchor} dominantBaseline="middle">
            <tspan>{d.label}</tspan>
            <tspan className="radar-value" x={x} dy="1.2em">
              {d.value}%
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
