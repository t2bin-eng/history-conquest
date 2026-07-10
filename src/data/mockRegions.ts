/**
 * 지도 렌더링용 뷰박스. 실제 지역 데이터는 Supabase(regions 테이블)에서 오며,
 * 현재 활성화된 seed_regions는 세계지도(0009_world_map_regions.sql, 114개국)다.
 * 국가 좌표 실측 범위는 x: -12~980, y: 0~630 — minX/minY로 원점을 옮기고
 * width/height에 상하좌우 여백(약 60)을 더해, 확대해도 오른쪽 끝(일본 등)이나
 * 가장자리 국가가 뷰박스 밖으로 잘리지 않게 한다.
 */
export const MOCK_MAP_VIEWBOX = {
  minX: -60,
  minY: -60,
  width: 1100,
  height: 750,
};
