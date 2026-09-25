-- LearnLoop · persist Learn + Revise content into study history
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- Idempotent: safe to re-run.

-- Learn (an array of per-topic explainers) and Revise (a map of topic -> its
-- flashcards + Q&A) are generated AFTER the plan, when the user opens those tabs.
-- Storing them on the session row lets "Open" in History restore what was already
-- generated instead of re-generating (and re-spending LLM quota). Both are optional
-- and stay null until the user visits that tab. Existing RLS policies already scope
-- every column to the owner (row-level), so no policy change is needed.
alter table public.study_sessions
  add column if not exists learn  jsonb,
  add column if not exists revise jsonb;
