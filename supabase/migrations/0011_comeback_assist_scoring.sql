-- 0011_comeback_assist_scoring.sql
-- games.comeback_assist가 켜져 있으면, 점령에 성공한 팀의 점수가 현재 선두팀보다
-- 낮을수록 획득 점수에 보너스 배율(최대 1.5배)을 적용한다. 문제 난이도/제한시간은
-- 건드리지 않고 점수만 조정하므로 "쉬운 문제를 받아서 억울하다"는 불만이 생기지 않는다.

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

  select comeback_assist into v_comeback_assist from games where id = p_game_id;
  select score into v_team_score from teams where id = p_team_id;
  select coalesce(max(score), 0) into v_leader_score from teams where game_id = p_game_id;

  if v_comeback_assist and v_leader_score > 0 and v_team_score < v_leader_score then
    v_multiplier := 1 + least((v_leader_score - v_team_score)::numeric / v_leader_score, 1) * 0.5;
    v_bonus_applied := true;
  end if;

  v_points_awarded := round(v_region.points * v_multiplier);

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
      jsonb_build_object('points', v_points_awarded, 'bonusApplied', v_bonus_applied)
    );

  perform apply_surround_captures(p_game_id);

  return jsonb_build_object(
    'success', true,
    'correct', true,
    'reconquest', v_was_owned_by_other,
    'pointsAwarded', v_points_awarded,
    'bonusApplied', v_bonus_applied
  );
end;
$$;
