"use client";

import { useState } from "react";
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
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const hoveredRegion = interactive ? regions.find((r) => r.id === hoveredId) : undefined;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      className={className ?? "h-full w-full"}
    >
      {regions.map((region) => {
        const owner = region.ownerTeamId ? teamById.get(region.ownerTeamId) : undefined;
        const fill = owner?.color ?? NEUTRAL_FILL[region.difficulty];
        const isSelected = selectedRegionId === region.id;
        const isSelectable = selectableRegionIds?.includes(region.id) ?? false;
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
              strokeWidth={isSelected ? 3 : isSelectable ? 2 : 1}
              strokeDasharray={isSelectable && !isSelected ? "6 4" : undefined}
              className="transition-colors duration-500"
            />
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

      {hoveredRegion && (
        <RegionTooltip
          region={hoveredRegion}
          owner={
            hoveredRegion.ownerTeamId ? teamById.get(hoveredRegion.ownerTeamId) : undefined
          }
        />
      )}
    </svg>
  );
}

function RegionTooltip({ region, owner }: { region: Region; owner?: Team }) {
  const { x, y } = region.labelPosition;
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
