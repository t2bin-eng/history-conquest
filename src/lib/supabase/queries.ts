import { supabase } from "./client";
import { mapEventLogRow, mapRegionRow, mapTeamRow } from "./mappers";
import type {
  BulkInsertQuestionsResult,
  EventLogRow,
  GameRow,
  QuestionBankSummary,
  RegionRow,
  SelectStartingRegionResult,
  StartChallengeResult,
  SubmitCaptureResult,
  TeamMemberRow,
  TeamRow,
  UploadQuestionInput,
} from "./types";
import type { Game } from "@/types/game";

export async function createGame(timeLimitSec: number): Promise<GameRow> {
  const { data, error } = await supabase
    .rpc("create_game", { p_time_limit_sec: timeLimitSec })
    .single();
  if (error) throw error;
  return data as GameRow;
}

export async function getGameByCode(code: string): Promise<GameRow | null> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data as GameRow | null;
}

export async function fetchFullGame(gameId: string): Promise<Game> {
  const [gameRes, teamsRes, membersRes, regionsRes, logsRes] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single(),
    supabase.from("teams").select("*").eq("game_id", gameId).order("created_at"),
    supabase.from("team_members").select("*").eq("game_id", gameId),
    supabase.from("regions").select("*").eq("game_id", gameId),
    supabase.from("event_logs").select("*").eq("game_id", gameId).order("created_at"),
  ]);

  if (gameRes.error) throw gameRes.error;
  if (teamsRes.error) throw teamsRes.error;
  if (membersRes.error) throw membersRes.error;
  if (regionsRes.error) throw regionsRes.error;
  if (logsRes.error) throw logsRes.error;

  const game = gameRes.data as GameRow;
  const teamRows = teamsRes.data as TeamRow[];
  const memberRows = membersRes.data as TeamMemberRow[];
  const regionRows = regionsRes.data as RegionRow[];
  const logRows = logsRes.data as EventLogRow[];

  const regions = regionRows.map(mapRegionRow);
  const teams = teamRows.map((row) =>
    mapTeamRow(
      row,
      memberRows,
      regionRows.filter((r) => r.owner_team_id === row.id).map((r) => r.key)
    )
  );

  return {
    id: game.id,
    status: game.status,
    timeLimitSec: game.time_limit_sec,
    startedAt: game.started_at,
    endedAt: game.ended_at,
    isPaused: game.is_paused,
    pausedAt: game.paused_at,
    comebackAssist: game.comeback_assist,
    regions,
    teams,
    eventLogs: logRows.map(mapEventLogRow),
  };
}

export async function registerTeam(gameId: string, name: string, color: string): Promise<string> {
  const { data, error } = await supabase
    .from("teams")
    .insert({ game_id: gameId, name, color })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function addMember(gameId: string, teamId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("team_members")
    .insert({ game_id: gameId, team_id: teamId, name });
  if (error) throw error;
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from("team_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function updateTeam(
  teamId: string,
  patch: Partial<{
    color: string;
    flag_image_url: string;
    starting_region_key: string | null;
    is_ready: boolean;
  }>
): Promise<void> {
  const { error } = await supabase.from("teams").update(patch).eq("id", teamId);
  if (error) throw error;
}

export async function selectStartingRegion(
  gameId: string,
  teamId: string,
  regionKey: string
): Promise<SelectStartingRegionResult> {
  const { data, error } = await supabase.rpc("select_starting_region", {
    p_game_id: gameId,
    p_team_id: teamId,
    p_region_key: regionKey,
  });
  if (error) throw error;
  return data as SelectStartingRegionResult;
}

export async function setTimeLimitSec(gameId: string, timeLimitSec: number): Promise<void> {
  const { error } = await supabase
    .from("games")
    .update({ time_limit_sec: timeLimitSec })
    .eq("id", gameId);
  if (error) throw error;
}

export async function startGame(gameId: string): Promise<void> {
  const { error } = await supabase.rpc("start_game", { p_game_id: gameId });
  if (error) throw error;
}

export async function endGame(gameId: string): Promise<void> {
  const { error } = await supabase.rpc("end_game", { p_game_id: gameId });
  if (error) throw error;
}

export async function pauseGame(gameId: string): Promise<void> {
  const { error } = await supabase.rpc("pause_game", { p_game_id: gameId });
  if (error) throw error;
}

export async function resumeGame(gameId: string): Promise<void> {
  const { error } = await supabase.rpc("resume_game", { p_game_id: gameId });
  if (error) throw error;
}

export async function startChallenge(
  gameId: string,
  regionKey: string,
  teamId: string
): Promise<StartChallengeResult> {
  const { data, error } = await supabase.rpc("start_challenge", {
    p_game_id: gameId,
    p_region_key: regionKey,
    p_team_id: teamId,
  });
  if (error) throw error;
  return data as StartChallengeResult;
}

export async function submitCapture(
  gameId: string,
  regionKey: string,
  teamId: string,
  questionId: string,
  selectedAnswer: string
): Promise<SubmitCaptureResult> {
  const { data, error } = await supabase.rpc("submit_capture", {
    p_game_id: gameId,
    p_region_key: regionKey,
    p_team_id: teamId,
    p_question_id: questionId,
    p_selected_answer: selectedAnswer,
  });
  if (error) throw error;
  return data as SubmitCaptureResult;
}

export async function bulkInsertQuestions(
  questions: UploadQuestionInput[],
  replaceExisting: boolean
): Promise<BulkInsertQuestionsResult> {
  const { data, error } = await supabase.rpc("bulk_insert_questions", {
    p_questions: questions,
    p_replace_existing: replaceExisting,
  });
  if (error) throw error;
  return data as BulkInsertQuestionsResult;
}

export async function getQuestionBankSummary(): Promise<QuestionBankSummary> {
  const { data, error } = await supabase.rpc("get_question_bank_summary");
  if (error) throw error;
  return data as QuestionBankSummary;
}
