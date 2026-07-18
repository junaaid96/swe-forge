export type CategoryId =
  | 'core'
  | 'data'
  | 'arch'
  | 'ops'
  | 'ai'
  | 'practice';

export interface TopicSection {
  h: string;
  b: string;
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

export interface Topic {
  id: string;
  slug: string;
  order: number;
  emoji: string;
  title: string;
  cat: CategoryId;
  tag: string;
  sections: TopicSection[];
  code: string;
  tips: string[];
  connections: string[];
  relatedSlugs?: string[];
  quiz: QuizQuestion[];
  problems: PracticeProblem[];
}

export interface TopicSummary {
  id: string;
  slug: string;
  order: number;
  emoji: string;
  title: string;
  cat: CategoryId;
  tag: string;
  relatedSlugs: string[];
  quizCount: number;
  problemCount: number;
  sectionCount: number;
}

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  accent: string;
  bg: string;
  text: string;
  border: string;
}

export interface TopicProgress {
  completed: boolean;
  quizBest: number;
  quizAttempts: number;
  problemsSolved: string[];
  lastVisited?: string;
}

export interface ProgressState {
  topics: Record<string, TopicProgress>;
  totalScore: number;
  streak: number;
  lastStudyDate?: string;
}

export interface InterviewSectionMeta {
  id: string;
  title: string;
  description: string;
  itemCount: number;
}

export interface InterviewItem {
  id: string;
  title: string;
  body: string;
  learnSlug?: string;
  tags?: string[];
}

export interface InterviewSection {
  id: string;
  title: string;
  description: string;
  items: InterviewItem[];
}

export interface SearchResult {
  topics: TopicSummary[];
  interview: Array<{
    sectionId: string;
    sectionTitle: string;
    itemId: string;
    title: string;
    learnSlug?: string;
  }>;
}
