"use client";

import { useEffect, useRef, useState } from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { AnimatePresence, motion } from "framer-motion";
import type { Region, Team } from "@/types/game";
import { NEUTRAL_FILL, difficultyLabel } from "@/lib/regionDisplay";

interface RegionMapProps {
  regions: Region[];
  teams: Team[];
  viewBoxWidth: number;
  viewBoxHeight: number;
  onRegionClick?: (regionId: string) => void;
  selectedRegionId?: string | null;
  selectableRegionIds?: string[];
  interactive?: boolean;
  showLabels?: boolean;
  className?: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

export function RegionMap({
  regions,
  teams,
  viewBoxWidth,
  viewBoxHeight,
  onRegionClick,
  selectedRegionId = null,
  selectableRegionIds,
  interactive = true,
  showLabels = true,
  className,
}: RegionMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const prevOwnerRef = useRef<Map<string, string | null>>(new Map());

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const hoveredRegion = interactive ? regions.find((r) => r.id === hoveredId) : undefined;

  // 방금 점령/탈환된 지역을 감지해 1.2초간 반짝이는 표시를 붙인다 — 누가 언제
  // 땅을 가져갔는지 화면만 봐도 바로 알 수 있게 하기 위함.
  useEffect(() => {
    const prevOwners = prevOwnerRef.current;
    const justCaptured = new Set<string>();
    for (const region of regions) {
      const prevOwner = prevOwners.get(region.id);
      if (prevOwner !== undefined && region.ownerTeamId && region.ownerTeamId !== prevOwner) {
        justCaptured.add(region.id);
      }
    }
    prevOwnerRef.current = new Map(regions.map((r) => [r.id, r.ownerTeamId]));

    if (justCaptured.size === 0) return;
    // regions prop 변화(외부 데이터 동기화)에 대한 반응이라 정당한 setState — 렌더 중
    // 파생시킬 수 없는, 이전 렌더와의 비교(ref)가 필요한 로직이다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlashIds((prev) => new Set([...prev, ...justCaptured]));
    const timer = window.setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev);
        justCaptured.forEach((id) => next.delete(id));
        return next;
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [regions]);

  // 확대/축소 + 드래그 이동(데스크톱 휠, 모바일 핀치/드래그). 가독성을 위해
  // 지도 자체를 키울 수 있게 하되, 미니맵(interactive=false)에는 적용하지 않는다.
  useEffect(() => {
    if (!interactive || !svgRef.current) return;
    const svgEl = svgRef.current;
    const svgSel = select(svgEl);

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .on("zoom", (event) => {
        const rect = svgEl.getBoundingClientRect();
        const scale = rect.width > 0 ? viewBoxWidth / rect.width : 1;
        const k = event.transform.k;
        const rawX = event.transform.x * scale;
        const rawY = event.transform.y * scale;
        // 확대된 만큼만 이동 가능하도록 지도를 화면 밖으로 완전히 벗어나지 않게 고정
        const minX = viewBoxWidth - viewBoxWidth * k;
        const minY = viewBoxHeight - viewBoxHeight * k;
        setTransform({
          k,
          x: Math.min(0, Math.max(minX, rawX)),
          y: Math.min(0, Math.max(minY, rawY)),
        });
      });

    svgSel.call(zoomBehavior);
    svgSel.on("dblclick.zoom", null); // 더블탭이 지역 선택과 겹치지 않도록
    zoomBehaviorRef.current = zoomBehavior;

    return () => {
      svgSel.on(".zoom", null);
    };
  }, [interactive, viewBoxWidth, viewBoxHeight]);

  const resetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).call(zoomBehaviorRef.current.transform, zoomIdentity);
    setTransform({ k: 1, x: 0, y: 0 });
  };

  const hoveredScreenPos = hoveredRegion
    ? {
        x: hoveredRegion.labelPosition.x * transform.k + transform.x,
        y: hoveredRegion.labelPosition.y * transform.k + transform.y,
      }
    : null;

  return (
    <div className={`relative ${className ?? "h-full w-full"}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="h-full w-full"
        style={interactive ? { touchAction: "none" } : undefined}
      >
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {regions.map((region) => {
            const owner = region.ownerTeamId ? teamById.get(region.ownerTeamId) : undefined;
            const fill = owner?.color ?? NEUTRAL_FILL[region.difficulty];
            const isSelected = selectedRegionId === region.id;
            const isSelectable = selectableRegionIds?.includes(region.id) ?? false;
            const isFlashing = flashIds.has(region.id);
            const clickable = interactive && !!onRegionClick;

            return (
              <g
                key={region.id}
                onClick={clickable ? () => onRegionClick(region.id) : undefined}
                onMouseEnter={() => interactive && setHoveredId(region.id)}
                onMouseLeave={() => interactive && setHoveredId(null)}
                className={clickable ? "cursor-pointer" : undefined}
              >
                <path
                  d={region.svgPath}
                  fill={fill}
                  stroke={isSelected ? "#ffffff" : isSelectable ? "#60a5fa" : "#0a0a0a"}
                  strokeWidth={isSelected ? 4 : isSelectable ? 3 : 1}
                  strokeDasharray={isSelectable && !isSelected ? "7 4" : undefined}
                  vectorEffect="non-scaling-stroke"
                  className={`transition-colors duration-500 ${
                    isSelectable && !isSelected ? "animate-pulse" : ""
                  }`}
                  style={{
                    filter: isSelected
                      ? "drop-shadow(0 0 5px rgba(255,255,255,0.95))"
                      : isSelectable
                        ? "drop-shadow(0 0 4px rgba(96,165,250,0.75))"
                        : undefined,
                  }}
                />
                <AnimatePresence>
                  {isFlashing && owner && (
                    <motion.circle
                      cx={region.labelPosition.x}
                      cy={region.labelPosition.y}
                      r={4}
                      fill="none"
                      stroke={owner.color}
                      strokeWidth={3}
                      initial={{ r: 4, opacity: 1 }}
                      animate={{ r: 46, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.1, ease: "easeOut" }}
                      className="pointer-events-none"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </AnimatePresence>
                {showLabels && (
                  <text
                    x={region.labelPosition.x}
                    y={region.labelPosition.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none fill-white text-[11px] font-medium"
                    style={{ paintOrder: "stroke", stroke: "#00000080", strokeWidth: 3 }}
                  >
                    {region.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {hoveredRegion && hoveredScreenPos && (
          <RegionTooltip
            region={hoveredRegion}
            pos={hoveredScreenPos}
            owner={
              hoveredRegion.ownerTeamId ? teamById.get(hoveredRegion.ownerTeamId) : undefined
            }
          />
        )}
      </svg>

      {interactive && transform.k > 1 && (
        <button
          type="button"
          onClick={resetZoom}
          className="absolute bottom-2 right-2 rounded-md bg-neutral-900/90 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-neutral-700 hover:bg-neutral-800"
        >
          지도 초기화
        </button>
      )}
    </div>
  );
}

function RegionTooltip({
  region,
  owner,
  pos,
}: {
  region: Region;
  owner?: Team;
  pos: { x: number; y: number };
}) {
  const { x, y } = pos;
  return (
    <foreignObject x={x - 55} y={y - 58} width={110} height={50} className="overflow-visible">
      <div className="pointer-events-none rounded-md bg-neutral-900/95 px-2 py-1 text-center text-[10px] leading-tight text-white shadow-lg ring-1 ring-neutral-700">
        <p className="font-semibold">{region.name}</p>
        <p className="text-neutral-400">
          난이도 {difficultyLabel(region.difficulty)} · {region.points}점
        </p>
        {owner && (
          <p className="font-medium" style={{ color: owner.color }}>
            {owner.name}
          </p>
        )}
      </div>
    </foreignObject>
  );
}
