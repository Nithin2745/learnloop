-- LearnLoop · B2 study history
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- Idempotent: safe to re-run.

-- One row per generated study plan, owned by the signed-in user.
create table if not exists public.study_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  topics        jsonb not null default '[]'::jsonb,
  exam_date     date,
  hours_per_day int,
  plan          jsonb not null
);

-- Fast "my sessions, newest first" lookups (matches the app's ordered fetch).
create index if not exists study_sessions_user_created_idx
  on public.study_sessions (user_id, created_at desc);

-- Row Level Security: a user can only ever read/write their own rows.
alter table public.study_sessions enable row level security;

drop policy if exists "study_sessions_select_own" on public.study_sessions;
create policy "study_sessions_select_own"
  on public.study_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "study_sessions_insert_own" on public.study_sessions;
create policy "study_sessions_insert_own"
  on public.study_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "study_sessions_update_own" on public.study_sessions;
create policy "study_sessions_update_own"
  on public.study_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "study_sessions_delete_own" on public.study_sessions;
create policy "study_sessions_delete_own"
  on public.study_sessions for delete
  using (auth.uid() = user_id);
