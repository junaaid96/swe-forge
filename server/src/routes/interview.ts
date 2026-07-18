import { Router } from 'express';
import { getInterviewSection, INTERVIEW_SECTIONS } from '../catalog.ts';

export const interviewRouter = Router();

interviewRouter.get('/', (_req, res) => {
  res.json({
    sections: INTERVIEW_SECTIONS.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      itemCount: s.items.length,
    })),
  });
});

interviewRouter.get('/:sectionId', (req, res) => {
  const section = getInterviewSection(req.params.sectionId);
  if (!section) {
    res.status(404).json({ error: 'Interview section not found' });
    return;
  }
  res.json({ section });
});
