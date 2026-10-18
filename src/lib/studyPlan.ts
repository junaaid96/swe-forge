/**
 * Study plan: day-by-day checklist generated from skill-map gaps (weakest
 * topics first, path steps prioritised), with re-planning and .ics export.
 * Completion derives from existing progress where possible, plus manual
 * checks. Everything stays local.
 */
import { useSyncExternalStore } from 'react';
import type { Catalog, PracticeIndexEntry } from './types';
import type { ProgressState } from './progress';
import { statusOf, type PracticeState } from './practiceStore';
import { allStats } from './stats';
import { addDays, dayKey } from './srs';
import { QUIZ_PASS_PCT } from './paths';

const KEY = 'forgeline:plan:v1';

export interface PlanInputs {
  daysAvailable: number;
  hoursPerDay: number;
  /** yyyy-mm-dd or '' */
  interviewDate: string;
  focusTopics: string[];
}

export type PlanItemKind = 'page' | 'practice' | 'quiz' | 'review';

export interface PlanItem {
  id: string;
  kind: PlanItemKind;
  label: string;
  url: string;
  minutes: number;
  ref: string;
  topic: string;
}

export interface PlanDay {
  date: string;
  items: PlanItem[];
}

export interface StudyPlanState {
  version: 1;
  inputs: PlanInputs;
  createdAt: string;
  days: PlanDay[];
  /** manually checked item ids */
  checks: string[];
}

export const DEFAULT_INPUTS: PlanInputs = { daysAvailable: 14, hoursPerDay: 1, interviewDate: '', focusTopics: [] };

function empty(): StudyPlanState {
  return { version: 1, inputs: { ...DEFAULT_INPUTS }, createdAt: '', days: [], checks: [] };
}

function load(): StudyPlanState {
  try {
    if (typeof localStorage === 'undefined') return empty();
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<StudyPlanState>;
    if (parsed?.version !== 1 || !Array.isArray(parsed.days)) return empty();
    return { ...empty(), ...parsed, inputs: { ...DEFAULT_INPUTS, ...(parsed.inputs ?? {}) } };
  } catch {
    return empty();
  }
}

let state: StudyPlanState;
try {
  state = load();
} catch {
  state = empty();
}
const listeners = new Set<() => void>();

function commit(next: StudyPlanState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export const studyPlan = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,
  save(plan: StudyPlanState) {
    commit(plan);
  },
  toggleCheck(id: string) {
    commit({ ...state, checks: state.checks.includes(id) ? state.checks.filter((c) => c !== id) : [...state.checks, id] });
  },
  clear() {
    commit(empty());
  },
  exportData: () => state,
  importData(d: StudyPlanState) {
    if (d?.version !== 1) throw new Error('Not a Forgeline plan file');
    commit({ ...empty(), ...d });
  },
  reset() {
    commit(empty());
  },
};

export function useStudyPlan() {
  return useSyncExternalStore(studyPlan.subscribe, studyPlan.get, studyPlan.get);
}

/** Completion derived from progress alone (no manual checks). */
export function autoDone(item: PlanItem, progress: ProgressState, practice: PracticeState | undefined): boolean {
  switch (item.kind) {
    case 'page':
      return Boolean(progress.pages[item.ref]?.readAt);
    case 'practice': {
      const st = statusOf(practice?.records[item.ref]);
      return st === 'solved' || st === 'solved-hints';
    }
    case 'quiz': {
      const q = progress.quiz[item.topic];
      return Boolean(q && q.total && Math.round((q.best / q.total) * 100) >= QUIZ_PASS_PCT);
    }
    case 'review':
      return false;
  }
}

export function itemDone(item: PlanItem, progress: ProgressState, practice: PracticeState | undefined, checks: string[]): boolean {
  return checks.includes(item.id) || autoDone(item, progress, practice);
}

