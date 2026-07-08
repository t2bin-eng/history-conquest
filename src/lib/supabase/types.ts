export interface GameRow {
  id: string;
  code: string;
  status: "WAITING" | "PLAYING" | "GOLDEN_TIME" | "ENDED";
  time_limit_sec: number;
  started_at: string | null;
  ended_at: string | null;
  is_paused: boolean;
  paused_at: string | null;
  comeback_assist: boolean;
  created_at: string;
}

export interface TeamRow {
  id: string;
  game_id: string;
  name: string;
  color: string;
  flag_image_url: string | null;
  score: number;
  combo_streak: number;
  is_ready: boolean;
  starting_region_key: string | null;
  created_at: string;
}

export interface TeamMemberRow {
  id: string;
  game_id: string;
  team_id: string;
  name: string;
  created_at: string;
}

export interface RegionRow {
  id: string;
  game_id: string;
  key: string;
  name: string;
  difficulty: "LOW" | "MID" | "HIGH";
  points: number;
  owner_team_id: string | null;
  status: "NEUTRAL" | "OWNED" | "CONTESTED" | "COOLDOWN";
  cooldown_until: string | null;
  adjacent_keys: string[];
  failed_team_ids: string[];
  svg_path: string;
  label_x: number;
  label_y: number;
}

export interface QuestionBankRow {
  id: string;
  category: string;
  difficulty: "LOW" | "MID" | "HIGH";
  text: string;
  choices: string[];
  answer: string;
  time_limit_sec: number;
}

export interface EventLogRow {
  id: string;
  game_id: string;
  created_at: string;
  type: "CAPTURE" | "RECONQUEST" | "SURROUND" | "WRONG_ANSWER" | "CARD_USED";
  region_key: string;
  team_id: string | null;
  actor_member_name: string | null;
  payload: Record<string, unknown>;
}

export interface RpcQuestion {
  id: string;
  category: string;
  difficulty: "LOW" | "MID" | "HIGH";
  text: string;
  choices: string[];
  timeLimitSec: number;
}

export interface StartChallengeResult {
  success: boolean;
  reason?: "region_not_found" | "not_eligible" | "no_question_available";
  question?: RpcQuestion;
}

export interface SubmitCaptureResult {
  success: boolean;
  reason?: "region_not_found" | "not_eligible" | "question_not_found";
  correct?: boolean;
  reconquest?: boolean;
}
