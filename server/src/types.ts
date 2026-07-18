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
  relatedSlugs: string[];
  quiz: QuizQuestion[];
  problems: PracticeProblem[];
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
