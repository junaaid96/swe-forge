import { useEffect, useRef, useState } from 'react';

export interface ShareStats {
  name: string;
  streak: number;
  pagesRead: number;
  pagesTotal: number;
  mastered: number;
  mockAvg: number | null;
  pathsDone: number;
  radar: Array<{ label: string; value: number }>;
}

const W = 1200;
const H = 630;

/** Renders a shareable PNG entirely in-browser. Nothing is uploaded. */
export function ShareCard({ stats }: { stats: ShareStats }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState(stats.name);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = { ...stats, name: name.trim() || 'Anonymous learner' };

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#0d9488';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, W - 16, H - 16);

    ctx.fillStyle = '#5eead4';
    ctx.font = '600 30px system-ui, sans-serif';
    ctx.fillText('FORGELINE', 60, 80);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 64px system-ui, sans-serif';
    ctx.fillText(s.name.slice(0, 24), 60, 150);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillText(new Date().toISOString().slice(0, 10), 60, 195);

    // Radar (same math as RadarChart, canvas edition).
    const data = s.radar.length >= 3 ? s.radar : [];
    const cx = 330;
    const cy = 430;
    const R = 150;
    const pt = (i: number, v: number): [number, number] => {
      const a = ((Math.PI * 2 * i) / Math.max(1, data.length)) - Math.PI / 2;
      return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
    };
    ctx.lineWidth = 1;
    for (const r of [0.25, 0.5, 0.75, 1]) {
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      data.forEach((_, i) => {
        const [x, y] = pt(i, r);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }
    if (data.length) {
      ctx.fillStyle = 'rgba(13, 148, 136, 0.35)';
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 3;
      ctx.beginPath();
      data.forEach((d, i) => {
        const [x, y] = pt(i, Math.max(0.02, d.value / 100));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '20px system-ui, sans-serif';
      data.forEach((d, i) => {
        const [x, y] = pt(i, 1.18);
        ctx.textAlign = Math.abs(x - cx) < 8 ? 'center' : x > cx ? 'left' : 'right';
        ctx.fillText(`${d.label} ${d.value}%`, x, y);
      });
      ctx.textAlign = 'left';
    }

    // Stat blocks.
    const rows: Array<[string, string]> = [
      [`${s.streak} day${s.streak === 1 ? '' : 's'}`, 'study streak'],
      [`${s.pagesRead}/${s.pagesTotal}`, 'pages read'],
      [`${s.mastered}`, 'cards mastered'],
      [s.mockAvg === null ? '—' : `${s.mockAvg}%`, 'mock average'],
      [`${s.pathsDone}`, 'paths finished'],
    ];
    ctx.font = '700 54px system-ui, sans-serif';
    rows.forEach(([v, label], i) => {
      const y = 250 + i * 76;
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(v, 700, y);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '26px system-ui, sans-serif';
      ctx.fillText(label, 700, y + 30);
      ctx.font = '700 54px system-ui, sans-serif';
    });
    ctx.fillStyle = '#64748b';
    ctx.font = '24px system-ui, sans-serif';
    ctx.fillText('swe-forge.vercel.app', 700, 600);
  }, [stats, name]);

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'forgeline-share-card.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };

  return (
    <div className="share-card" data-testid="share-card">
      <canvas ref={canvasRef} width={W} height={H} className="share-canvas" role="img" aria-label="Shareable progress card preview" />
      <div className="row">
        <label className="field">
          <span className="field-label">Display name (optional, stays in your browser)</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Anonymous learner" data-testid="share-name" />
        </label>
        <button type="button" className="btn btn-primary" onClick={download} data-testid="share-download">
          Download PNG
        </button>
      </div>
    </div>
  );
}
