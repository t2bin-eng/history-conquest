-- 0014_betting_zones.sql
-- 게임마다 100개 지역 중 무작위 20개를 "베팅존"으로 지정한다. 정답 시 점수 2배,
-- 오답 시 그 지역의 기본 점수만큼 감점(최저 0점)된다. 어느 지역이 베팅존인지는
-- 도전(start_challenge)한 팀에게만, 도전하는 순간에만 공개된다 — 그 전까지는
-- 다른 문제 은행 정답처럼 클라이언트에 절대 내려가지 않는다.

alter table regions add column is_betting_zone boolean not null default false;

-- create_game: 지역 시딩 직후 무작위 20개를 베팅존으로 표시한다.
create or replace function create_game(p_time_limit_sec int default 1200)
returns games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
begin
  insert into games (code, time_limit_sec)
    values (generate_game_code(), p_time_limit_sec)
    returning * into v_game;

  perform seed_regions(v_game.id);

  update regions set is_betting_zone = true
    where id in (
      select id from regions where game_id = v_game.id order by random() limit 20
    );

  return v_game;
end;
$$;

-- start_challenge: 도전하는 지역이 베팅존인지 함께 반환해 학생 화면에 공개한다.
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
    'bettingZone', v_region.is_betting_zone,
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

-- submit_capture: 베팅존 정답은 2배, 오답은 해당 지역 기본 점수만큼 감점(최저 0점).
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
  v_comeback_assist boolean;
  v_team_score int;
  v_leader_score int;
  v_multiplier numeric := 1;
  v_points_awarded int;
  v_bonus_applied boolean := false;
  v_points_lost int := 0;
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

    if v_region.is_betting_zone then
      v_points_lost := v_region.points;
      update teams set score = greatest(score - v_points_lost, 0) where id = p_team_id;
    end if;

    insert into event_logs (game_id, type, region_key, team_id, actor_member_name, payload)
      values (
        p_game_id, 'WRONG_ANSWER', p_region_key, p_team_id, p_actor_member_name,
        jsonb_build_object('bettingZone', v_region.is_betting_zone, 'pointsLost', v_points_lost)
      );
    return jsonb_build_object(
      'success', true, 'correct', false,
      'bettingZone', v_region.is_betting_zone, 'pointsLost', v_points_lost
    );
  end if;

  v_was_owned_by_other := v_region.status = 'OWNED' and v_region.owner_team_id is not null;
  v_event_type := case when v_was_owned_by_other then 'RECONQUEST' else 'CAPTURE' end;

  select comeback_assist into v_comeback_assist from games where id = p_game_id;
  select score into v_team_score from teams where id = p_team_id;
  select coalesce(max(score), 0) into v_leader_score from teams where game_id = p_game_id;

  if v_comeback_assist and v_leader_score > 0 and v_team_score < v_leader_score then
    v_multiplier := 1 + least((v_leader_score - v_team_score)::numeric / v_leader_score, 1) * 0.5;
    v_bonus_applied := true;
  end if;

  v_points_awarded := round(v_region.points * v_multiplier);
  if v_region.is_betting_zone then
    v_points_awarded := v_points_awarded * 2;
  end if;

  update regions
    set owner_team_id = p_team_id,
        status = 'OWNED',
        cooldown_until = v_now + interval '60 seconds',
        failed_team_ids = '{}'
    where id = v_region.id;

  update teams
    set score = score + v_points_awarded,
        combo_streak = combo_streak + 1
    where id = p_team_id;

  insert into event_logs (game_id, type, region_key, team_id, actor_member_name, payload)
    values (
      p_game_id, v_event_type, p_region_key, p_team_id, p_actor_member_name,
      jsonb_build_object(
        'points', v_points_awarded, 'bonusApplied', v_bonus_applied,
        'bettingZone', v_region.is_betting_zone
      )
    );

  perform apply_surround_captures(p_game_id);

  return jsonb_build_object(
    'success', true,
    'correct', true,
    'reconquest', v_was_owned_by_other,
    'pointsAwarded', v_points_awarded,
    'bonusApplied', v_bonus_applied,
    'bettingZone', v_region.is_betting_zone
  );
end;
$$;
