import { supabase } from "./client";
import { mapEventLogRow, mapRegionRow, mapTeamRow } from "./mappers";
import type {
  BulkInsertQuestionsResult,
  EventLogRow,
  GameHistoryEntry,
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
import type { EventLog, Game } from "@/types/game";

/** 실시간 동기화(연결/재연결 시 초기 전체 조회)에서 가져오는 이벤트 로그
 * 개수 상한. 게임이 길어져도 매 재조회 비용이 무한정 커지지 않도록 최근
 * 것만 유지한다 — 화면에 필요한 건 최근 이벤트 피드뿐이고, 결과 화면의
 * 정확한 누적 통계는 fetchEventLogs로 전체를 따로 받아온다. */
const LIVE_EVENT_LOG_LIMIT = 300;

export interface RawGameState {
  gameRow: GameRow;
  teamRows: TeamRow[];
  memberRows: TeamMemberRow[];
  regionRows: RegionRow[];
  logRows: EventLogRow[];
}

/** raw 테이블 row들로부터 화면에서 쓰는 Game 객체를 조립한다. 최초 접속 시의
 * 전체 조회뿐 아니라, 실시간 변경 이벤트를 raw 캐시에 반영한 뒤 다시
 * 계산할 때도 재사용한다(네트워크 재조회 없이 클라이언트에서 즉시 계산). */
export function composeGame(raw: RawGameState): Game {
  const { gameRow, teamRows, memberRows, regionRows, logRows } = raw;
  const regions = regionRows.map(mapRegionRow);
  const teams = teamRows.map((row) =>
    mapTeamRow(
      row,
      memberRows,
      regionRows.filter((r) => r.owner_team_id === row.id).map((r) => r.key)
    )
  );

  return {
    id: gameRow.id,
    status: gameRow.status,
    timeLimitSec: gameRow.time_limit_sec,
    startedAt: gameRow.started_at,
    endedAt: gameRow.ended_at,
    isPaused: gameRow.is_paused,
    pausedAt: gameRow.paused_at,
    comebackAssist: gameRow.comeback_assist,
    classNumber: gameRow.class_number,
    regions,
    teams,
    eventLogs: logRows.map(mapEventLogRow),
  };
}

export async function createGame(timeLimitSec: number, classNumber: number): Promise<GameRow> {
  const { data, error } = await supabase
    .rpc("create_game", { p_time_limit_sec: timeLimitSec, p_class_number: classNumber })
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

/** 게임을 구성하는 raw row들을 조회한다. games/teams/team_members/regions는
 * 소규모라 전체를 받아오지만, event_logs는 게임이 길어질수록 계속 쌓이므로
 * 최근 LIVE_EVENT_LOG_LIMIT개로 제한한다 — 접속/재접속 시 매번 전체 로그를
 * 다시 받아오면 게임이 길어질수록 재조회 비용이 커지는 문제가 있었다. */
export async function fetchGameRaw(gameId: string): Promise<RawGameState> {
  const [gameRes, teamsRes, membersRes, regionsRes, logsRes] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single(),
    supabase.from("teams").select("*").eq("game_id", gameId).order("created_at"),
    supabase.from("team_members").select("*").eq("game_id", gameId),
    // is_betting_zone은 절대 포함하지 않는다 — 도전 시 start_challenge RPC를 통해
    // 해당 지역을 도전한 팀에게만 그 순간 공개된다 (question_bank.answer와 동일한 원칙).
    supabase
      .from("regions")
      .select(
        "id,game_id,key,name,difficulty,points,owner_team_id,status,cooldown_until,adjacent_keys,failed_team_ids,svg_path,label_x,label_y"
      )
      .eq("game_id", gameId),
    supabase
      .from("event_logs")
      .select("*")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(LIVE_EVENT_LOG_LIMIT),
  ]);

  if (gameRes.error) throw gameRes.error;
  if (teamsRes.error) throw teamsRes.error;
  if (membersRes.error) throw membersRes.error;
  if (regionsRes.error) throw regionsRes.error;
  if (logsRes.error) throw logsRes.error;

  return {
    gameRow: gameRes.data as GameRow,
    teamRows: teamsRes.data as TeamRow[],
    memberRows: membersRes.data as TeamMemberRow[],
    regionRows: regionsRes.data as RegionRow[],
    // 최신순으로 LIMIT을 건 뒤 화면 표시 순서(오래된 것부터)로 되돌린다.
    logRows: (logsRes.data as EventLogRow[]).slice().reverse(),
  };
}

export async function fetchFullGame(gameId: string): Promise<Game> {
  return composeGame(await fetchGameRaw(gameId));
}

/** 결과 화면의 팀별 정답/오답/재정복 통계와 CSV 내보내기는 게임 전체 기간의
 * 정확한 집계가 필요하다. 실시간 동기화용 raw 캐시는 트래픽 절감을 위해
 * 최근 이벤트만 유지하므로, 그 값을 쓰지 않고 이 함수로 전체 로그를 별도
 * 조회한다(게임 종료 후 결과 화면 진입 시 1회만 호출됨). */
export async function fetchEventLogs(gameId: string): Promise<EventLog[]> {
  const { data, error } = await supabase
    .from("event_logs")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at");
  if (error) throw error;
  return (data as EventLogRow[]).map(mapEventLogRow);
}

/** 반별 지난 게임 결과(종료된 게임의 최종 팀 순위)를 최신순으로 조회한다. */
export async function fetchGameHistory(classNumber: number): Promise<GameHistoryEntry[]> {
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id,code,class_number,ended_at")
    .eq("class_number", classNumber)
    .eq("status", "ENDED")
    .order("ended_at", { ascending: false });
  if (gamesError) throw gamesError;
  if (!games || games.length === 0) return [];

  const gameIds = games.map((g) => g.id as string);
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id,game_id,name,color,score")
    .in("game_id", gameIds);
  if (teamsError) throw teamsError;

  return games.map((g) => ({
    id: g.id as string,
    code: g.code as string,
    classNumber: g.class_number as number | null,
    endedAt: g.ended_at as string | null,
    teams: (teams ?? [])
      .filter((t) => t.game_id === g.id)
      .map((t) => ({ id: t.id, name: t.name, color: t.color, score: t.score }))
      .sort((a, b) => b.score - a.score),
  }));
}

export async function deleteGame(gameId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_game", { p_game_id: gameId });
  if (error) throw error;
}

export async function deleteGamesByClass(classNumber: number): Promise<void> {
  const { error } = await supabase.rpc("delete_games_by_class", { p_class_number: classNumber });
  if (error) throw error;
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

export async function setComebackAssist(gameId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from("games")
    .update({ comeback_assist: enabled })
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
