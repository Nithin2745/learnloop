import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { serverConfig } from './config.js';
import {
  validateGeneratePlanInput,
  validateExtractInput,
  validateLearnInput,
  validateReviseInput,
  validateExpandInput,
  validateGradeInput,
} from './validation.js';
import { generatePlan } from './planService.js';
import { extractTopics } from './extractService.js';
import { expandTopics } from './expandService.js';
import { generateLearning } from './learnService.js';
import { generateRevision } from './reviseService.js';
import { gradeAnswer } from './gradeService.js';
import { requireAuth } from './auth.js';

const app = express();

app.use(cors({ origin: serverConfig.corsOrigins }));
app.use(express.json({ limit: '1mb' }));

// Per-user abuse guard for the paid LLM endpoints. requireAuth runs first (see
// the /api router below), so every limited request carries a req.user and we
// key the window by user id — each signed-in user gets their own generous
// budget instead of sharing one per-IP bucket. Limits are deliberately generous
// so a normal study session is never blocked — a large syllabus fans out to
// several /extract-topics calls, and Learn/Revise generate per topic — while
// still capping runaway abuse of the (metered) AI provider. Swap in a shared
// store (e.g. Redis) if you run more than one instance.
const llmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // requests per user per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'learnloop-backend' });
});

/** Map a tagged LLM/service error to the appropriate HTTP response. */
function sendLlmError(res, err, label) {
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
        error: 'The AI returned an unreadable response. Please try again.',
      });
    default:
      console.error(`${label} failed:`, err);
      return res.status(502).json({
        error: 'The AI service request failed. Please try again.',
      });
  }
}

// All study endpoints live behind sign-in. requireAuth (401 on a missing or
// invalid token) runs before llmLimiter so anonymous traffic is rejected
// without consuming rate-limit budget, and so the limiter can key by user id.
// GET /api/health is registered on `app` above, so it stays public.
const api = express.Router();
api.use(requireAuth);
api.use(llmLimiter);

api.post('/generate-plan', async (req, res) => {
  const { valid, errors, value } = validateGeneratePlanInput(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid input.', details: errors });
  }

  try {
    const plan = await generatePlan(value);
    return res.json(plan);
  } catch (err) {
    return sendLlmError(res, err, 'generate-plan');
  }
});

api.post('/extract-topics', async (req, res) => {
  const { valid, errors, value } = validateExtractInput(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid input.', details: errors });
  }

  try {
    const result = await extractTopics(value.text);
    return res.json(result);
  } catch (err) {
    return sendLlmError(res, err, 'extract-topics');
  }
});

api.post('/expand-topics', async (req, res) => {
  const { valid, errors, value } = validateExpandInput(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid input.', details: errors });
  }

  try {
    const result = await expandTopics(value.topics, value.level);
    return res.json(result);
  } catch (err) {
    return sendLlmError(res, err, 'expand-topics');
  }
});

api.post('/learn', async (req, res) => {
  const { valid, errors, value } = validateLearnInput(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid input.', details: errors });
  }

  try {
    const result = await generateLearning(value.topics);
    return res.json(result);
  } catch (err) {
    return sendLlmError(res, err, 'learn');
  }
});

api.post('/revise', async (req, res) => {
  const { valid, errors, value } = validateReviseInput(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid input.', details: errors });
  }

  try {
    const result = await generateRevision(value.topics);
    return res.json(result);
  } catch (err) {
    return sendLlmError(res, err, 'revise');
  }
});

api.post('/grade', async (req, res) => {
  const { valid, errors, value } = validateGradeInput(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid input.', details: errors });
  }

  try {
    const result = await gradeAnswer(value);
    return res.json(result);
  } catch (err) {
    return sendLlmError(res, err, 'grade');
  }
});

app.use('/api', api);

// JSON body parse errors -> 400 instead of a stack trace.
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  console.error('Unexpected error:', err);
  return res.status(500).json({ error: 'Unexpected server error.' });
});

// Start a long-running listener only when this module is the process
// entrypoint — local dev (`npm run dev` / `npm start`) and long-running hosts
// like Render/Railway, none of which set VERCEL. On Vercel the app is imported
// by api/index.js and served as a serverless function, where opening a listener
// is wrong (and pointless), so we skip it there and export the app instead.
if (!process.env.VERCEL) {
  app.listen(serverConfig.port, () => {
    console.log(`LearnLoop backend listening on http://localhost:${serverConfig.port}`);
  });
}

export default app;
