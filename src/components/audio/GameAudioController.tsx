"use client";

import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { playLoop, playOnce, playSequence, stopAudio } from "@/lib/audio/audioManager";

const LOBBY_BGM = "/audio/lobby-bgm.mp3";
const PLAY_PLAYLIST = ["/audio/play-1.mp3", "/audio/play-2.mp3", "/audio/play-3.mp3"];
const RESULTS_BGM = "/audio/results-bgm.mp3";

/** 게임 상태에 따라 배경음악을 자동 전환한다. 화면을 렌더링하지 않는다.
 * 대기실(WAITING): 트랙1 반복 → 게임 진행(PLAYING/GOLDEN_TIME): 트랙2~4 순차 반복
 * → 종료(ENDED): 트랙5 1회 재생 */
export function GameAudioController() {
  const gameId = useGameStore((s) => s.gameId);
  const status = useGameStore((s) => s.game.status);
  // game.id는 fetchFullGame이 실제로 완료된 게임의 id다. gameId가 막 설정된
  // 직후에는 game이 아직 이전(혹은 빈) 상태라 status가 낡은 값일 수 있는데,
  // 이때 잘못 재생을 시작했다가 실제 상태 도착 직후 다시 바뀌며 두 트랙이
  // 겹쳐 들리는 일이 있었다. 실제 데이터가 로드된 뒤에만 재생을 결정한다.
  const loadedGameId = useGameStore((s) => s.game.id);

  useEffect(() => {
    if (!gameId || loadedGameId !== gameId) {
      stopAudio();
      return;
    }

    if (status === "WAITING") {
      playLoop("lobby", LOBBY_BGM);
    } else if (status === "PLAYING" || status === "GOLDEN_TIME") {
      playSequence("play", PLAY_PLAYLIST);
    } else if (status === "ENDED") {
      playOnce("results", RESULTS_BGM);
    }
  }, [gameId, status, loadedGameId]);

  return null;
}
