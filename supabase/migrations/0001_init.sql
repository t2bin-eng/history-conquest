-- 역사 정복 — History Conquest
-- 0001_init.sql: 핵심 테이블 정의

create extension if not exists pgcrypto;

create table games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'WAITING'
    check (status in ('WAITING', 'PLAYING', 'GOLDEN_TIME', 'ENDED')),
  time_limit_sec int not null default 1200,
  started_at timestamptz,
  ended_at timestamptz,
  is_paused boolean not null default false,
  paused_at timestamptz,
  comeback_assist boolean not null default false,
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  name text not null,
  color text not null,
  flag_image_url text,
  score int not null default 0,
  combo_streak int not null default 0,
  is_ready boolean not null default false,
  starting_region_key text,
  created_at timestamptz not null default now(),
  unique (game_id, color)
);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table regions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  key text not null,
  name text not null,
  difficulty text not null check (difficulty in ('LOW', 'MID', 'HIGH')),
  points int not null,
  owner_team_id uuid references teams(id) on delete set null,
  status text not null default 'NEUTRAL'
    check (status in ('NEUTRAL', 'OWNED', 'CONTESTED', 'COOLDOWN')),
  cooldown_until timestamptz,
  adjacent_keys text[] not null default '{}',
  failed_team_ids uuid[] not null default '{}',
  svg_path text not null,
  label_x numeric not null,
  label_y numeric not null,
  unique (game_id, key)
);

create table question_bank (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  difficulty text not null check (difficulty in ('LOW', 'MID', 'HIGH')),
  text text not null,
  choices text[] not null,
  answer text not null,
  time_limit_sec int not null default 15
);

create table event_logs (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  created_at timestamptz not null default now(),
  type text not null
    check (type in ('CAPTURE', 'RECONQUEST', 'SURROUND', 'WRONG_ANSWER', 'CARD_USED')),
  region_key text not null,
  team_id uuid references teams(id) on delete set null,
  actor_member_name text,
  payload jsonb not null default '{}'
);

create index on teams (game_id);
create index on team_members (game_id);
create index on team_members (team_id);
create index on regions (game_id);
create index on event_logs (game_id, created_at desc);

-- Realtime 구독 대상 테이블 등록
alter publication supabase_realtime add table games, teams, regions, event_logs;

-- 학급 단위 소규모 게임으로, 별도 로그인 없이 게임 코드로만 격리합니다.
-- anon 클라이언트가 자신이 속한 게임 범위 내에서 자유롭게 읽고 쓸 수 있도록 허용합니다.
alter table games enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table regions enable row level security;
alter table question_bank enable row level security;
alter table event_logs enable row level security;

create policy "public read games" on games for select using (true);
create policy "public insert games" on games for insert with check (true);
create policy "public update games" on games for update using (true);

create policy "public read teams" on teams for select using (true);
create policy "public insert teams" on teams for insert with check (true);
create policy "public update teams" on teams for update using (true);

create policy "public read team_members" on team_members for select using (true);
create policy "public insert team_members" on team_members for insert with check (true);
create policy "public delete team_members" on team_members for delete using (true);

create policy "public read regions" on regions for select using (true);
create policy "public update regions" on regions for update using (true);

-- question_bank은 의도적으로 공개 정책을 두지 않는다.
-- 정답(answer) 컬럼이 클라이언트에 노출되지 않도록, start_challenge/submit_capture
-- SECURITY DEFINER 함수를 통해서만 접근한다 (부정행위 방지).

create policy "public read event_logs" on event_logs for select using (true);
create policy "public insert event_logs" on event_logs for insert with check (true);
