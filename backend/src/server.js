import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { serverConfig } from './config.js';
import {
  validateGeneratePlanInput,
  validateExtractInput,
  validateLearnInput,
  validateReviseInput,
} from './validation.js';
import { generatePlan } from './planService.js';
import { extractTopics } from './extractService.js';
import { generateLearning } from './learnService.js';
import { generateRevision } from './reviseService.js';

const app = express();

app.use(cors({ origin: serverConfig.corsOrigins }));
app.use(express.json({ limit: '1mb' }));

// Basic abuse guard for the unauthenticated, paid LLM endpoints. Limits are
// deliberately generous so a normal study session is never blocked — a large
// syllabus fans out to several /extract-topics calls, and Learn/Revise
// generate per topic — while still capping runaway automated abuse of the
// (metered) AI provider. Tune windowMs/limit for your deployment, and swap in
// a shared store (e.g. Redis) if you run more than one instance.
const llmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
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

app.post('/api/generate-plan', llmLimiter, async (req, res) => {
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

app.post('/api/extract-topics', llmLimiter, async (req, res) => {
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

app.post('/api/learn', llmLimiter, async (req, res) => {
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

app.post('/api/revise', llmLimiter, async (req, res) => {
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
