/** Practice Lab AI coach prompts. Privacy rule, enforced by construction: the
 * context block is built from an allowlist (statement, examples, visible
 * tests, user code, run output). The reference solution, hidden tests,
 * complexity notes and mistake lists are never referenced here. */
import { clip } from './ai';
import type { PracticeChallenge, PracticeTestSpec } from './types';
import type { Submission } from '../components/PracticeResults';

export type CoachActionId = 'explain' | 'hint' | 'review' | 'interview';

export interface CoachAction {
  id: CoachActionId;
  label: string;
  system: string;
  prompt: string;
}

export const COACH_ACTIONS: CoachAction[] = [
  {
    id: 'explain',
    label: 'Explain this error',
    system: 'Explain the error in the user\'s code for this challenge. Point at the cause precisely (file line when given) and suggest a fix direction. Do not write the full corrected function.',
    prompt: 'Explain the error in my code.',
  },
  {
    id: 'hint',
    label: 'Hint without spoilers',
    system: 'Give exactly one small hint that unblocks the next step of thinking. Be Socratic: ask a guiding question or name the concept to reach for. Never write code that solves or nearly solves the challenge; at most a 3-line generic illustration of the underlying concept, unrelated to their code.',
    prompt: 'I am stuck. Give me one hint without spoiling the solution.',
  },
  {
    id: 'review',
    label: 'Review my solution',
    system: 'Review the user\'s code under four short headers: Correctness, Complexity (with Big-O), Edge cases, Readability. Be honest about bugs and missed cases; suggest fix directions, not full rewrites.',
    prompt: 'Review my solution.',
  },
  {
    id: 'interview',
    label: 'Interview me',
    system: 'You are a senior interviewer probing the user\'s solution. Ask exactly one short question at a time about their approach, complexity, tradeoffs or alternatives. Follow up on their answers; challenge weak reasoning kindly. Start with your first question and no preamble.',
    prompt: 'Interview me on my solution. Ask your first question.',
  },
];

function renderTests(spec: PracticeTestSpec): string {
  if (spec.kind === 'fn') {
    return spec.cases
      .map((c) => `- ${c.name}: ${spec.function}(${JSON.stringify(c.args ?? [])}) → ${c.throws !== undefined ? `throws ${c.throws}` : JSON.stringify(c.expected)}`)
      .join('\n');
  }
  return spec.cases.map((c) => `- ${c.name}: ${c.expectedRows.length} row(s)${c.expectedColumns ? `, columns ${c.expectedColumns.join(', ')}` : ''}${c.orderInsensitive ? ', any order' : ''}`).join('\n');
}

function renderRun(submission: Submission | null): string {
  if (!submission) return 'No runs yet.';
  const parts: string[] = [];
  const v = submission.visible;
  parts.push(`Visible: ${v.cases.filter((c) => c.pass).length}/${v.cases.length} passed.`);
  if (v.error) parts.push(`Run error: ${v.error}${v.errorLine ? ` (line ${v.errorLine})` : ''}`);
  for (const c of v.cases.filter((c) => !c.pass)) {
    parts.push(`FAIL ${c.name}${c.error ? `: ${c.error}${c.errorLine ? ` (line ${c.errorLine})` : ''}` : ''}${c.expected !== undefined ? ` — expected ${c.expected}, got ${c.actual}` : ''}`);
  }
  if (v.stdout) parts.push(`Stdout:\n${clip(v.stdout, 800)}`);
  if (submission.submitted) {
    if (submission.hidden) {
      const h = submission.hidden;
      parts.push(`Hidden: ${h.cases.filter((c) => c.pass).length}/${h.cases.length} passed.`);
      for (const c of h.cases.filter((c) => !c.pass)) parts.push(`FAIL hidden case "${c.name}"${c.error ? `: ${c.error}` : ''}.`);
    } else {
      parts.push('Submitted: all visible tests passed, no hidden tests.');
    }
  }
  return parts.join('\n');
}

export function coachContextBlock(challenge: PracticeChallenge, code: string, language: string, submission: Submission | null): string {
  return [
    `Challenge — ${challenge.title} (${challenge.difficulty}):`,
    clip(challenge.statement, 2500),
    challenge.examples ? `Examples:\n${clip(challenge.examples, 1000)}` : '',
    challenge.visibleTests ? `Visible tests:\n${clip(renderTests(challenge.visibleTests), 1500)}` : 'No automated tests (think & check).',
    `User's ${language} code:\n${clip(code || '(empty)', 4000)}`,
    `Last run:\n${renderRun(submission)}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
