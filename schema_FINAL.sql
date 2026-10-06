-- EasyFootball Tournament Hub — FINAL migration
-- Safe to run after the earlier EasyFootball migrations.
-- Uses IF NOT EXISTS / DROP POLICY so it can be re-run.

-- Tournament controls
alter table public.tournaments add column if not exists started_at timestamptz;
alter table public.tournaments add column if not exists completed_at timestamptz;
alter table public.tournaments add column if not exists champion_player_id uuid references public.players(id) on delete set null;
alter table public.tournaments add column if not exists max_players int not null default 8;

-- Match controls / knockout bracket
alter table public.matches add column if not exists group_no int;
alter table public.matches add column if not exists winner_player_id uuid references public.players(id) on delete set null;
alter table public.matches add column if not exists parent_match_id uuid references public.matches(id) on delete set null;
alter table public.matches add column if not exists is_bye boolean not null default false;
alter table public.matches add column if not exists label text;
alter table public.matches add column if not exists submitted_by uuid;
alter table public.matches add column if not exists confirmed_at timestamptz;
alter table public.matches add column if not exists submitted_at timestamptz;
alter table public.matches add column if not exists proof_url text;
alter table public.matches add column if not exists deadline_at timestamptz;
alter table public.matches add column if not exists round_label text;
alter table public.matches add column if not exists next_match_id uuid references public.matches(id) on delete set null;
alter table public.matches add column if not exists next_slot smallint;

create index if not exists matches_tournament_stage_round_position_idx
on public.matches(tournament_id, stage, round_no, position);

-- Replace the player limit trigger with the race-safe version.
create or replace function public.enforce_tournament_player_limit()
returns trigger language plpgsql security definer as $$
declare lim int; cnt int;
begin
  perform pg_advisory_xact_lock(hashtext(new.tournament_id::text));
  select max_players into lim from public.tournaments where id=new.tournament_id and status='open';
  if lim is null then raise exception 'Tournament is not open or does not exist'; end if;
  select count(*) into cnt from public.players where tournament_id=new.tournament_id;
  if cnt >= lim then raise exception 'Tournament is full (% players)',lim; end if;
  return new;
end;
$$;

-- Match proof submissions
create table if not exists public.match_submissions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  submitter_name text not null check (char_length(trim(submitter_name)) between 1 and 40),
  home_score integer not null check (home_score between 0 and 99),
  away_score integer not null check (away_score between 0 and 99),
  proof_url text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists match_submissions_tournament_status_idx
on public.match_submissions(tournament_id,status,created_at desc);
create index if not exists match_submissions_match_idx
on public.match_submissions(match_id,status);

alter table public.match_submissions enable row level security;
grant select, insert, update on public.match_submissions to anon, authenticated;

drop policy if exists "Public can submit match proofs" on public.match_submissions;
create policy "Public can submit match proofs" on public.match_submissions
for insert to anon, authenticated
with check (
  exists (
    select 1 from public.tournaments t
    join public.matches m on m.tournament_id=t.id
    where t.id=match_submissions.tournament_id
      and m.id=match_submissions.match_id
      and t.status='live'
      and m.status='scheduled'
  )
);

drop policy if exists "Tournament admins read match proofs" on public.match_submissions;
create policy "Tournament admins read match proofs" on public.match_submissions
for select to authenticated
using (exists(select 1 from public.tournaments t where t.id=tournament_id and t.admin_id=auth.uid()));

drop policy if exists "Tournament admins review match proofs" on public.match_submissions;
create policy "Tournament admins review match proofs" on public.match_submissions
for update to authenticated
using (exists(select 1 from public.tournaments t where t.id=tournament_id and t.admin_id=auth.uid()))
with check (exists(select 1 from public.tournaments t where t.id=tournament_id and t.admin_id=auth.uid()));

-- Screenshot storage
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('match-proofs','match-proofs',true,8388608,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/png','image/jpeg','image/webp'];

drop policy if exists "Public can upload match proof images" on storage.objects;
create policy "Public can upload match proof images" on storage.objects
for insert to anon, authenticated
with check (bucket_id='match-proofs');

drop policy if exists "Anyone can view match proof images" on storage.objects;
create policy "Anyone can view match proof images" on storage.objects
for select to anon, authenticated
using (bucket_id='match-proofs');

-- Admins can update or delete generated matches.
drop policy if exists "admins update matches" on public.matches;
create policy "admins update matches" on public.matches
for update to authenticated
using (exists(select 1 from public.tournaments t where t.id=tournament_id and t.admin_id=auth.uid()))
with check (exists(select 1 from public.tournaments t where t.id=tournament_id and t.admin_id=auth.uid()));

drop policy if exists "admins delete matches" on public.matches;
create policy "admins delete matches" on public.matches
for delete to authenticated
using (exists(select 1 from public.tournaments t where t.id=tournament_id and t.admin_id=auth.uid()));

-- Valid player-limit range.
alter table public.tournaments
drop constraint if exists tournaments_max_players_check;
alter table public.tournaments
add constraint tournaments_max_players_check check (max_players between 2 and 128);
