create extension if not exists pgcrypto;

create table if not exists public.boards (
  key text primary key,
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.threads (
  id bigserial primary key,
  board_key text not null references public.boards(key) on delete cascade,
  thread_number integer not null,
  subject text not null,
  body text not null,
  reply_count integer not null default 0,
  author_id uuid,
  author_role text not null default 'anon',
  poster_client_id text,
  poster_alias text,
  pinned boolean not null default false,
  locked boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (board_key, thread_number)
);

alter table public.threads
  add column if not exists poster_alias text;

create table if not exists public.posts (
  id bigserial primary key,
  thread_id bigint not null references public.threads(id) on delete cascade,
  board_key text not null references public.boards(key) on delete cascade,
  post_number integer not null,
  body text not null,
  author_id uuid,
  author_role text not null default 'anon',
  poster_client_id text,
  poster_alias text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (thread_id, post_number)
);

alter table public.posts
  add column if not exists poster_alias text;

create table if not exists public.streams (
  id bigserial primary key,
  title text not null,
  youtube_id text not null,
  scheduled_at timestamptz,
  mode text not null default 'theater' check (mode in ('theater', 'normal')),
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended')),
  host_client_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.stream_messages (
  id bigserial primary key,
  stream_id bigint not null references public.streams(id) on delete cascade,
  client_id text,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.stream_state (
  stream_id bigint primary key references public.streams(id) on delete cascade,
  playback_time numeric not null default 0,
  is_playing boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by text
);

create index if not exists stream_status_schedule_idx on public.streams (status, scheduled_at);
create index if not exists stream_messages_stream_idx on public.stream_messages (stream_id, created_at desc);

alter table public.streams enable row level security;
alter table public.stream_messages enable row level security;
alter table public.stream_state enable row level security;

drop policy if exists "streams are readable" on public.streams;
create policy "streams are readable"
on public.streams
for select
to anon, authenticated
using (true);

drop policy if exists "public can create streams" on public.streams;
create policy "public can create streams"
on public.streams
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can update streams" on public.streams;
create policy "public can update streams"
on public.streams
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "stream messages are readable" on public.stream_messages;
create policy "stream messages are readable"
on public.stream_messages
for select
to anon, authenticated
using (true);

drop policy if exists "public can create stream messages" on public.stream_messages;
create policy "public can create stream messages"
on public.stream_messages
for insert
to anon, authenticated
with check (true);

drop policy if exists "stream state is readable" on public.stream_state;
create policy "stream state is readable"
on public.stream_state
for select
to anon, authenticated
using (true);

drop policy if exists "public can update stream state" on public.stream_state;
create policy "public can update stream state"
on public.stream_state
for insert, update
to anon, authenticated
with check (true);

create table if not exists public.bookmarks (
  id bigserial primary key,
  user_id uuid,
  user_client_id text,
  thread_id bigint not null references public.threads(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, user_client_id, thread_id)
);

create table if not exists public.reports (
  id bigserial primary key,
  board_key text not null references public.boards(key) on delete cascade,
  thread_id bigint not null references public.threads(id) on delete cascade,
  target_post_number integer not null,
  reporter_id uuid,
  target_author_id uuid,
  target_poster_client_id text,
  reason text not null default 'Reported from thread menu',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.bans (
  id bigserial primary key,
  target_user_id uuid,
  target_poster_client_id text,
  ban_type text not null check (ban_type in ('temporary', 'permanent')),
  expires_at timestamptz,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key,
  role text not null default 'user' check (role in ('user', 'developer', 'admin')),
  display_name text,
  created_at timestamptz not null default now()
);

create index if not exists threads_board_updated_idx on public.threads (board_key, pinned desc, updated_at desc);
create index if not exists posts_thread_number_idx on public.posts (thread_id, post_number);
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists bans_client_idx on public.bans (target_poster_client_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_threads_updated_at on public.threads;
create trigger set_threads_updated_at
before update on public.threads
for each row
execute function public.set_updated_at();

insert into public.boards (key, title, description)
values
  ('mind', '/mind/', 'Philosophy, psychology, mental models, and whatever else keeps you awake.'),
  ('body', '/body/', 'Training, food, sleep, and fixing your physical form slowly.'),
  ('study', '/study/', 'Techniques, notes, and trying not to waste your semester.'),
  ('skill', '/skill/', 'Discuss and share real life skills which can help fellow netizens.'),
  ('grind', '/grind/', 'Work sessions, discipline, streaks, to track your path.'),
  ('social', '/social/', 'Friendships, communication, loneliness, and real-world awkwardness.'),
  ('tech', '/tech/', 'Programming, tools, terminals, and side projects.'),
  ('exam', '/exam/', 'Test prep, panic control, revision plans, and deadline survival.'),
  ('meta', '/meta/', 'Requests, feedback, bugs, and moderation.'),
  ('stream', '/stream/', 'Watch parties, premieres, and scheduled streams together.')
on conflict (key) do update
set
  title = excluded.title,
  description = excluded.description;

alter table public.boards enable row level security;
alter table public.threads enable row level security;
alter table public.posts enable row level security;
alter table public.bookmarks enable row level security;
alter table public.reports enable row level security;
alter table public.bans enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "boards are readable" on public.boards;
create policy "boards are readable"
on public.boards
for select
to anon, authenticated
using (true);

drop policy if exists "threads are readable" on public.threads;
create policy "threads are readable"
on public.threads
for select
to anon, authenticated
using (true);

drop policy if exists "posts are readable" on public.posts;
create policy "posts are readable"
on public.posts
for select
to anon, authenticated
using (true);

drop policy if exists "reports are readable by authenticated" on public.reports;
create policy "reports are readable by authenticated"
on public.reports
for select
to authenticated
using (true);

drop policy if exists "profiles are self readable" on public.profiles;
create policy "profiles are self readable"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles are self writable" on public.profiles;
create policy "profiles are self writable"
on public.profiles
for all
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "authenticated can create threads" on public.threads;
drop policy if exists "public can create threads" on public.threads;
create policy "public can create threads"
on public.threads
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can create posts" on public.posts;
create policy "public can create posts"
on public.posts
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can update posts" on public.posts;
create policy "public can update posts"
on public.posts
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public can create reports" on public.reports;
create policy "public can create reports"
on public.reports
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can update threads" on public.threads;
create policy "public can update threads"
on public.threads
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public can read bookmarks" on public.bookmarks;
create policy "public can read bookmarks"
on public.bookmarks
for select
to anon, authenticated
using (true);

drop policy if exists "public can insert bookmarks" on public.bookmarks;
create policy "public can insert bookmarks"
on public.bookmarks
for insert
to anon, authenticated
with check (true);

drop policy if exists "public can delete bookmarks" on public.bookmarks;
create policy "public can delete bookmarks"
on public.bookmarks
for delete
to anon, authenticated
using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'threads'
  ) then
    alter publication supabase_realtime add table public.threads;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end;
$$;
