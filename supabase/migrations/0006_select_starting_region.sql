-- 0006_select_starting_region.sql
-- 여러 팀이 동시에 같은 시작 지역을 선택하는 것을 서버에서 원자적으로 막는다.

create or replace function select_starting_region(
  p_game_id uuid,
  p_team_id uuid,
  p_region_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taken boolean;
begin
  perform 1 from teams where game_id = p_game_id for update;

  select exists(
    select 1 from teams
    where game_id = p_game_id
      and id != p_team_id
      and starting_region_key = p_region_key
  ) into v_taken;

  if v_taken then
    return jsonb_build_object('success', false, 'reason', 'already_taken');
  end if;

  update teams set starting_region_key = p_region_key where id = p_team_id;
  return jsonb_build_object('success', true);
end;
$$;

grant execute on function select_starting_region(uuid, uuid, text) to anon, authenticated;
