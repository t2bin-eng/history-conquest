-- 0003_seed_regions_function.sql
-- src/data/mockRegions.ts의 5x4 격자 지도와 동일한 레이아웃을 새 게임에 시딩합니다.
-- 실제 역사 지도가 확정되면 이 함수의 VALUES만 교체하면 됩니다.

create or replace function seed_regions(p_game_id uuid)
returns void
language sql
as $$
  insert into regions (game_id, key, name, difficulty, points, adjacent_keys, svg_path, label_x, label_y)
  values
    (p_game_id, 'region-1',  '의주', 'LOW',  1, array['region-2','region-6'],                       'M0,0 h120 v120 h-120 Z',     60,  60),
    (p_game_id, 'region-2',  '함흥', 'MID',  2, array['region-1','region-3','region-7'],             'M126,0 h120 v120 h-120 Z',   186, 60),
    (p_game_id, 'region-3',  '평양', 'MID',  2, array['region-2','region-4','region-8'],             'M252,0 h120 v120 h-120 Z',   312, 60),
    (p_game_id, 'region-4',  '원산', 'MID',  2, array['region-3','region-5','region-9'],             'M378,0 h120 v120 h-120 Z',   438, 60),
    (p_game_id, 'region-5',  '개성', 'LOW',  1, array['region-4','region-10'],                       'M504,0 h120 v120 h-120 Z',   564, 60),

    (p_game_id, 'region-6',  '한성', 'LOW',  1, array['region-1','region-7','region-11'],            'M0,126 h120 v120 h-120 Z',   60,  186),
    (p_game_id, 'region-7',  '강화', 'MID',  2, array['region-2','region-6','region-8','region-12'], 'M126,126 h120 v120 h-120 Z', 186, 186),
    (p_game_id, 'region-8',  '충주', 'HIGH', 5, array['region-3','region-7','region-9','region-13'], 'M252,126 h120 v120 h-120 Z', 312, 186),
    (p_game_id, 'region-9',  '청주', 'MID',  2, array['region-4','region-8','region-10','region-14'],'M378,126 h120 v120 h-120 Z', 438, 186),
    (p_game_id, 'region-10', '전주', 'LOW',  1, array['region-5','region-9','region-15'],            'M504,126 h120 v120 h-120 Z', 564, 186),

    (p_game_id, 'region-11', '남원', 'LOW',  1, array['region-6','region-12','region-16'],           'M0,252 h120 v120 h-120 Z',   60,  312),
    (p_game_id, 'region-12', '진주', 'MID',  2, array['region-7','region-11','region-13','region-17'],'M126,252 h120 v120 h-120 Z',186, 312),
    (p_game_id, 'region-13', '부산', 'HIGH', 5, array['region-8','region-12','region-14','region-18'],'M252,252 h120 v120 h-120 Z',312, 312),
    (p_game_id, 'region-14', '경주', 'MID',  2, array['region-9','region-13','region-15','region-19'],'M378,252 h120 v120 h-120 Z',438, 312),
    (p_game_id, 'region-15', '안동', 'LOW',  1, array['region-10','region-14','region-20'],          'M504,252 h120 v120 h-120 Z', 564, 312),

    (p_game_id, 'region-16', '제주', 'LOW',  1, array['region-11','region-17'],                      'M0,378 h120 v120 h-120 Z',   60,  438),
    (p_game_id, 'region-17', '울릉', 'MID',  2, array['region-12','region-16','region-18'],          'M126,378 h120 v120 h-120 Z', 186, 438),
    (p_game_id, 'region-18', '독도', 'MID',  2, array['region-13','region-17','region-19'],          'M252,378 h120 v120 h-120 Z', 312, 438),
    (p_game_id, 'region-19', '강릉', 'MID',  2, array['region-14','region-18','region-20'],          'M378,378 h120 v120 h-120 Z', 438, 438),
    (p_game_id, 'region-20', '춘천', 'LOW',  1, array['region-15','region-19'],                      'M504,378 h120 v120 h-120 Z', 564, 438);
$$;
