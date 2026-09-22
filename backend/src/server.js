import express from 'express';
import cors from 'cors';
import { serverConfig } from './config.js';
import { validateGeneratePlanInput } from './validation.js';
import { generatePlan } from './planService.js';

const app = express();

app.use(cors({ origin: serverConfig.corsOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'learnloop-backend' });
});

app.post('/api/generate-plan', async (req, res) => {
  const { valid, errors, value } = validateGeneratePlanInput(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid input.', details: errors });
  }

  try {
    const plan = await generatePlan(value);
    return res.json(plan);
  } catch (err) {
    switch (err.code) {
      case 'RATE_LIMIT':
        return res.status(429).json({
          error: 'The AI service is busy right now. Please wait a moment and try again.',
        });
      case 'AUTH':
        return res.status(500).json({
          error: 'Server is misconfigured: the AI API key is missing or invalid.',
        });
      case 'PARSE_FAILED':
        return res.status(502).json({
          error: 'The AI returned an unreadable plan. Please try again.',
        });
      default:
        console.error('generate-plan failed:', err);
        return res.status(502).json({
          error: 'Failed to generate a study plan. Please try again.',
        });
    }
  }
});

// JSON body parse errors -> 400 instead of a stack trace.
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  console.error('Unexpected error:', err);
  return res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(serverConfig.port, () => {
  console.log(`LearnLoop backend listening on http://localhost:${serverConfig.port}`);
});
