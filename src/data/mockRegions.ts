/**
 * 지도 렌더링용 뷰박스 크기. 실제 지역 데이터는 Supabase(regions 테이블)에서 오며,
 * supabase/migrations/0003_seed_regions_function.sql의 5x4 격자 레이아웃과 동일한 크기다.
 * (지시서 10장 "미해결 논의" — 실제 지도 확정 시 이 값과 시딩 함수를 함께 교체)
 */
export const MOCK_MAP_VIEWBOX = {
  width: 624,
  height: 498,
};
