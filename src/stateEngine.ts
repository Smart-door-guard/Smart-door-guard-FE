/**
 * stateEngine.ts — 목 모드 전용 로컬 상태 판단 엔진
 *
 * 실서버 모드에서는 사용하지 않는다.
 * 서버의 systemState를 그대로 쓰기 때문이다.
 * 둘이 다르면 화면은 "경고"인데 부저는 안 울리는 상황이 생긴다.
 */
import { Signals, SystemState } from './types';

// 이 시간 안에 충격이 SHOCK_REPEAT_COUNT번 이상 들어오면 '충격 반복'으로 본다
export const SHOCK_WINDOW_MS = 10_000;
export const SHOCK_REPEAT_COUNT = 2;

export const recentShocks = (signals: Signals, now: number) =>
  signals.shockTimes.filter((t) => now - t <= SHOCK_WINDOW_MS).length;

// 단계를 올리는 근거 신호 목록.
// null인 신호는 "모른다"이므로 이상 신호로 집계하지 않는다.
// 등록 인물은 근거에서 제외한다.
export const activeReasons = (signals: Signals, now: number): string[] => {
  const reasons: string[] = [];
  if (signals.personCount !== null && signals.personCount > 0 && signals.personRegistered === false) {
    reasons.push('미등록 인물 감지');
  }
  if (signals.doorOpen === true) {  // null(모름)은 포함하지 않음
    reasons.push('문 열림');
  }
  if (recentShocks(signals, now) >= SHOCK_REPEAT_COUNT) {
    reasons.push('충격 반복');
  }
  return reasons;
};

// 사람 감지 · 문 열림 · 충격 반복을 함께 확인해 단계를 올린다.
// 목 모드 전용 — 실서버 모드에서는 서버의 systemState를 직접 사용한다.
export const evaluateState = (signals: Signals, now: number): SystemState => {
  if (!signals.connected) return 'UNKNOWN';
  const count = activeReasons(signals, now).length;
  if (count >= 3) return 'INTRUSION';
  if (count === 2) return 'WARNING';
  if (count === 1) return 'WATCH';
  return 'NORMAL';
};
