import { Router } from 'express';
import { searchAll } from '../catalog.ts';

export const searchRouter = Router();

searchRouter.get('/', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  res.json(searchAll(q));
});
