-- EasyFootball V3 migration. Run once in Supabase SQL Editor after the existing V2 schema.
alter table tournaments add column if not exists started_at timestamptz;
alter table tournaments add column if not exists completed_at timestamptz;
alter table tournaments add column if not exists champion_player_id uuid references players(id) on delete set null;
alter table matches add column if not exists group_no int;
alter table matches add column if not exists winner_player_id uuid references players(id) on delete set null;
alter table matches add column if not exists parent_match_id uuid references matches(id) on delete set null;
alter table matches add column if not exists is_bye boolean not null default false;
alter table matches add column if not exists label text;
alter table matches add column if not exists submitted_by uuid;
alter table matches add column if not exists confirmed_at timestamptz;
create index if not exists matches_tournament_stage_round on matches(tournament_id,stage,round_no,position);

-- Replace the player-limit trigger with a race-safe advisory-lock version.
create or replace function enforce_tournament_player_limit() returns trigger language plpgsql security definer as $$
declare lim int; cnt int; begin
 perform pg_advisory_xact_lock(hashtext(new.tournament_id::text));
 select max_players into lim from tournaments where id=new.tournament_id and status='open';
 if lim is null then raise exception 'Tournament is not open or does not exist'; end if;
 select count(*) into cnt from players where tournament_id=new.tournament_id;
 if cnt >= lim then raise exception 'Tournament is full (% players)',lim; end if;
 return new; end; $$;

-- Admins can update matches; players can submit scores.
drop policy if exists "admins update matches" on matches;
create policy "admins update matches" on matches for update using (exists(select 1 from tournaments t where t.id=tournament_id and t.admin_id=auth.uid())) with check (exists(select 1 from tournaments t where t.id=tournament_id and t.admin_id=auth.uid()));
