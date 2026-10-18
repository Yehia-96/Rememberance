-- Rememberance database setup.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste this → Run.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  emoji text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category_id uuid not null references public.categories on delete cascade,
  title text,
  transcript text not null default '',
  summary text,
  audio_path text,
  photo_path text,
  pdf_path text,
  pdf_name text,
  location_name text,
  latitude double precision,
  longitude double precision,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists recordings_category_idx on public.recordings (category_id, created_at desc);

-- Row Level Security: every user only ever sees their own rows.
alter table public.categories enable row level security;
alter table public.recordings enable row level security;

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own recordings" on public.recordings;
create policy "own recordings" on public.recordings
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Private storage bucket for audio, photos and PDFs. Files live under "<user id>/<recording id>/...".
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

drop policy if exists "own media select" on storage.objects;
create policy "own media select" on storage.objects
  for select using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own media insert" on storage.objects;
create policy "own media insert" on storage.objects
  for insert with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own media update" on storage.objects;
create policy "own media update" on storage.objects
  for update using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "own media delete" on storage.objects;
create policy "own media delete" on storage.objects
  for delete using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
