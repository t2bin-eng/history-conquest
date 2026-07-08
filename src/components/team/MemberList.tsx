"use client";

import { useState } from "react";
import type { TeamMember } from "@/types/game";

interface MemberListProps {
  members: TeamMember[];
  onAdd: (name: string) => void;
  onRemove: (memberId: string) => void;
}

export function MemberList({ members, onAdd, onRemove }: MemberListProps) {
  const [name, setName] = useState("");

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-neutral-300">팀원 명단</span>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="팀원 이름"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-700"
        >
          추가
        </button>
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-neutral-500">아직 등록된 팀원이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-md bg-neutral-900 px-3 py-2 text-sm text-neutral-200"
            >
              {member.name}
              <button
                type="button"
                onClick={() => onRemove(member.id)}
                className="text-neutral-500 hover:text-red-400"
                aria-label={`${member.name} 삭제`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
