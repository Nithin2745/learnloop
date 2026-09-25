import { useCallback, useEffect, useRef, useState } from 'react';
import SetupScreen from './components/SetupScreen.jsx';
import ModeNav from './components/ModeNav.jsx';
import LoadingState from './components/LoadingState.jsx';
import Results from './components/Results.jsx';
import LearnMode from './components/LearnMode.jsx';
import RevisionMode from './components/RevisionMode.jsx';
import Login from './components/Login.jsx';
import HistoryView from './components/HistoryView.jsx';
import DueToday from './components/DueToday.jsx';
import { useAuth } from './auth/AuthProvider.jsx';
import { useHistory } from './hooks/useHistory.js';
import { useReviews } from './hooks/useReviews.js';
import { generatePlan, generateLearning, generateRevision, generatePracticeQuestions } from './api.js';
import { dedupeByBase } from './lib/topics.js';
import { itemKeyForTopic } from './lib/sm2.js';
import { readNav, writeNav, clearNav } from './lib/navStore.js';

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
    return data; // the caller persists this onto the open history row
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
  const { user, loading: authLoading, signOut } = useAuth();

  const [setup, setSetup] = useState(null); // { topics: string[], examDate, hoursPerDay }
  const [mode, setMode] = useState('plan'); // 'plan' | 'learn' | 'revise'
  const [view, setView] = useState('study'); // 'study' | 'history'

  // Study history: local-first cache backed by Supabase (source of truth).
  const { sessions, loading: historyLoading, saveSession, deleteSession, updateSession } =
    useHistory(user?.id);

  // Spaced repetition: graded answers schedule topic reviews (local-first, SM-2).
  const { dueToday, recordReview } = useReviews(user?.id);

  const [plan, setPlan] = useState(null);
  const [planStatus, setPlanStatus] = useState('idle'); // idle | loading | ready | error
  const [planError, setPlanError] = useState('');

  // Keep a ref to the latest plan so generatePractice can merge new questions
  // onto it when persisting without going stale inside its useCallback closure.
  const planRef = useRef(null);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  // Learn is generated UP FRONT in one batch when Learn mode is first opened.
  const [learn, setLearn] = useState({ state: 'idle', items: [], error: '' });
  const learnToken = useRef(0);

  // Revise stays lazy per topic (generated when a topic is selected).
  const [reviseCache, setReviseCache] = useState({});
  const reviseReq = useRef(new Set());

  // Practice questions are also lazy per topic (the plan no longer bakes them
  // in): each topic's questions are fetched when its panel is first opened.
  const [practiceCache, setPracticeCache] = useState({});
  const practiceReq = useRef(new Set());

  // Which saved-history row (if any) the current session belongs to, so newly
  // generated Learn/Revise can be written back onto it. reviseSaved mirrors the
  // persisted { [topic]: data } map so each new topic merges on top of the rest.
  // practiceSaved mirrors { [topic]: { topic, questions } } for the same reason.
  // The saved-history row id the current session belongs to. Kept as BOTH state
  // and a ref: the state re-fires the nav-persist effect when it changes (e.g.
  // after handleConfirm saves a new plan), while the ref gives the async
  // callbacks below a fresh, stale-closure-proof read. commitSessionId sets both.
  const [sessionId, setSessionId] = useState(null);
  const sessionIdRef = useRef(null);
  const commitSessionId = useCallback((id) => {
    sessionIdRef.current = id;
    setSessionId(id);
  }, []);
  const reviseSaved = useRef({});
  const practiceSaved = useRef({});

  // Reload navigation (see ./lib/navStore.js): snapshot the persisted pointer at
  // first render so a StrictMode double-mount / early persist can't clobber it,
  // and gate the persist effect until the one-time restore has run.
  const savedNav = useRef(readNav());
  const didRestore = useRef(false);

  const runPlan = useCallback(async (cfg) => {
    setPlanStatus('loading');
    setPlanError('');
    try {
      const result = await generatePlan({
        topics: dedupeByBase(cfg.topics).join('\n'),
        examDate: cfg.examDate,
        hoursPerDay: cfg.hoursPerDay,
        weekdayHours: cfg.weekdayHours,
        weekendHours: cfg.weekendHours,
      });
      setPlan(result);
      setPlanStatus('ready');
      return result;
    } catch (err) {
      setPlanError(err.message || 'Something went wrong. Please try again.');
      setPlanStatus('error');
      return null;
    }
  }, []);

  const runLearn = useCallback(async (topics) => {
    const token = ++learnToken.current;
    setLearn({ state: 'loading', items: [], error: '' });
    try {
      const { items } = await generateLearning(topics);
      if (learnToken.current !== token) return; // a newer run superseded this one
      const ready = items || [];
      setLearn({ state: 'ready', items: ready, error: '' });
      // Persist so reopening this session from History restores Learn instead of
      // regenerating (best-effort; the optimistic cache already covers this device).
      if (sessionIdRef.current && ready.length) {
        updateSession(sessionIdRef.current, { learn: ready });
      }
    } catch (err) {
      if (learnToken.current !== token) return;
      setLearn({
        state: 'error',
        items: [],
        error: err.message || 'Could not prepare your topics.',
      });
    }
  }, [updateSession]);

  // Generate all Learn content the first time the user opens Learn mode.
  useEffect(() => {
    if (setup && mode === 'learn' && learn.state === 'idle') runLearn(setup.topics);
  }, [setup, mode, learn.state, runLearn]);

  const resetSessionCaches = useCallback(() => {
    learnToken.current += 1; // invalidate any in-flight Learn batch
    setLearn({ state: 'idle', items: [], error: '' });
    setReviseCache({});
    reviseReq.current = new Set();
    setPracticeCache({});
    practiceReq.current = new Set();
    commitSessionId(null); // callers that open or save a row set this after
    reviseSaved.current = {};
    practiceSaved.current = {};
  }, [commitSessionId]);

  async function handleConfirm(cfg) {
    setView('study');
    setSetup(cfg);
    setMode('plan');
    resetSessionCaches();
    const result = await runPlan(cfg);
    // Save a history entry only for a freshly generated plan (retries reuse runPlan
    // directly and must not create a second row).
    if (result) {
      const row = await saveSession({
        topics: cfg.topics,
        examDate: cfg.examDate,
        hoursPerDay: cfg.hoursPerDay,
        plan: result,
      });
      commitSessionId(row?.id ?? null); // Learn/Revise write back onto this row
    }
  }

  function handleNewSetup() {
    setSetup(null);
    setPlan(null);
    setPlanStatus('idle');
    setPlanError('');
    resetSessionCaches();
    setView('study');
  }

  // Reload a saved session's plan back into the app (from the History view).
  const openSession = useCallback((session) => {
    resetSessionCaches();
    setSetup({
      topics: Array.isArray(session.topics) ? session.topics : [],
      examDate: session.exam_date || '',
      hoursPerDay: session.hours_per_day ?? null,
    });
    setPlan(session.plan);
    setPlanStatus('ready');
    setPlanError('');
    setMode('plan');
    setView('study');
    commitSessionId(session.id ?? null);

    // Restore previously generated Learn/Revise so reopening doesn't regenerate
    // (and re-spend LLM quota). Missing/empty => stay idle and generate on demand.
    const savedLearn = Array.isArray(session.learn) ? session.learn : [];
    if (savedLearn.length) setLearn({ state: 'ready', items: savedLearn, error: '' });

    const savedRevise =
      session.revise && typeof session.revise === 'object' ? session.revise : {};
    const restored = {};
    for (const [topic, data] of Object.entries(savedRevise)) {
      if (!data) continue;
      restored[topic] = { state: 'ready', data };
      reviseReq.current.add(topic); // block RevisionMode's lazy re-fetch for this topic
    }
    if (Object.keys(restored).length) {
      setReviseCache(restored);
      reviseSaved.current = { ...savedRevise };
    }

    // Restore previously generated practice questions the same way. These live
    // in the plan JSON (plan.practiceQuestions = [{ topic, questions }]); prime
    // the cache so the lazy PracticeQuestionsTab renders old saved plans without
    // re-fetching, and block a duplicate fetch when that topic's panel opens.
    const savedPractice = Array.isArray(session.plan?.practiceQuestions)
      ? session.plan.practiceQuestions
      : [];
    const restoredPractice = {};
    for (const group of savedPractice) {
      const topic = group?.topic;
      if (!topic) continue;
      restoredPractice[topic] = { state: 'ready', data: group };
      practiceReq.current.add(topic);
      practiceSaved.current[topic] = group;
    }
    if (Object.keys(restoredPractice).length) {
      setPracticeCache(restoredPractice);
    }
  }, [resetSessionCaches, commitSessionId]);

  const generateRevise = useCallback(
    async (topic) => {
      const data = await runGenerate(reviseReq, setReviseCache, generateRevision, topic);
      // Persist the newly generated topic onto the open history row (merged with any
      // already-saved topics) so it restores on reopen instead of regenerating.
      if (data && sessionIdRef.current) {
        reviseSaved.current = { ...reviseSaved.current, [topic]: data };
        updateSession(sessionIdRef.current, { revise: reviseSaved.current });
      }
    },
    [updateSession],
  );

  const generatePractice = useCallback(
    async (topic) => {
      const data = await runGenerate(practiceReq, setPracticeCache, generatePracticeQuestions, topic);
      // Persist onto the open history row's plan JSON so reopening restores the
      // questions instead of re-spending LLM quota. planRef supplies the current
      // plan as the merge base (avoids a stale closure over `plan`).
      if (data && sessionIdRef.current) {
        practiceSaved.current = { ...practiceSaved.current, [topic]: data };
        const base = planRef.current || {};
        updateSession(sessionIdRef.current, {
          plan: { ...base, practiceQuestions: Object.values(practiceSaved.current) },
        });
      }
    },
    [updateSession],
  );

  // --- Reload navigation (see ./lib/navStore.js) ------------------------------
  // One-time restore on mount: put the user back where they were before a
  // reload. A pointer with a sessionId reopens that history row (its plan/learn/
  // revise content lives there) once history has loaded it; an ad-hoc setup with
  // no row is rebuilt from the pointer's topics; otherwise we just restore view.
  useEffect(() => {
    if (didRestore.current) return;
    const ptr = savedNav.current;
    if (!ptr || (user?.id && ptr.userId && ptr.userId !== user.id)) {
      didRestore.current = true; // nothing to restore (or a different user)
      return;
    }
    if (ptr.sessionId) {
      const row = sessions.find((s) => s.id === ptr.sessionId);
      if (row) {
        openSession(row); // sets mode/view to plan/study — override below
        if (ptr.mode) setMode(ptr.mode);
        if (ptr.view) setView(ptr.view);
        didRestore.current = true;
      } else if (!historyLoading) {
        if (ptr.view) setView(ptr.view); // row gone (deleted elsewhere): give up
        didRestore.current = true;
      }
      return; // else still loading — a later run (sessions changed) retries
    }
    if (ptr.hasSetup && Array.isArray(ptr.topics) && ptr.topics.length) {
      setSetup({ topics: ptr.topics, examDate: '', hoursPerDay: null });
      if (ptr.mode) setMode(ptr.mode);
    }
    if (ptr.view) setView(ptr.view);
    didRestore.current = true;
  }, [user?.id, sessions, historyLoading, openSession]);

  // Persist the pointer on every navigation change, but only after the initial
  // restore has run so the app's blank starting state can't overwrite it first.
  useEffect(() => {
    if (!didRestore.current) return;
    writeNav({
      userId: user?.id ?? null,
      view,
      mode,
      sessionId,
      hasSetup: !!setup,
      topics: setup?.topics ?? null,
    });
  }, [user?.id, view, mode, setup, sessionId]);

  // A graded answer (Plan practice or Revise Q&A) schedules that topic for
  // spaced review: grade score -> SM-2 quality -> review_state upsert.
  const handleGraded = useCallback(
    ({ topic, score }) => {
      if (!topic) return;
      recordReview({ itemKey: itemKeyForTopic(topic), label: topic, score });
    },
    [recordReview],
  );

  // Jump straight into revising one topic (from the "Due today" queue).
  function reviseTopic(topic) {
    if (!topic) return;
    resetSessionCaches();
    setSetup({ topics: [topic], examDate: '', hoursPerDay: null });
    setPlan(null);
    setPlanStatus('idle');
    setPlanError('');
    setMode('revise');
    setView('study');
  }

  const reviseTopics = setup ? dedupeByBase(setup.topics) : [];

  // Auth gate: wait for the stored session to load, then require sign-in.
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
      </div>
    );
  }
  if (!user) return <Login />;

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
          <div className="ml-auto flex items-center gap-2">
            {setup && view === 'study' && <ModeNav mode={mode} onChange={setMode} />}
            {setup && (
              <button
                type="button"
                onClick={handleNewSetup}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                New setup
              </button>
            )}
            <button
              type="button"
              onClick={() => setView((v) => (v === 'history' ? 'study' : 'history'))}
              className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                view === 'history'
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              History
              {dueToday.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold text-white">
                  {dueToday.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => { clearNav(); signOut(); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {view === 'history' ? (
          <>
            <DueToday items={dueToday} onRevise={reviseTopic} />
            <HistoryView
              sessions={sessions}
              loading={historyLoading}
              onOpen={openSession}
              onDelete={deleteSession}
            />
          </>
        ) : (
          <>
            {!setup && (
              <>
                <DueToday items={dueToday} onRevise={reviseTopic} />
                <SetupScreen onConfirm={handleConfirm} error={planError} />
              </>
            )}

            {setup && mode === 'plan' && (
              <>
                {planStatus === 'loading' && <LoadingState />}
                {planStatus === 'idle' && !plan && (
                  <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
                    No study plan for these topics yet.{' '}
                    <button
                      type="button"
                      onClick={() => runPlan(setup)}
                      className="font-medium text-indigo-600 underline-offset-2 hover:underline"
                    >
                      Build a plan
                    </button>{' '}
                    — or switch to Revise above to practice them now.
                  </div>
                )}
                {planStatus === 'error' && (
                  <PlanError message={planError} onRetry={() => runPlan(setup)} />
                )}
                {planStatus === 'ready' && plan && (
                  <Results
                    plan={plan}
                    practiceCache={practiceCache}
                    onGeneratePractice={generatePractice}
                    onReset={handleNewSetup}
                    onGraded={handleGraded}
                  />
                )}
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
              <RevisionMode
                topics={reviseTopics}
                cache={reviseCache}
                onGenerate={generateRevise}
                onGraded={handleGraded}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
