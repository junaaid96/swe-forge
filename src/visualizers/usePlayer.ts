import { useEffect, useState } from 'react';

/** Step-only playback when the user prefers reduced motion. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

export interface Player {
  idx: number;
  total: number;
  playing: boolean;
  speed: number;
  reduced: boolean;
  play: () => void;
  pause: () => void;
  step: () => void;
  back: () => void;
  restart: () => void;
  setSpeed: (n: number) => void;
}

export function usePlayer(total: number, resetKey = '', baseIntervalMs = 900): Player {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const reduced = useReducedMotion();

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
  }, [resetKey, total]);

  useEffect(() => {
    if (!playing || reduced || total <= 1) return;
    const t = window.setInterval(() => {
      setIdx((i) => {
        if (i + 1 >= total) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, baseIntervalMs / speed);
    return () => window.clearInterval(t);
  }, [playing, reduced, speed, total, baseIntervalMs]);

  return {
    idx,
    total,
    playing,
    speed,
    reduced,
    play: () => !reduced && setPlaying(true),
    pause: () => setPlaying(false),
    step: () => {
      setPlaying(false);
      setIdx((i) => Math.min(total - 1, i + 1));
    },
    back: () => {
      setPlaying(false);
      setIdx((i) => Math.max(0, i - 1));
    },
    restart: () => {
      setPlaying(false);
      setIdx(0);
    },
    setSpeed,
  };
}
