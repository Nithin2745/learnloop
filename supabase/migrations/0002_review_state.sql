-- LearnLoop · B3 spaced repetition (SM-2)
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- Idempotent: safe to re-run.

-- One row per (user, review item). item_key is a stable client-side hash of the
-- normalized topic text (backend content is id-less), see frontend/src/lib/sm2.js.
create table if not exists public.review_state (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_key      text not null,
  label         text not null default '',
  easiness      real not null default 2.5,
  interval_days int  not null default 0,
  repetitions   int  not null default 0,
  due_date      date,
  last_grade    int,
  last_reviewed timestamptz not null default now(),
  primary key (user_id, item_key)
);

-- Fast "my items due on/before today" lookups.
create index if not exists review_state_user_due_idx
  on public.review_state (user_id, due_date);

-- Row Level Security: a user can only ever read/write their own rows.
alter table public.review_state enable row level security;

drop policy if exists "review_state_select_own" on public.review_state;
create policy "review_state_select_own"
  on public.review_state for select
  using (auth.uid() = user_id);

drop policy if exists "review_state_insert_own" on public.review_state;
create policy "review_state_insert_own"
  on public.review_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "review_state_update_own" on public.review_state;
create policy "review_state_update_own"
  on public.review_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "review_state_delete_own" on public.review_state;
create policy "review_state_delete_own"
  on public.review_state for delete
  using (auth.uid() = user_id);
