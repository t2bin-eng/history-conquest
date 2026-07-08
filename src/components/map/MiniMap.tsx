import type { Region, Team } from "@/types/game";
import { RegionMap } from "./RegionMap";

interface MiniMapProps {
  regions: Region[];
  teams: Team[];
  viewBoxWidth: number;
  viewBoxHeight: number;
  className?: string;
}

export function MiniMap({ regions, teams, viewBoxWidth, viewBoxHeight, className }: MiniMapProps) {
  return (
    <div
      className={`overflow-hidden rounded-md border border-neutral-800 bg-neutral-950 ${className ?? ""}`}
    >
      <RegionMap
        regions={regions}
        teams={teams}
        viewBoxWidth={viewBoxWidth}
        viewBoxHeight={viewBoxHeight}
        interactive={false}
        showLabels={false}
      />
    </div>
  );
}
