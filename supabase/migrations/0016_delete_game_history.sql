-- 0016_delete_game_history.sql
-- 반별 결과 기록 화면에서 개별/전체 삭제를 지원한다. games 테이블에는 delete
-- RLS 정책이 없으므로(다른 관리 작업들과 동일하게) SECURITY DEFINER 함수를
-- 통해서만 삭제를 허용한다. teams/team_members/regions/event_logs는 games를
-- on delete cascade로 참조하고 있어 games 행 삭제만으로 관련 데이터가 함께 정리된다.

create or replace function delete_game(p_game_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from games where id = p_game_id;
$$;

create or replace function delete_games_by_class(p_class_number int)
returns void
language sql
security definer
set search_path = public
as $$
  delete from games where class_number = p_class_number;
$$;

grant execute on function delete_game(uuid) to anon, authenticated;
grant execute on function delete_games_by_class(int) to anon, authenticated;
