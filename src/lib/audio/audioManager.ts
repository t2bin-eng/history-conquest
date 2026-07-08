"use client";

/**
 * 페이지 이동(클라이언트 사이드 라우팅) 중에도 끊기지 않도록 모듈 스코프의
 * 단일 오디오 인스턴스를 유지한다. 같은 key로 다시 호출되면 재시작하지 않는다.
 */
let currentAudio: HTMLAudioElement | null = null;
let currentKey: string | null = null;
let sequenceList: string[] = [];
let sequenceIndex = 0;
let sequenceVolume = 0.5;
let pendingPlay: (() => void) | null = null;

function tryPlay(audio: HTMLAudioElement) {
  audio.play().catch(() => {
    // 브라우저 자동재생 제한에 걸린 경우, 사용자의 다음 클릭에서 재시도한다.
    pendingPlay = () => audio.play().catch(() => {});
  });
}

if (typeof window !== "undefined") {
  document.addEventListener(
    "click",
    () => {
      if (pendingPlay) {
        pendingPlay();
        pendingPlay = null;
      }
    },
    { capture: true }
  );
}

function stopCurrent() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.onended = null;
    currentAudio.src = "";
  }
  currentAudio = null;
  currentKey = null;
  pendingPlay = null;
}

export function playLoop(key: string, src: string, volume = 0.5) {
  if (currentKey === key) return;
  stopCurrent();
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = volume;
  currentAudio = audio;
  currentKey = key;
  tryPlay(audio);
}

export function playOnce(key: string, src: string, volume = 0.5) {
  if (currentKey === key) return;
  stopCurrent();
  const audio = new Audio(src);
  audio.volume = volume;
  currentAudio = audio;
  currentKey = key;
  tryPlay(audio);
}

/** 목록을 순서대로 재생하고, 끝까지 재생되면 처음으로 돌아가 반복한다. */
export function playSequence(key: string, srcs: string[], volume = 0.5) {
  if (currentKey === key) return;
  stopCurrent();
  sequenceList = srcs;
  sequenceIndex = 0;
  sequenceVolume = volume;
  currentKey = key;
  playSequenceTrack();
}

function playSequenceTrack() {
  const src = sequenceList[sequenceIndex];
  const audio = new Audio(src);
  audio.volume = sequenceVolume;
  audio.onended = () => {
    sequenceIndex = (sequenceIndex + 1) % sequenceList.length;
    playSequenceTrack();
  };
  currentAudio = audio;
  tryPlay(audio);
}

export function stopAudio() {
  stopCurrent();
}

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __audioDebug?: () => unknown }).__audioDebug = () => ({
    key: currentKey,
    src: currentAudio?.currentSrc,
    paused: currentAudio?.paused,
    readyState: currentAudio?.readyState,
    hasPendingPlay: !!pendingPlay,
  });
}
