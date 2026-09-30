import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Bell, Check } from 'lucide-react';
import { OutputStatus } from './OutputStatus';
import { postControl, waitForCommand } from '../api/client';
import type { ControlError, ControlsInfo } from '../types';

export const LOCK_PULSE_MS = 300;
export const BUZZER_MS = 1000;

interface QuickControlsProps {
  isMockMode: boolean;
  connected: boolean;
  lockFiring: boolean;         // 목 모드용
  buzzerOn: boolean;           // 목 모드용
  lastLockAt: number | null;   // 목 모드용
  now: number;
  onFireLock: () => void;      // 목 모드용
  onRingBuzzer: () => void;    // 목 모드용
  /** 실서버 모드에서 WS로 받은 controls 정보 */
  controls?: ControlsInfo;
}

const formatAgo = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
};

// 에러 상태 표시용
interface ActionState {
  loading: boolean;
  error: string | null;
  countdown: number | null;  // 쿨다운 남은 초
}

const defaultActionState = (): ActionState => ({
  loading: false,
  error: null,
  countdown: null,
});

export const QuickControls: React.FC<QuickControlsProps> = ({
  isMockMode,
  connected,
  lockFiring,
  buzzerOn,
  lastLockAt,
  now,
  onFireLock,
  onRingBuzzer,
  controls,
}) => {
  const [solenoidState, setSolenoidState] = useState<ActionState>(defaultActionState());
  const [buzzerState, setBuzzerState] = useState<ActionState>(defaultActionState());
  const [feedback, setFeedback] = useState('');
  const [lastSolenoidAt, setLastSolenoidAt] = useState<number | null>(null);

  // 쿨다운 카운트다운 타이머
  useEffect(() => {
    if (solenoidState.countdown === null || solenoidState.countdown <= 0) return;
    const timer = setTimeout(() => {
      setSolenoidState((s) => ({
        ...s,
        countdown: s.countdown !== null && s.countdown > 1 ? s.countdown - 1 : null,
        error: s.countdown !== null && s.countdown > 1 ? s.error : null,
      }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [solenoidState.countdown]);

  useEffect(() => {
    if (buzzerState.countdown === null || buzzerState.countdown <= 0) return;
    const timer = setTimeout(() => {
      setBuzzerState((s) => ({
        ...s,
        countdown: s.countdown !== null && s.countdown > 1 ? s.countdown - 1 : null,
        error: s.countdown !== null && s.countdown > 1 ? s.error : null,
      }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [buzzerState.countdown]);

  const handleError = useCallback(
    (err: unknown, setState: React.Dispatch<React.SetStateAction<ActionState>>) => {
      const ce = err as ControlError;
      let errorMsg = ce?.reason ?? '오류가 발생했습니다.';
      let countdown: number | null = null;

      if (ce?.status === 429 && ce.retryAfterMs !== undefined) {
        countdown = Math.ceil(ce.retryAfterMs / 1000);
        errorMsg = `쿨다운 ${countdown}초 남음`;
      } else if (ce?.status === 401) {
        errorMsg = 'QR을 다시 스캔하세요 (토큰 만료)';
      }

      setState({ loading: false, error: errorMsg, countdown });
    },
    []
  );

  // 실서버 모드: controls.available 반영
  const controlsAvailable = isMockMode ? true : (controls?.available ?? false);
  const controlsReason = isMockMode ? '' : (controls?.reason ?? '');

  const canFireSolenoid =
    connected &&
    controlsAvailable &&
    !solenoidState.loading &&
    solenoidState.countdown === null;

  const canFireBuzzer =
    connected &&
    controlsAvailable &&
    !buzzerState.loading &&
    buzzerState.countdown === null;

  const handleSolenoid = async () => {
    if (isMockMode) { onFireLock(); return; }
    setSolenoidState({ loading: true, error: null, countdown: null });
    try {
      const result = await postControl('solenoid', LOCK_PULSE_MS);
      if (!result.commandId) throw {reason: '명령 ID가 없습니다.'};
      setFeedback('솔레노이드 명령 접수 · 장치 응답 대기');
      await waitForCommand(result.commandId, (s) => setFeedback(s.status === 'executed' ? '솔레노이드 출력 시작 확인 · 종료 대기' : s.status === 'completed' ? '솔레노이드 출력 종료 확인 (기계적 잠금 여부는 확인 불가)' : '솔레노이드 장치 응답 대기'));
      setLastSolenoidAt(Date.now());
      setSolenoidState({ loading: false, error: null, countdown: null });
    } catch (err) {
      setFeedback('');
      handleError(err, setSolenoidState);
    }
  };

  const handleBuzzer = async () => {
    if (isMockMode) { onRingBuzzer(); return; }
    setBuzzerState({ loading: true, error: null, countdown: null });
    try {
      const result = await postControl('buzzer', BUZZER_MS);
      if (!result.commandId) throw {reason: '명령 ID가 없습니다.'};
      setFeedback('부저 명령 접수 · 장치 응답 대기');
      await waitForCommand(result.commandId, (s) => setFeedback(s.status === 'executed' ? '부저 출력 시작 확인 · 종료 대기' : s.status === 'completed' ? '부저 출력 종료 확인' : '부저 장치 응답 대기'));
      setBuzzerState({ loading: false, error: null, countdown: null });
    } catch (err) {
      setFeedback('');
      handleError(err, setBuzzerState);
    }
  };

  // 표시용 상태 결합 (목/실서버)
  const solenoidFiring = isMockMode ? lockFiring : solenoidState.loading;
  const buzzerFiring = isMockMode ? buzzerOn : buzzerState.loading;
  const displayLastLockAt = isMockMode ? lastLockAt : lastSolenoidAt;

  return (
    <section className="section-container">
      <h3 className="section-title">빠른 제어</h3>
      <p role="status" aria-live="polite">{feedback}</p>
      {!isMockMode && <OutputStatus />}

      {/* controls.reason 표시 (실서버 모드에서 버튼이 막힌 이유) */}
      {!isMockMode && !controlsAvailable && controlsReason && (
        <div className="controls-reason-banner">{controlsReason}</div>
      )}

      <div className="quick-grid">
        {/* 솔레노이드 */}
        <div className="quick-card control-card">
          <div className="control-row">
            <div className={`quick-icon-wrapper ${solenoidFiring ? 'active' : ''}`}>
              <Lock size={20} />
            </div>
            <div className="quick-info">
              <span className="quick-title">결박 구동</span>
              <span className="quick-status">눌러서 1회 구동 · {LOCK_PULSE_MS}ms</span>
            </div>
            <button
              className="action-btn primary"
              disabled={!canFireSolenoid || solenoidFiring}
              onClick={handleSolenoid}
            >
              {solenoidState.loading ? '전송 중' : solenoidFiring ? '구동 중' : '구동'}
            </button>
          </div>
          <div className="control-footer">
            <span className="control-footer-left">
              {displayLastLockAt === null ? (
                '구동 기록 없음'
              ) : (
                <>
                  <Check size={14} /> 마지막 구동 · {formatAgo(now - displayLastLockAt)}
                </>
              )}
            </span>
            <span className="control-footer-right">잠금 상태 확인 불가</span>
          </div>
          {/* 에러 또는 쿨다운 표시 */}
          {solenoidState.error && (
            <div className={`action-error ${solenoidState.countdown !== null ? 'cooldown' : ''}`}>
              {solenoidState.countdown !== null
                ? `⏳ 쿨다운 ${solenoidState.countdown}초 남음`
                : `⚠ ${solenoidState.error}`}
            </div>
          )}
        </div>

        {/* 부저 */}
        <div className="quick-card control-card">
          <div className="control-row">
            <div className={`quick-icon-wrapper ${buzzerFiring ? 'active' : ''}`}>
              <Bell size={20} />
            </div>
            <div className="quick-info">
              <span className="quick-title">경고음 울리기</span>
              <span className="quick-status">부저 1회 · {BUZZER_MS}ms</span>
            </div>
            <button
              className="action-btn secondary"
              disabled={!canFireBuzzer || buzzerFiring}
              onClick={handleBuzzer}
            >
              {buzzerState.loading ? '전송 중' : buzzerFiring ? '울리는 중' : '울리기'}
            </button>
          </div>
          {/* 에러 또는 쿨다운 표시 */}
          {buzzerState.error && (
            <div className={`action-error ${buzzerState.countdown !== null ? 'cooldown' : ''}`}>
              {buzzerState.countdown !== null
                ? `⏳ 쿨다운 ${buzzerState.countdown}초 남음`
                : `⚠ ${buzzerState.error}`}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
