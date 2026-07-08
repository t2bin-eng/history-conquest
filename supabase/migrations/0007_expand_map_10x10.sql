-- 0007_expand_map_10x10.sql
-- 지역 수를 20개(5x4) → 100개(10x10)로 확장해 8팀까지 넉넉히 수용한다.
-- 지역 이름은 지도가 확정되기 전까지 숫자로 표시한다.
-- 하드코딩된 20행 대신, 격자를 계산해서 생성하도록 함수를 다시 작성한다
-- (칸 수가 많아질수록 手작업 좌표/인접 리스트 오탈자 위험이 커지기 때문).

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
