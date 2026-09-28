import { Signals, SystemState } from './types';

// 이 시간 안에 충격이 SHOCK_REPEAT_COUNT번 이상 들어오면 '충격 반복'으로 본다
export const SHOCK_WINDOW_MS = 10_000;
export const SHOCK_REPEAT_COUNT = 2;

export const recentShocks = (signals: Signals, now: number) =>
  signals.shockTimes.filter((t) => now - t <= SHOCK_WINDOW_MS).length;

// 단계를 올리는 근거 신호 목록. 등록 인물은 근거에서 제외한다.
export const activeReasons = (signals: Signals, now: number): string[] => {
  const reasons: string[] = [];
  if (signals.personCount > 0 && !signals.personRegistered) reasons.push('미등록 인물 감지');
  if (signals.doorOpen) reasons.push('문 열림');
  if (recentShocks(signals, now) >= SHOCK_REPEAT_COUNT) reasons.push('충격 반복');
  return reasons;
};

// 사람 감지 · 문 열림 · 충격 반복을 함께 확인해 단계를 올린다.
// 한 신호만으로는 감시 단계까지만 올라가고, 경고·침입은 여러 신호가 겹쳐야 한다.
export const evaluateState = (signals: Signals, now: number): SystemState => {
  if (!signals.connected) return 'UNKNOWN';
  const count = activeReasons(signals, now).length;
  if (count >= 3) return 'INTRUSION';
  if (count === 2) return 'WARNING';
  if (count === 1) return 'WATCH';
  return 'NORMAL';
};
