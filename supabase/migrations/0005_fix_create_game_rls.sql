-- 0005_fix_create_game_rls.sql
-- create_game이 내부에서 seed_regions로 regions를 시딩할 때
-- anon 역할에는 regions insert 정책이 없어 RLS에 막히는 문제 수정.
-- create_game을 SECURITY DEFINER로 승격해 정상적으로 시딩되도록 한다.

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

  return v_game;
end;
$$;
