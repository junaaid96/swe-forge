import type { Player } from './usePlayer';

export function VizControls({ player, label }: { player: Player; label: string }) {
  return (
    <div className="viz-controls" role="group" aria-label={`${label} playback`}>
      <button type="button" className="btn btn-sm" onClick={player.restart} disabled={player.idx === 0} aria-label="Restart">
        ⏮
      </button>
      <button type="button" className="btn btn-sm" onClick={player.back} disabled={player.idx === 0} aria-label="Step back" data-testid="viz-back">
        ← Back
      </button>
      {!player.reduced ? (
        player.playing ? (
          <button type="button" className="btn btn-sm btn-primary" onClick={player.pause} aria-label="Pause" data-testid="viz-play">
            ⏸ Pause
          </button>
        ) : (
          <button type="button" className="btn btn-sm btn-primary" onClick={player.play} disabled={player.idx >= player.total - 1} aria-label="Play" data-testid="viz-play">
            ▶ Play
          </button>
        )
      ) : null}
      <button type="button" className="btn btn-sm" onClick={player.step} disabled={player.idx >= player.total - 1} aria-label="Step forward" data-testid="viz-step">
        Step →
      </button>
      <label className="viz-speed">
        Speed
        <select value={player.speed} onChange={(e) => player.setSpeed(Number(e.target.value))} aria-label="Playback speed" disabled={player.reduced}>
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
        </select>
      </label>
      <span className="muted small" aria-live="polite">
        Step {player.idx + 1}/{player.total}
      </span>
    </div>
  );
}

export function Pseudo({ lines, active, title = 'Pseudocode' }: { lines: string[]; active: number; title?: string }) {
  return (
    <figure className="viz-pseudo" aria-label={title}>
      <figcaption className="eyebrow">{title}</figcaption>
      <pre>
        {lines.map((l, i) => (
          <code key={i} className={i === active ? 'on' : ''} aria-current={i === active ? 'step' : undefined}>
            {l || ' '}
            {'\n'}
          </code>
        ))}
      </pre>
    </figure>
  );
}
