export interface RoadmapGroup {
  id: string;
  label: string;
  hint: string;
  slugs: string[];
}

export const ROADMAP: RoadmapGroup[] = [
  {
    id: 'craft',
    label: 'Engineering craft',
    hint: 'SWE · LLD · Testing · Git',
    slugs: ['software-engineering', 'low-level-design', 'testing-quality', 'git-collaboration'],
  },
  {
    id: 'stack',
    label: 'Languages & frameworks',
    hint: 'Java · Spring · Python · Django · Node',
    slugs: ['java', 'spring-boot', 'python', 'django', 'nodejs'],
  },
  {
    id: 'frontend',
    label: 'Frontend',
    hint: 'Web · React · Next · Angular · UI/UX',
    slugs: ['frontend', 'react', 'nextjs', 'angular', 'ui-ux'],
  },
  {
    id: 'backend',
    label: 'Backend & data',
    hint: 'API · Backend · Database · Security',
    slugs: ['backend', 'api-design', 'database', 'security'],
  },
  {
    id: 'systems',
    label: 'Systems',
    hint: 'CS · DSA · System Design · DevOps · AI',
    slugs: ['cs-fundamentals', 'dsa', 'system-design', 'devops-cloud', 'ai-ml'],
  },
  {
    id: 'behavioral',
    label: 'Interview soft skills',
    hint: 'Behavioral STAR',
    slugs: ['behavioral'],
  },
];

export function groupForSlug(slug: string): RoadmapGroup | undefined {
  return ROADMAP.find((g) => g.slugs.includes(slug));
}
