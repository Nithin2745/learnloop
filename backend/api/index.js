// Vercel serverless entrypoint for the LearnLoop backend.
//
// Vercel can't run a long-lived `app.listen` server, so the Express app is
// imported and re-exported here as the function's request handler. The sibling
// vercel.json rewrites every incoming path to this one function, and Express's
// own router (`/api/health`, `/api/generate-plan`, …) matches on the original
// URL. Importing server.js does NOT open a listener because VERCEL is set in
// this environment (see the guard at the bottom of src/server.js).
//
// Local dev never uses this file — `npm run dev` runs src/server.js directly.
import app from '../src/server.js';

export default app;
