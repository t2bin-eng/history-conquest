-- 0015_class_number.sql
-- 게임 생성 시 반(1~12)을 함께 저장해, 반별로 게임 결과를 구분해 조회할 수 있게 한다.
-- 기존 게임은 반이 지정되지 않았으므로 null을 허용한다.

alter table games add column class_number int
  check (class_number is null or (class_number between 1 and 12));

create or replace function create_game(
  p_time_limit_sec int default 1200,
  p_class_number int default null
)
returns games
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game games%rowtype;
begin
  insert into games (code, time_limit_sec, class_number)
    values (generate_game_code(), p_time_limit_sec, p_class_number)
    returning * into v_game;

  perform seed_regions(v_game.id);

  update regions set is_betting_zone = true
    where id in (
      select id from regions where game_id = v_game.id order by random() limit 20
    );

  return v_game;
end;
$$;
