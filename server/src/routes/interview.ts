import { Router } from 'express';
import { TOPIC_SUMMARIES } from '../catalog.js';

/**
 * Legacy compatibility: list topics as former "interview sections".
 * Prefer /api/topics/:slug/interview/:level.
 */
export const interviewRouter = Router();

interviewRouter.get('/', (_req, res) => {
  res.json({
    sections: TOPIC_SUMMARIES.map((t) => ({
      id: t.slug,
      title: t.title,
      description: t.tag,
      itemCount: t.interviewLevels.length,
    })),
  });
});

interviewRouter.get('/:sectionId', (req, res) => {
  const topic = TOPIC_SUMMARIES.find((t) => t.slug === req.params.sectionId);
  if (!topic) {
    res.status(404).json({ error: 'Section not found' });
    return;
  }
  res.json({
    section: {
      id: topic.slug,
      title: topic.title,
      description: topic.tag,
      items: topic.interviewLevels.map((level) => ({
        id: level,
        title: level,
        body: `Open /topics/${topic.slug}/interview/${level}`,
        learnSlug: topic.slug,
        tags: ['interview', level],
      })),
    },
  });
});
