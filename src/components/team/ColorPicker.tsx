"use client";

import { TEAM_COLOR_PRESETS } from "@/data/teamPalette";
import type { Team } from "@/types/game";
import { isColorTaken } from "@/store/gameStore";

interface ColorPickerProps {
  teams: Team[];
  myTeamId: string | null;
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ teams, myTeamId, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-neutral-300">팀 색상</span>
      <div className="flex flex-wrap gap-2">
        {TEAM_COLOR_PRESETS.map((preset) => {
          const taken = isColorTaken(teams, preset.value, myTeamId ?? undefined);
          const selected = value === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              disabled={taken}
              onClick={() => onChange(preset.value)}
              title={taken ? `${preset.name} (다른 팀이 사용 중)` : preset.name}
              className={`relative h-10 w-10 rounded-full border-2 transition ${
                selected ? "border-white ring-2 ring-blue-400" : "border-neutral-700"
              } ${taken ? "cursor-not-allowed opacity-30" : "cursor-pointer hover:scale-105"}`}
              style={{ backgroundColor: preset.value }}
            >
              {taken && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white">
                  ✕
                </span>
              )}
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-400">
        커스텀 색상
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded border border-neutral-700 bg-transparent"
        />
      </label>
      {isColorTaken(teams, value, myTeamId ?? undefined) && (
        <p className="text-xs text-red-400">이미 다른 팀이 사용 중인 색상입니다.</p>
      )}
    </div>
  );
}
