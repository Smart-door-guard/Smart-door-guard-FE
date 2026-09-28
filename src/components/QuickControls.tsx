import React from 'react';
import { Lock, Bell, Check } from 'lucide-react';

export const LOCK_PULSE_MS = 300;
export const BUZZER_MS = 1000;

interface QuickControlsProps {
  connected: boolean;
  lockFiring: boolean;
  buzzerOn: boolean;
  lastLockAt: number | null;
  now: number;
  onFireLock: () => void;
  onRingBuzzer: () => void;
}

const formatAgo = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
};

export const QuickControls: React.FC<QuickControlsProps> = ({
  connected,
  lockFiring,
  buzzerOn,
  lastLockAt,
  now,
  onFireLock,
  onRingBuzzer,
}) => {
  return (
    <section class="section-container">
      <h3 class="section-title">빠른 제어</h3>
      <div class="quick-grid">
        <div class="quick-card control-card">
          <div class="control-row">
            <div class={`quick-icon-wrapper ${lockFiring ? 'active' : ''}`}>
              <Lock size={20} />
            </div>
            <div class="quick-info">
              <span class="quick-title">결박 구동</span>
              <span class="quick-status">눌러서 1회 구동 · {LOCK_PULSE_MS}ms</span>
            </div>
            <button
              class="action-btn primary"
              disabled={!connected || lockFiring}
              onClick={onFireLock}
            >
              {lockFiring ? '구동 중' : '구동'}
            </button>
          </div>
          <div class="control-footer">
            <span class="control-footer-left">
              {lastLockAt === null ? (
                '구동 기록 없음'
              ) : (
                <>
                  <Check size={14} /> 마지막 구동 확인 · {formatAgo(now - lastLockAt)}
                </>
              )}
            </span>
            <span class="control-footer-right">잠금 상태 확인 불가</span>
          </div>
        </div>

        <div class="quick-card control-card">
          <div class="control-row">
            <div class={`quick-icon-wrapper ${buzzerOn ? 'active' : ''}`}>
              <Bell size={20} />
            </div>
            <div class="quick-info">
              <span class="quick-title">경고음 울리기</span>
              <span class="quick-status">부저 1회 · {BUZZER_MS}ms</span>
            </div>
            <button
              class="action-btn secondary"
              disabled={!connected || buzzerOn}
              onClick={onRingBuzzer}
            >
              {buzzerOn ? '울리는 중' : '울리기'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
