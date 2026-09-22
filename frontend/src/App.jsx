import { useState } from 'react';
import StudyPlanForm from './components/StudyPlanForm.jsx';
import LoadingState from './components/LoadingState.jsx';
import Results from './components/Results.jsx';
import { generatePlan } from './api.js';

export default function App() {
  const [status, setStatus] = useState('form'); // 'form' | 'loading' | 'results'
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit(payload) {
    setStatus('loading');
    setError('');
    try {
      const result = await generatePlan(payload);
      setPlan(result);
      setStatus('results');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('form');
    }
  }

  function handleReset() {
    setPlan(null);
    setError('');
    setStatus('form');
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-sm">
            <span className="text-lg font-bold">L</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-slate-900">
              LearnLoop
            </h1>
            <p className="text-xs text-slate-500">Your day-by-day study plan</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {status === 'loading' && <LoadingState />}
        {status === 'results' && <Results plan={plan} onReset={handleReset} />}
        {status === 'form' && (
          <StudyPlanForm onSubmit={handleSubmit} error={error} />
        )}
      </main>
    </div>
  );
}
