-- EasyFootball Tournament Hub V2
create extension if not exists pgcrypto;

create table if not exists tournaments (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 slug text unique not null,
 format text not null check (format in ('knockout','league','groups','hybrid')),
 match_minutes int not null default 10,
 group_size int not null default 4,
 is_public boolean not null default true,
 status text not null default 'open' check (status in ('open','live','completed')),
 admin_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

create table if not exists players (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references tournaments(id) on delete cascade,
 name text not null,
 joined_at timestamptz not null default now(),
 unique(tournament_id,name)
);

create table if not exists matches (
 id uuid primary key default gen_random_uuid(),
 tournament_id uuid not null references tournaments(id) on delete cascade,
 stage text not null default 'league',
 round_no int not null default 1,
 position int not null default 1,
 home_player_id uuid references players(id) on delete set null,
 away_player_id uuid references players(id) on delete set null,
 home_score int,
 away_score int,
 status text not null default 'scheduled' check (status in ('scheduled','pending','confirmed','cancelled')),
 submitted_by uuid,
 submitted_at timestamptz,
 confirmed_at timestamptz,
 unique(tournament_id,stage,round_no,position)
);

alter table tournaments enable row level security;
alter table players enable row level security;
alter table matches enable row level security;

drop policy if exists "public tournaments readable" on tournaments;
create policy "public tournaments readable" on tournaments for select using (is_public = true or admin_id = auth.uid());
create policy "admins create tournaments" on tournaments for insert with check (auth.uid() = admin_id);
create policy "admins update tournaments" on tournaments for update using (auth.uid() = admin_id) with check (auth.uid() = admin_id);
create policy "admins delete tournaments" on tournaments for delete using (auth.uid() = admin_id);

drop policy if exists "players readable" on players;
create policy "players readable" on players for select using (exists(select 1 from tournaments t where t.id=tournament_id and (t.is_public=true or t.admin_id=auth.uid())));
create policy "players can join" on players for insert with check (exists(select 1 from tournaments t where t.id=tournament_id and t.status='open'));
create policy "admins manage players" on players for update using (exists(select 1 from tournaments t where t.id=tournament_id and t.admin_id=auth.uid()));
create policy "admins delete players" on players for delete using (exists(select 1 from tournaments t where t.id=tournament_id and t.admin_id=auth.uid()));

drop policy if exists "matches readable" on matches;
create policy "matches readable" on matches for select using (exists(select 1 from tournaments t where t.id=tournament_id and (t.is_public=true or t.admin_id=auth.uid())));
create policy "admins create matches" on matches for insert with check (exists(select 1 from tournaments t where t.id=tournament_id and t.admin_id=auth.uid()));
create policy "players submit results" on matches for update using ((exists(select 1 from players p where p.id = matches.home_player_id and p.tournament_id = matches.tournament_id) or exists(select 1 from players p where p.id = matches.away_player_id and p.tournament_id = matches.tournament_id)) or exists(select 1 from tournaments t where t.id = matches.tournament_id and t.admin_id = auth.uid())) with check (true);
create policy "admins delete matches" on matches for delete using (exists(select 1 from tournaments t where t.id=tournament_id and t.admin_id=auth.uid()));

-- Realtime: enable if desired in Supabase dashboard for these tables.
