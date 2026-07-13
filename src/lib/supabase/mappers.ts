import type { EventLog, Region, Team } from "@/types/game";
import type { EventLogRow, RegionRow, TeamMemberRow, TeamRow } from "./types";

export function mapRegionRow(row: RegionRow): Region {
  return {
    id: row.key,
    name: row.name,
    difficulty: row.difficulty,
    points: row.points,
    ownerTeamId: row.owner_team_id,
    status: row.status,
    cooldownUntil: row.cooldown_until,
    adjacentRegionIds: row.adjacent_keys,
    failedTeamIds: row.failed_team_ids,
    failedUntil: row.failed_until ?? {},
    svgPath: row.svg_path,
    labelPosition: { x: Number(row.label_x), y: Number(row.label_y) },
  };
}

export function mapTeamRow(
  row: TeamRow,
  members: TeamMemberRow[],
  ownedRegionIds: string[]
): Team {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    flagImageUrl: row.flag_image_url,
    members: members
      .filter((m) => m.team_id === row.id)
      .map((m) => ({ id: m.id, name: m.name })),
    score: row.score,
    ownedRegionIds,
    cards: [],
    comboStreak: row.combo_streak,
    isReady: row.is_ready,
    startingRegionId: row.starting_region_key,
  };
}

export function mapEventLogRow(row: EventLogRow): EventLog {
  return {
    id: row.id,
    timestamp: row.created_at,
    type: row.type,
    regionId: row.region_key,
    teamId: row.team_id ?? "",
    actorMemberName: row.actor_member_name,
    payload: row.payload,
  };
}
