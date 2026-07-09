-- 0013_revert_to_grid_map.sql
-- 세계지도(0009)는 국가 폴리곤 크기가 제각각이라 확대해도 유럽처럼 국가가 촘촘한
-- 지역은 라벨이 계속 겹치는 문제가 있었다. 100칸을 모두 균일한 크기로 보여줄 수
-- 있는 10x10 격자 보드로 되돌린다 (0007과 동일한 생성 로직). 확대/축소(d3-zoom)는
-- RegionMap 컴포넌트 쪽 기능이라 이 되돌림과 무관하게 계속 사용 가능하다.

create or replace function seed_regions(p_game_id uuid)
returns void
language plpgsql
as $$
declare
  grid_cols constant int := 10;
  grid_rows constant int := 10;
  cell_size constant int := 80;
  gap constant int := 4;
  center_col constant numeric := (grid_cols - 1) / 2.0;
  center_row constant numeric := (grid_rows - 1) / 2.0;
  v_col int;
  v_row int;
  v_idx int;
  v_dist numeric;
  v_difficulty text;
  v_points int;
  v_x int;
  v_y int;
  v_adjacent text[];
begin
  for v_row in 0..grid_rows - 1 loop
    for v_col in 0..grid_cols - 1 loop
      v_idx := v_row * grid_cols + v_col;
      v_dist := sqrt(power(v_col - center_col, 2) + power(v_row - center_row, 2));

      if v_dist <= 2 then
        v_difficulty := 'HIGH';
        v_points := 5;
      elsif v_dist <= 4 then
        v_difficulty := 'MID';
        v_points := 2;
      else
        v_difficulty := 'LOW';
        v_points := 1;
      end if;

      v_x := v_col * (cell_size + gap);
      v_y := v_row * (cell_size + gap);

      v_adjacent := array[]::text[];
      if v_row > 0 then
        v_adjacent := v_adjacent || ('region-' || ((v_row - 1) * grid_cols + v_col + 1));
      end if;
      if v_row < grid_rows - 1 then
        v_adjacent := v_adjacent || ('region-' || ((v_row + 1) * grid_cols + v_col + 1));
      end if;
      if v_col > 0 then
        v_adjacent := v_adjacent || ('region-' || (v_row * grid_cols + v_col - 1 + 1));
      end if;
      if v_col < grid_cols - 1 then
        v_adjacent := v_adjacent || ('region-' || (v_row * grid_cols + v_col + 1 + 1));
      end if;

      insert into regions (game_id, key, name, difficulty, points, adjacent_keys, svg_path, label_x, label_y)
      values (
        p_game_id,
        'region-' || (v_idx + 1),
        (v_idx + 1)::text,
        v_difficulty,
        v_points,
        v_adjacent,
        format('M%s,%s h%s v%s h-%s Z', v_x, v_y, cell_size, cell_size, cell_size),
        v_x + cell_size / 2.0,
        v_y + cell_size / 2.0
      );
    end loop;
  end loop;
end;
$$;
