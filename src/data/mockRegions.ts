/**
 * 지도 렌더링용 뷰박스 크기. 실제 지역 데이터는 Supabase(regions 테이블)에서 오며,
 * supabase/migrations/0013_revert_to_grid_map.sql이 심는 10x10 격자(칸 크기 80,
 * 간격 4 → 10*80 + 9*4 = 836)와 동일한 캔버스 크기다. 세계지도는 국가 크기가
 * 제각각이라 확대해도 라벨이 겹치는 문제가 있어 균일한 격자로 되돌렸다.
 */
export const MOCK_MAP_VIEWBOX = {
  width: 836,
  height: 836,
};
