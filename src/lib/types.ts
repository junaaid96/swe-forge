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
  /** Vendored brand mark from thesvg.org, e.g. /logos/go.svg */
  logo?: string;
  /** Dark-theme variant, e.g. /logos/go-dark.svg */
  logoDark?: string;
  tag: string;
  accent: string;
  blurb: string;
  order: number;
  group: string;
  related: string[];
  quizCount: number;
  problemCount: number;
  practiceCount: number;
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
  totals: { topics: number; tracks?: number; pages: number; words: number; minutes: number; cards: number; mcq: number; practice?: number };
  groups: Group[];
  topics: Topic[];
  tracks?: Track[];
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

export type PracticeRunner = 'js' | 'python' | 'sql' | 'none';
export type PracticeDifficulty = 'easy' | 'medium' | 'hard';

export interface FnTestCase {
  name: string;
  args?: unknown[];
  expected?: unknown;
  /** expected error message substring when the call should throw */
  throws?: string;
}

export interface FnTestSpec {
  kind: 'fn';
  function: string;
  cases: FnTestCase[];
}

export interface SqlTestCase {
  name: string;
  expectedColumns?: string[];
  expectedRows: unknown[][];
  orderInsensitive?: boolean;
  /** CREATE TABLE + INSERT statements replacing the challenge seed for this case. */
  seed?: string;
}

export interface SqlTestSpec {
  kind: 'sql';
  cases: SqlTestCase[];
}

export type PracticeTestSpec = FnTestSpec | SqlTestSpec;

export interface PracticeLearnLink {
  ref: string;
  url: string;
  title: string;
}

export interface PracticeChallenge {
  id: string;
  topic: string;
  slug: string;
  title: string;
  difficulty: PracticeDifficulty;
  tags: string[];
  languages: string[];
  runner: PracticeRunner;
  estimatedMinutes: number;
  learnLinks: PracticeLearnLink[];
  statement: string;
  examples: string;
  learn: string;
  hints: string[];
  starters: Record<string, string>;
  visibleTests: PracticeTestSpec | null;
  hiddenTests: PracticeTestSpec | null;
  seedSql: string;
  solution: { code: Record<string, string>; explanation: string };
  complexity: string;
  mistakes: string;
  source: 'practice' | 'legacy';
  url: string;
}

export interface PracticeIndexEntry {
  id: string;
  topic: string;
  slug: string;
  title: string;
  difficulty: PracticeDifficulty;
  tags: string[];
  languages: string[];
  runner: PracticeRunner;
  estimatedMinutes: number;
  url: string;
  source: 'practice' | 'legacy';
}

export interface PracticeIndex {
  challenges: PracticeIndexEntry[];
}

export interface SearchEntry {
  /** url */ u: string;
  /** page title */ t: string;
  /** topic title */ tp: string;
  /** section heading */ s: string;
  /** anchor id */ a: string;
  /** text excerpt */ x: string;
}

export type CardSource = 'interview' | 'concept' | 'prep' | 'mcq' | 'pattern';

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
  pattern: 'Pattern',
};

export interface TrackItem {
  label: string;
  url: string;
  keys: string[];
  minutes: number;
  topic: string;
}

export interface TrackStage {
  title: string;
  hint: string;
  items: TrackItem[];
}

export interface Track {
  slug: string;
  title: string;
  emoji: string;
  accent: string;
  blurb: string;
  order: number;
  source: string;
  stages: TrackStage[];
  topics: string[];
  minutes: number;
}
