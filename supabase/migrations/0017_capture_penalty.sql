-- 0017_capture_penalty.sql
-- 땅을 빼앗기면(직접 정답으로 빼앗기거나 포위로 편입되거나) 이전 소유 팀의
-- 점수도 그 지역의 기본 점수만큼 함께 차감한다(최저 0점). 베팅존 2배/역전
-- 밸런싱 배율은 새로 점령하는 팀에게만 적용되고, 빼앗기는 팀의 차감액은
-- 배율 적용 전 기본 점수를 기준으로 한다.

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
        (array_agg(distinct n.owner_team_id))[1]
      into v_all_owned, v_distinct_count, v_distinct_owner
      from regions n
      where n.game_id = p_game_id and n.key = any(r.adjacent_keys);

      if v_all_owned and v_distinct_count = 1 and v_distinct_owner is distinct from r.owner_team_id then
        -- 이전 소유 팀이 있었다면 포위로 뺏기는 것이므로 점수 차감 (0 미만 방지)
        if r.owner_team_id is not null then
          update teams
            set score = greatest(score - r.points, 0)
            where id = r.owner_team_id;
        end if;

        update regions
          set owner_team_id = v_distinct_owner,
              status = 'OWNED',
              cooldown_until = null,
              failed_team_ids = '{}'
          where id = r.id;

        insert into event_logs (game_id, type, region_key, team_id, payload)
          values (
            p_game_id, 'SURROUND', r.key, v_distinct_owner,
            case when r.owner_team_id is not null then
              jsonb_build_object('penalizedTeamId', r.owner_team_id, 'penaltyPoints', r.points)
            else
              '{}'::jsonb
            end
          );

        v_changed := true;
      end if;
    end loop;
  end loop;
end;
$$;

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

  -- 이전 소유 팀이 있었다면 포위와 동일하게, 배율 적용 전 기본 점수만큼 차감(0 미만 방지)
  if v_was_owned_by_other then
    update teams
      set score = greatest(score - v_region.points, 0)
      where id = v_region.owner_team_id;
  end if;

  insert into event_logs (game_id, type, region_key, team_id, actor_member_name, payload)
    values (
      p_game_id, v_event_type, p_region_key, p_team_id, p_actor_member_name,
      case when v_was_owned_by_other then
        jsonb_build_object(
          'points', v_points_awarded, 'bonusApplied', v_bonus_applied,
          'bettingZone', v_region.is_betting_zone,
          'penalizedTeamId', v_region.owner_team_id, 'penaltyPoints', v_region.points
        )
      else
        jsonb_build_object(
          'points', v_points_awarded, 'bonusApplied', v_bonus_applied,
          'bettingZone', v_region.is_betting_zone
        )
      end
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
