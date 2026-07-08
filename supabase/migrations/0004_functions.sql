-- 0004_functions.sql
-- 게임 생성/시작/종료/일시정지 및 "서버 단일 판정" 점령 로직(동시성 안전)

create or replace function generate_game_code()
returns text
language plpgsql
as $$
declare
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    select exists(select 1 from games where code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

create or replace function create_game(p_time_limit_sec int default 1200)
returns games
language plpgsql
as $$
declare
  v_game games%rowtype;
begin
  insert into games (code, time_limit_sec)
    values (generate_game_code(), p_time_limit_sec)
    returning * into v_game;

  perform seed_regions(v_game.id);

  return v_game;
end;
$$;

create or replace function start_game(p_game_id uuid)
returns void
language plpgsql
as $$
declare
  t record;
begin
  update games set status = 'PLAYING', started_at = now() where id = p_game_id;

  for t in
    select id, starting_region_key from teams
    where game_id = p_game_id and starting_region_key is not null
  loop
    update regions
      set owner_team_id = t.id,
          status = 'OWNED',
          cooldown_until = now() + interval '60 seconds'
      where game_id = p_game_id and key = t.starting_region_key;
  end loop;
end;
$$;

create or replace function end_game(p_game_id uuid)
returns void
language sql
as $$
  update games set status = 'ENDED', ended_at = now() where id = p_game_id;
$$;

create or replace function pause_game(p_game_id uuid)
returns void
language sql
as $$
  update games set is_paused = true, paused_at = now()
  where id = p_game_id and status = 'PLAYING' and is_paused = false;
$$;

create or replace function resume_game(p_game_id uuid)
returns void
language plpgsql
as $$
declare
  v_game games%rowtype;
  v_paused_ms bigint;
begin
  select * into v_game from games where id = p_game_id for update;
  if not found or not v_game.is_paused or v_game.paused_at is null or v_game.started_at is null then
    return;
  end if;

  v_paused_ms := extract(epoch from (now() - v_game.paused_at)) * 1000;

  update games
    set is_paused = false,
        paused_at = null,
        started_at = v_game.started_at + (v_paused_ms || ' milliseconds')::interval
    where id = p_game_id;
end;
$$;

-- 지역의 모든 인접 지역이 한 팀 소유가 되면 자동 편입 (연쇄 편입 포함)
create or replace function apply_surround_captures(p_game_id uuid)
returns void
language plpgsql
as $$
declare
  v_changed boolean := true;
  r record;
  v_all_owned boolean;
  v_distinct_owner uuid;
  v_distinct_count int;
begin
  while v_changed loop
    v_changed := false;

    for r in select * from regions where game_id = p_game_id loop
      if array_length(r.adjacent_keys, 1) is null then
        continue;
      end if;

      select
        bool_and(n.owner_team_id is not null),
        count(distinct n.owner_team_id),
        min(n.owner_team_id)
      into v_all_owned, v_distinct_count, v_distinct_owner
      from regions n
      where n.game_id = p_game_id and n.key = any(r.adjacent_keys);

      if v_all_owned and v_distinct_count = 1 and v_distinct_owner is distinct from r.owner_team_id then
        update regions
          set owner_team_id = v_distinct_owner,
              status = 'OWNED',
              cooldown_until = null,
              failed_team_ids = '{}'
          where id = r.id;

        insert into event_logs (game_id, type, region_key, team_id)
          values (p_game_id, 'SURROUND', r.key, v_distinct_owner);

        v_changed := true;
      end if;
    end loop;
  end loop;
end;
$$;

-- 도전 가능 여부를 서버에서 판정하고, 해당 난이도의 문제를 하나 뽑아 반환한다.
-- 정답(answer)은 절대 클라이언트로 내려주지 않는다.
create or replace function start_challenge(
  p_game_id uuid,
  p_region_key text,
  p_team_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_region regions%rowtype;
  v_now timestamptz := now();
  v_eligible boolean;
  v_question question_bank%rowtype;
begin
  select * into v_region from regions where game_id = p_game_id and key = p_region_key;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'region_not_found');
  end if;

  if v_region.owner_team_id = p_team_id then
    v_eligible := false;
  elsif v_region.status = 'OWNED' then
    v_eligible := v_region.cooldown_until is null or v_now >= v_region.cooldown_until;
  else
    v_eligible := not (p_team_id = any(v_region.failed_team_ids));
  end if;

  if not v_eligible then
    return jsonb_build_object('success', false, 'reason', 'not_eligible');
  end if;

  select * into v_question from question_bank
    where difficulty = v_region.difficulty
    order by random()
    limit 1;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'no_question_available');
  end if;

  return jsonb_build_object(
    'success', true,
    'question', jsonb_build_object(
      'id', v_question.id,
      'category', v_question.category,
      'difficulty', v_question.difficulty,
      'text', v_question.text,
      'choices', to_jsonb(v_question.choices),
      'timeLimitSec', v_question.time_limit_sec
    )
  );
