export type PageKind = 'notes' | 'deep' | 'interview' | 'guide';

export interface PageRef {
  key: string;
  kind: PageKind;
  id: string;
  title: string;
  url: string;
  description: string;
  minutes: number;
  words: number;
  questions?: number;
}

export interface Topic {
  slug: string;
  title: string;
  emoji: string;
  tag: string;
  accent: string;
  blurb: string;
  order: number;
  group: string;
  related: string[];
  quizCount: number;
  problemCount: number;
  cardCount: number;
  minutes: number;
  pages: PageRef[];
}

export interface Group {
  id: string;
  label: string;
  hint: string;
  topics: string[];
}

export interface Catalog {
  site: { name: string; tagline: string };
  generatedAt: string;
  totals: { topics: number; pages: number; words: number; minutes: number; cards: number; mcq: number };
  groups: Group[];
  topics: Topic[];
  prepMap: { key: string; title: string; url: string; minutes: number } | null;
}

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

export interface InterviewItem {
  id: string;
  question: string;
  answer: string;
  example?: string;
  takeaway?: string;
  tip?: string;
}

export interface Page {
  key: string;
  slug: string;
  kind: PageKind;
  id: string;
  title: string;
  url: string;
  markdown: string;
  headings: Heading[];
  items?: InterviewItem[];
}

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

export interface TopicExtras {
  quiz: QuizQuestion[];
  problems: PracticeProblem[];
}

export interface SearchEntry {
  /** url */ u: string;
  /** page title */ t: string;
  /** topic title */ tp: string;
  /** section heading */ s: string;
  /** anchor id */ a: string;
  /** text excerpt */ x: string;
}

export type CardSource = 'interview' | 'concept' | 'prep' | 'mcq';

export interface Card {
  id: string;
  /** topic slug */ t: string;
  src: CardSource;
  /** source url */ u: string;
  /** anchor */ a?: string;
  ctx: string;
  q: string;
  ans: string;
  /** extra takeaway */ x?: string;
  opts?: string[];
  ci?: number;
}

export const KIND_LABEL: Record<PageKind, string> = {
  notes: 'Guide',
  deep: 'Deep dive',
  interview: 'Interview Q&A',
  guide: 'Guide',
};

export const SOURCE_LABEL: Record<CardSource, string> = {
  interview: 'Interview Q&A',
  concept: 'Concept recall',
  prep: 'Prep map',
  mcq: 'MCQ',
};
