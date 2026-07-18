import type { CategoryId, CategoryMeta } from './types';

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  core: {
    id: 'core',
    label: 'Core',
    accent: '#0D9488',
    bg: '#F0FDFA',
    text: '#0F766E',
    border: '#99F6E4',
  },
  data: {
    id: 'data',
    label: 'Backend',
    accent: '#0284C7',
    bg: '#F0F9FF',
    text: '#0369A1',
    border: '#BAE6FD',
  },
  arch: {
    id: 'arch',
    label: 'Architecture',
    accent: '#C2410C',
    bg: '#FFF7ED',
    text: '#9A3412',
    border: '#FED7AA',
  },
  ops: {
    id: 'ops',
    label: 'Ops',
    accent: '#4F46E5',
    bg: '#EEF2FF',
    text: '#3730A3',
    border: '#C7D2FE',
  },
  ai: {
    id: 'ai',
    label: 'AI Era',
    accent: '#BE185D',
    bg: '#FDF2F8',
    text: '#9D174D',
    border: '#FBCFE8',
  },
  practice: {
    id: 'practice',
    label: 'Practice',
    accent: '#B45309',
    bg: '#FFFBEB',
    text: '#92400E',
    border: '#FDE68A',
  },
};

export const QUIZ_POINTS_PER_QUESTION = 10;
export const TOPIC_COMPLETE_BONUS = 25;

export function getCategory(cat: CategoryId): CategoryMeta {
  return CATEGORIES[cat];
}
