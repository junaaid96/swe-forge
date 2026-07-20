export const INTERVIEW_LEVELS = [
  'basics',
  'medium',
  'advanced',
  'company-specific',
] as const;

export type InterviewLevel = (typeof INTERVIEW_LEVELS)[number];

export const DEEP_TRACKS = [
  'theory',
  'internals',
  'best-practices',
  'real-world-projects',
  'performance',
  'pitfalls',
] as const;

export type DeepTrack = (typeof DEEP_TRACKS)[number];

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PracticeProblem {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prompt: string;
  hints: string[];
  solution: string;
  points: number;
}

export interface TopicMeta {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  order: number;
  tag: string;
  accent: string;
  relatedTopics: string[];
  quiz: QuizQuestion[];
  problems: PracticeProblem[];
}

export interface TopicSummary {
  id: string;
  slug: string;
  title: string;
  emoji: string;
  order: number;
  tag: string;
  accent: string;
  relatedTopics: string[];
  quizCount: number;
  problemCount: number;
  interviewLevels: InterviewLevel[];
  deepTracks: DeepTrack[];
}

export interface InterviewQA {
  id: string;
  question: string;
  answer: string;
  example?: string;
  takeaway?: string;
  tip?: string;
}

export interface InterviewLevelContent {
  topicSlug: string;
  level: InterviewLevel;
  title: string;
  markdown: string;
  items: InterviewQA[];
}

export interface DeepSection {
  h: string;
  b: string;
}

export interface DeepTrackContent {
  topicSlug: string;
  track: DeepTrack;
  title: string;
  markdown: string;
  sections: DeepSection[];
}

export interface TopicDetail extends TopicSummary {
  quiz: QuizQuestion[];
  problems: PracticeProblem[];
}

export function isInterviewLevel(v: string): v is InterviewLevel {
  return (INTERVIEW_LEVELS as readonly string[]).includes(v);
}

export function isDeepTrack(v: string): v is DeepTrack {
  return (DEEP_TRACKS as readonly string[]).includes(v);
}

export function interviewLevelLabel(level: InterviewLevel): string {
  return level
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function deepTrackLabel(track: DeepTrack): string {
  return track
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
