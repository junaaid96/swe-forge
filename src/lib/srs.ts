/**
 * SM-2 spaced repetition (SuperMemo 2) with four answer buttons.
 * Again = 0, Hard = 3, Good = 4, Easy = 5.
 */
export type Grade = 0 | 3 | 4 | 5;

export interface CardState {
  /** topic slug — kept so dashboards don't need the full card bank */
  t: string;
  ef: number;
  reps: number;
  interval: number;
  due: string;
  lapses: number;
  last: string;
}

export const MASTERED_INTERVAL = 21;

export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

export function schedule(prev: CardState | undefined, grade: Grade, topic: string, today = dayKey()): CardState {
  const s: CardState = prev ? { ...prev } : { t: topic, ef: 2.5, reps: 0, interval: 0, due: today, lapses: 0, last: today };
  if (grade < 3) {
    s.reps = 0;
    s.interval = 1;
    s.lapses += prev ? 1 : 0;
  } else {
    if (s.reps === 0) s.interval = grade === 5 ? 3 : 1;
    else if (s.reps === 1) s.interval = grade === 3 ? 4 : 6;
    else s.interval = Math.round(s.interval * (grade === 3 ? 1.2 : s.ef) * (grade === 5 ? 1.3 : 1));
    s.interval = Math.max(1, s.interval);
    s.reps += 1;
  }
  const q = grade;
  s.ef = Math.max(1.3, +(s.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))).toFixed(3));
  s.due = addDays(today, s.interval);
  s.last = today;
  return s;
}

/** Preview the next interval for each button (shown under the buttons). */
export function previewIntervals(prev: CardState | undefined, topic: string) {
  const out = {} as Record<Grade, number>;
  for (const g of [0, 3, 4, 5] as Grade[]) out[g] = schedule(prev, g, topic).interval;
  return out;
}

export function intervalLabel(days: number) {
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

export const isMastered = (s: CardState | undefined) => Boolean(s && s.interval >= MASTERED_INTERVAL);
