import React from 'react';
import { Activity, DoorOpen, Ruler, User } from 'lucide-react';
import { Signals } from '../types';
import { AiDetectionCard } from './AiDetectionCard';
import { SHOCK_REPEAT_COUNT, SHOCK_WINDOW_MS, activeReasons, recentShocks } from '../stateEngine';

interface VideoPageProps {
  signals: Signals;
  now: number;
}

export const VideoPage: React.FC<VideoPageProps> = ({ signals, now }) => {
  const connected = signals.connected;
  const shocks = recentShocks(signals, now);
  const reasons = connected ? activeReasons(signals, now) : [];

  const rows = [
    {
      Icon: User,
      label: '사람 감지 (YOLO · 얼굴 식별)',
      value: signals.personCount === 0
        ? '없음'
        : `${signals.personCount}명 · ${signals.personRegistered ? '등록' : '미등록'}`,
      active: signals.personCount > 0 && !signals.personRegistered,
    },
    {
      Icon: DoorOpen,
      label: '문 상태 센서',
      value: signals.doorOpen ? '열림' : '닫힘',
      active: signals.doorOpen,
    },
    {
      Icon: Ruler,
      label: '문틈 거리 (VL53L0X)',
      value: `${signals.gapMm}mm`,
      active: signals.doorOpen,
    },
    {
      Icon: Activity,
      label: `충격 (MPU6050 · 최근 ${SHOCK_WINDOW_MS / 1000}초)`,
      value: `${shocks}회${shocks >= SHOCK_REPEAT_COUNT ? ' · 반복' : ''}`,
      active: shocks >= SHOCK_REPEAT_COUNT,
    },
  ];

  return (
    <>
      <AiDetectionCard signals={signals} />

      <section class="section-container">
        <h3 class="section-title">판단에 쓰이는 신호</h3>
        <div class="card signal-card">
          {rows.map(({ Icon, label, value, active }) => (
            <div key={label} class="signal-row">
              <div class={`signal-icon ${connected && active ? 'active' : ''}`}>
                <Icon size={16} />
              </div>
              <span class="signal-label">{label}</span>
              <span class={`signal-value ${connected && active ? 'active' : ''}`}>
                {connected ? value : '—'}
              </span>
            </div>
          ))}
          <div class="signal-summary">
            {!connected
              ? '신호가 들어오지 않아 판정할 수 없습니다'
              : reasons.length === 0
                ? '이상 신호 없음'
                : `이상 신호 ${reasons.length}건: ${reasons.join(' · ')}`}
          </div>
        </div>
        <p class="signal-note">한 신호만으로는 경고 단계로 올리지 않아 오탐을 줄입니다</p>
      </section>
    </>
  );
};