export function planStats(plan: StudyPlanState, progress: ProgressState, practice?: PracticeState) {
  let done = 0;
  let total = 0;
  for (const d of plan.days) for (const it of d.items) {
    total += 1;
    if (itemDone(it, progress, practice, plan.checks)) done += 1;
  }
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

/** Days the user has fallen behind (past dates with unfinished items). */
export function behindDays(plan: StudyPlanState, progress: ProgressState, practice: PracticeState | undefined, today = dayKey()) {
  return plan.days.filter((d) => d.date < today && d.items.some((it) => !itemDone(it, progress, practice, plan.checks))).length;
}

function daysUntil(from: string, to: string) {
  const ms = Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`);
  return Math.round(ms / 86_400_000);
}

export function generatePlan(
  catalog: Catalog,
  progress: ProgressState,
  practice: PracticeState | undefined,
  challenges: PracticeIndexEntry[] | undefined,
  inputs: PlanInputs,
  today = dayKey(),
): StudyPlanState {
  const bySlug = new Map(catalog.topics.map((t) => [t.slug, t]));
  const focus = inputs.focusTopics.filter((s) => bySlug.has(s));
  const stats = allStats(catalog, progress, practice);
  const topics = (focus.length ? focus : catalog.topics.map((t) => t.slug))
    .map((s) => ({ slug: s, mastery: stats.get(s)?.mastery ?? 0 }))
    .sort((a, b) => a.mastery - b.mastery || (a.slug < b.slug ? -1 : 1));

  // Path steps get priority: collect every page/challenge/topic they touch.
  const pathRefs = new Set<string>();
  for (const p of catalog.paths ?? []) for (const s of p.steps) {
    pathRefs.add(`${s.type}:${s.ref}`);
    for (const k of s.keys) pathRefs.add(`page:${k}`);
  }
  const boost = (kind: string, ref: string, topic: string) =>
    pathRefs.has(`${kind}:${ref}`) || pathRefs.has(`quiz:${topic}`) || pathRefs.has(`flashcards:${topic}`) ? 0 : 1;

  const items: PlanItem[] = [];
  for (const { slug } of topics) {
    const t = bySlug.get(slug)!;
    const local: PlanItem[] = [];
    for (const p of t.pages) {
      if (progress.pages[p.key]?.readAt) continue;
      local.push({ id: `page:${p.key}`, kind: 'page', label: `Read: ${p.title}`, url: p.url, minutes: Math.max(5, p.minutes), ref: p.key, topic: slug });
    }
    for (const c of (challenges ?? []).filter((c) => c.topic === slug)) {
      const st = statusOf(practice?.records[c.id]);
      if (st === 'solved' || st === 'solved-hints') continue;
      local.push({ id: `practice:${c.id}`, kind: 'practice', label: `Solve: ${c.title}`, url: c.url, minutes: Math.max(10, c.estimatedMinutes), ref: c.id, topic: slug });
    }
    const q = progress.quiz[slug];
    if (t.quizCount && (!q || !q.total || Math.round((q.best / q.total) * 100) < QUIZ_PASS_PCT)) {
      local.push({ id: `quiz:${slug}`, kind: 'quiz', label: `Quiz: ${t.title}`, url: `/topics/${slug}#quiz`, minutes: 10, ref: slug, topic: slug });
    }
    const dueHere = Object.values(progress.cards).some((c) => c.t === slug && c.due <= today);
    if (dueHere || t.cardCount > 0) {
      local.push({ id: `review:${slug}`, kind: 'review', label: `Review ${t.title} cards`, url: `/flashcards?topic=${slug}`, minutes: 15, ref: slug, topic: slug });
    }
    local.sort((a, b) => boost(a.kind, a.ref, a.topic) - boost(b.kind, b.ref, b.topic));
    items.push(...local);
  }

  let n = Math.min(60, Math.max(1, Math.round(inputs.daysAvailable) || 1));
  if (inputs.interviewDate) {
    const until = daysUntil(today, inputs.interviewDate);
    if (until >= 1) n = Math.min(n, until);
  }
  const budget = Math.max(15, Math.round(inputs.hoursPerDay * 60));
  const days: PlanDay[] = [];
  let rest = items.slice(0, 300);
  for (let d = 0; d < n && rest.length; d++) {
    const date = addDays(today, d);
    const dayItems: PlanItem[] = [];
    let left = budget;
    // Always schedule at least one item per day while items remain.
    while (rest.length && (left > 0 || !dayItems.length)) {
      const it = rest.shift()!;
      dayItems.push(it);
      left -= it.minutes;
    }
    days.push({ date, items: dayItems });
  }
  return { version: 1, inputs: { ...inputs }, createdAt: new Date().toISOString(), days, checks: [] };
}

/** Re-plan from today: drop finished items, redistribute the rest. */
export function replan(plan: StudyPlanState, progress: ProgressState, practice: PracticeState | undefined, today = dayKey()): StudyPlanState {
  const leftover = plan.days.flatMap((d) => d.items).filter((it) => !itemDone(it, progress, practice, plan.checks));
  if (!leftover.length) return plan;
  const n = Math.max(1, plan.days.length);
  const budget = Math.max(15, Math.round(plan.inputs.hoursPerDay * 60));
  const days: PlanDay[] = [];
  const rest = leftover.slice(0, 300);
  for (let d = 0; d < n && rest.length; d++) {
    const dayItems: PlanItem[] = [];
    let left = budget;
    while (rest.length && (left > 0 || !dayItems.length)) {
      const it = rest.shift()!;
      dayItems.push(it);
      left -= it.minutes;
    }
    days.push({ date: addDays(today, d), items: dayItems });
  }
  return { ...plan, createdAt: new Date().toISOString(), days };
}

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function icsFold(s: string) {
  // RFC 5545: lines SHOULD be ≤75 octets; fold with CRLF + space.
  const out: string[] = [];
  let line = '';
  for (const ch of s) {
    if (new Blob([line + ch]).size > 74) {
      out.push(line);
      line = ' ';
    }
    line += ch;
  }
  out.push(line);
  return out.join('\r\n');
}

/** One VEVENT per study day (floating 9am start, duration = planned minutes). */
export function planToIcs(plan: StudyPlanState): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Forgeline//Study Plan//EN', 'CALSCALE:GREGORIAN'];
  plan.days.forEach((d, i) => {
    const stamp = d.date.replace(/-/g, '');
    const minutes = d.items.reduce((a, it) => a + it.minutes, 0);
    const desc = d.items.map((it) => `• ${it.label} (${it.minutes}m) — https://swe-forge.vercel.app${it.url}`).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:forgeline-plan-${stamp}@swe-forge.vercel.app`,
      `DTSTAMP:${stamp}T090000`,
      `DTSTART:${stamp}T090000`,
      `DURATION:PT${Math.max(15, minutes)}M`,
      icsFold(`SUMMARY:${icsEscape(`Forgeline study plan — day ${i + 1} (${d.items.length} tasks)`)}`),
      icsFold(`DESCRIPTION:${icsEscape(desc)}`),
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
