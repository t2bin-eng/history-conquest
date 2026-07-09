/**
 * 지도 렌더링용 뷰박스 크기. 실제 지역 데이터는 Supabase(regions 테이블)에서 오며,
 * supabase/migrations/0009_world_map_regions.sql이 심는 세계지도(Figma "Board Game
 * Map Design" 프로토타입 기반, geoNaturalEarth1 투영 + world-atlas 110m 국경)와
 * 동일한 캔버스 크기다.
 */
export const MOCK_MAP_VIEWBOX = {
  width: 1000,
  height: 800,
};
