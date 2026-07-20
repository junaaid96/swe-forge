import cors from 'cors';
import express from 'express';
import { interviewRouter } from './routes/interview.js';
import { searchRouter } from './routes/search.js';
import { topicsRouter } from './routes/topics.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'swe-forge-api' });
});

app.use('/api/topics', topicsRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/search', searchRouter);

app.listen(port, '0.0.0.0', () => {
  console.log(`SWE Forge API listening on http://0.0.0.0:${port}`);
});