end;
$$;

-- 핵심 설계 포인트: "정답 제출 → 점령 확정"은 반드시 서버(이 함수) 단에서
-- 원자적으로 판정한다. 정답 비교 자체도 서버에서 수행하여 클라이언트가
-- correct 여부를 조작해 전송하는 부정행위를 원천 차단한다.
-- 대상 게임의 모든 지역 행을 잠가(FOR UPDATE) 동시 도전 시 최초 요청만 반영되도록 직렬화한다.
create or replace function submit_capture(
  p_game_id uuid,
  p_region_key text,
  p_team_id uuid,
  p_question_id uuid,
  p_selected_answer text,
  p_actor_member_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_region regions%rowtype;
  v_question question_bank%rowtype;
  v_now timestamptz := now();
  v_eligible boolean;
  v_correct boolean;
  v_was_owned_by_other boolean;
  v_event_type text;
begin
  perform 1 from regions where game_id = p_game_id for update;

  select * into v_region from regions where game_id = p_game_id and key = p_region_key;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'region_not_found');
  end if;

  select * into v_question from question_bank where id = p_question_id;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'question_not_found');
  end if;

  if v_region.owner_team_id = p_team_id then
    v_eligible := false;
  elsif v_region.status = 'OWNED' then
    v_eligible := v_region.cooldown_until is null or v_now >= v_region.cooldown_until;
  else
    v_eligible := not (p_team_id = any(v_region.failed_team_ids));
  end if;

  if not v_eligible then
    return jsonb_build_object('success', false, 'reason', 'not_eligible');
  end if;

  v_correct := v_question.answer = p_selected_answer;

  if not v_correct then
    update regions
      set failed_team_ids = array_append(failed_team_ids, p_team_id)
      where id = v_region.id;
    update teams set combo_streak = 0 where id = p_team_id;
    insert into event_logs (game_id, type, region_key, team_id, actor_member_name)
      values (p_game_id, 'WRONG_ANSWER', p_region_key, p_team_id, p_actor_member_name);
    return jsonb_build_object('success', true, 'correct', false);
  end if;

  v_was_owned_by_other := v_region.status = 'OWNED' and v_region.owner_team_id is not null;
  v_event_type := case when v_was_owned_by_other then 'RECONQUEST' else 'CAPTURE' end;

  update regions
    set owner_team_id = p_team_id,
        status = 'OWNED',
        cooldown_until = v_now + interval '60 seconds',
        failed_team_ids = '{}'
    where id = v_region.id;

  update teams
    set score = score + v_region.points,
        combo_streak = combo_streak + 1
    where id = p_team_id;

  insert into event_logs (game_id, type, region_key, team_id, actor_member_name, payload)
    values (
      p_game_id, v_event_type, p_region_key, p_team_id, p_actor_member_name,
      jsonb_build_object('points', v_region.points)
    );

  perform apply_surround_captures(p_game_id);

  return jsonb_build_object('success', true, 'correct', true, 'reconquest', v_was_owned_by_other);
end;
$$;

grant execute on function create_game(int) to anon, authenticated;
grant execute on function start_game(uuid) to anon, authenticated;
grant execute on function end_game(uuid) to anon, authenticated;
grant execute on function pause_game(uuid) to anon, authenticated;
grant execute on function resume_game(uuid) to anon, authenticated;
grant execute on function start_challenge(uuid, text, uuid) to anon, authenticated;
grant execute on function submit_capture(uuid, text, uuid, uuid, text, text) to anon, authenticated;
