import { useCallback, useEffect, useRef, useState } from 'react';
import SetupScreen from './components/SetupScreen.jsx';
import ModeNav from './components/ModeNav.jsx';
import LoadingState from './components/LoadingState.jsx';
import Results from './components/Results.jsx';
import LearnMode from './components/LearnMode.jsx';
import RevisionMode from './components/RevisionMode.jsx';
import { generatePlan, generateLearning, generateRevision } from './api.js';
import { dedupeByBase } from './lib/topics.js';

/**
 * Lazily generate one topic's content into a topic-keyed cache
 * ({ [topic]: { state:'loading'|'ready'|'error', data, error } }), guarding
 * against duplicate fetches for a topic already loading or ready.
 */
async function runGenerate(reqRef, setCache, apiFn, topic) {
  // Ref-based guard: synchronous, so it also blocks React StrictMode's
  // double-invoked effects and rapid re-opens from firing duplicate requests.
  if (reqRef.current.has(topic)) return;
  reqRef.current.add(topic);
  setCache((cur) => ({ ...cur, [topic]: { state: 'loading' } }));
  try {
    const { items } = await apiFn([topic]);
    const data = items?.[0] || null;
    setCache((cur) => ({
      ...cur,
      [topic]: data
        ? { state: 'ready', data }
        : { state: 'error', error: 'No content was returned for this topic.' },
    }));
  } catch (err) {
    reqRef.current.delete(topic); // allow a retry after failure
    setCache((cur) => ({
      ...cur,
      [topic]: { state: 'error', error: err.message || 'Could not load this topic.' },
    }));
  }
}

function PlanError({ message, onRetry }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm">
      <p className="text-rose-700">{message || 'Could not build your plan.'}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
      >
        Try again
      </button>
    </div>
  );
}

export default function App() {
  const [setup, setSetup] = useState(null); // { topics: string[], examDate, hoursPerDay }
  const [mode, setMode] = useState('plan'); // 'plan' | 'learn' | 'revise'

  const [plan, setPlan] = useState(null);
  const [planStatus, setPlanStatus] = useState('idle'); // idle | loading | ready | error
  const [planError, setPlanError] = useState('');

  // Learn is generated UP FRONT in one batch when Learn mode is first opened.
  const [learn, setLearn] = useState({ state: 'idle', items: [], error: '' });
  const learnToken = useRef(0);

  // Revise stays lazy per topic (generated when a topic is selected).
  const [reviseCache, setReviseCache] = useState({});
  const reviseReq = useRef(new Set());

  const runPlan = useCallback(async (cfg) => {
    setPlanStatus('loading');
    setPlanError('');
    try {
      const result = await generatePlan({
        topics: dedupeByBase(cfg.topics).join('\n'),
        examDate: cfg.examDate,
        hoursPerDay: cfg.hoursPerDay,
      });
      setPlan(result);
      setPlanStatus('ready');
    } catch (err) {
      setPlanError(err.message || 'Something went wrong. Please try again.');
      setPlanStatus('error');
    }
  }, []);

  const runLearn = useCallback(async (topics) => {
    const token = ++learnToken.current;
    setLearn({ state: 'loading', items: [], error: '' });
    try {
      const { items } = await generateLearning(topics);
      if (learnToken.current !== token) return; // a newer run superseded this one
      setLearn({ state: 'ready', items: items || [], error: '' });
    } catch (err) {
      if (learnToken.current !== token) return;
      setLearn({
        state: 'error',
        items: [],
        error: err.message || 'Could not prepare your topics.',
      });
    }
  }, []);

  // Generate all Learn content the first time the user opens Learn mode.
  useEffect(() => {
    if (setup && mode === 'learn' && learn.state === 'idle') runLearn(setup.topics);
  }, [setup, mode, learn.state, runLearn]);

  function resetSessionCaches() {
    learnToken.current += 1; // invalidate any in-flight Learn batch
    setLearn({ state: 'idle', items: [], error: '' });
    setReviseCache({});
    reviseReq.current = new Set();
  }

  function handleConfirm(cfg) {
    setSetup(cfg);
    setMode('plan');
    resetSessionCaches();
    runPlan(cfg);
  }

  function handleNewSetup() {
    setSetup(null);
    setPlan(null);
    setPlanStatus('idle');
    setPlanError('');
    resetSessionCaches();
  }

  const generateRevise = useCallback(
    (topic) => runGenerate(reviseReq, setReviseCache, generateRevision, topic),
    [],
  );

  const reviseTopics = setup ? dedupeByBase(setup.topics) : [];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
              <span className="text-lg font-bold">L</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight text-slate-900">LearnLoop</h1>
              <p className="text-xs text-slate-500">
                {setup ? 'Plan · Learn · Revise' : 'Your day-by-day study plan'}
              </p>
            </div>
          </div>
          {setup && (
            <div className="ml-auto flex items-center gap-2">
              <ModeNav mode={mode} onChange={setMode} />
              <button
                type="button"
                onClick={handleNewSetup}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                New setup
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {!setup && <SetupScreen onConfirm={handleConfirm} error={planError} />}

        {setup && mode === 'plan' && (
          <>
            {(planStatus === 'idle' || planStatus === 'loading') && <LoadingState />}
            {planStatus === 'error' && (
              <PlanError message={planError} onRetry={() => runPlan(setup)} />
            )}
            {planStatus === 'ready' && plan && <Results plan={plan} onReset={handleNewSetup} />}
          </>
        )}

        {setup && mode === 'learn' && (
          <LearnMode
            state={learn.state}
            items={learn.items}
            error={learn.error}
            onRetry={() => runLearn(setup.topics)}
          />
        )}

        {setup && mode === 'revise' && (
          <RevisionMode topics={reviseTopics} cache={reviseCache} onGenerate={generateRevise} />
        )}
      </main>
    </div>
  );
}
