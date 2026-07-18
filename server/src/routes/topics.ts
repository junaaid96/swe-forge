import { Router } from 'express';
import { getTopic, TOPICS, toTopicSummary } from '../catalog.ts';

export const topicsRouter = Router();

topicsRouter.get('/', (_req, res) => {
  res.json({ topics: TOPICS.map(toTopicSummary) });
});

topicsRouter.get('/:slug', (req, res) => {
  const topic = getTopic(req.params.slug);
  if (!topic) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }
  res.json({ topic });
});
