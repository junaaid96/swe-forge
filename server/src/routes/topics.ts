import { Router } from 'express';
import {
  getDeepTrack,
  getInterviewLevel,
  getTopicDetail,
  TOPIC_SUMMARIES,
} from '../catalog.ts';

export const topicsRouter = Router();

topicsRouter.get('/', (_req, res) => {
  res.json({ topics: TOPIC_SUMMARIES });
});

topicsRouter.get('/:slug', (req, res) => {
  const topic = getTopicDetail(req.params.slug);
  if (!topic) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }
  res.json({ topic });
});

topicsRouter.get('/:slug/interview/:level', (req, res) => {
  const content = getInterviewLevel(req.params.slug, req.params.level);
  if (!content) {
    res.status(404).json({ error: 'Interview level not found' });
    return;
  }
  res.json({ interview: content });
});

topicsRouter.get('/:slug/deep/:track', (req, res) => {
  const content = getDeepTrack(req.params.slug, req.params.track);
  if (!content) {
    res.status(404).json({ error: 'Deep track not found' });
    return;
  }
  res.json({ deep: content });
});
