import React from 'react';
import { Activity, DoorOpen, Ruler, User } from 'lucide-react';
import { Signals } from '../types';
import { AiDetectionCard } from './AiDetectionCard';
import { LiveVideoCard } from './LiveVideoCard';
import { SHOCK_REPEAT_COUNT, SHOCK_WINDOW_MS, recentShocks } from '../stateEngine';

interface VideoPageProps {
  signals: Signals;
  now: number;
  /** 목 모드면 실시간 영상 대신 정지 이미지 카드를 쓴다 */
  isMockMode: boolean;
}

// null 가능 필드를 화면에 표시할 때 쓰는 헬퍼
const nullableText = (
  value: string | number | boolean | null,
  format: (v: NonNullable<typeof value>) => string,
  unknownLabel = '—',
): string => (value === null ? unknownLabel : format(value as NonNullable<typeof value>));

export const VideoPage: React.FC<VideoPageProps> = ({ signals, now, isMockMode }) => {
  const connected = signals.connected;
  const shocks = recentShocks(signals, now);

  // 마지막 충격 시각 (shockTimes 가장 최근 값)
  const lastShockTs =
    signals.shockTimes.length > 0
      ? signals.shockTimes[signals.shockTimes.length - 1]
      : null;
  const lastShockAgoSec =
    lastShockTs !== null ? Math.max(0, Math.floor((now - lastShockTs) / 1000)) : null;

  // 문 상태 표시
  const doorText = nullableText(
    signals.doorOpen,
    (v) => (v ? '열림' : '닫힘'),
    '—',
  );

  // 문틈 거리 표시
  const gapText = nullableText(signals.gapMm, (v) => `${v}mm`, '—');

  const personText = !connected
    ? '—'
    : !signals.personCount
      ? '없음'
      : `${signals.personCount}명${signals.personRegistered === true ? ' · 등록' : signals.personRegistered === false ? ' · 미등록' : ''}`;

  // 문 열림 여부가 null이면 active 판정 불가 → 표시 안 함
  const doorActive = signals.doorOpen === true;
  const gapActive = signals.doorOpen === true;

  const rows = [
    {
      Icon: User,
      label: '사람 감지 (YOLO · 얼굴 식별)',
      value: personText,
      active: connected && signals.personCount !== null && signals.personCount > 0 && signals.personRegistered === false,
    },
    {
      Icon: DoorOpen,
      label: '문 상태 센서',
      value: connected ? doorText : '—',
      active: connected && doorActive,
    },
    {
      Icon: Ruler,
      label: '문틈 거리 (VL53L0X)',
      value: connected ? gapText : '—',
      active: connected && gapActive,
    },
    {
      Icon: Activity,
      label: `충격 (MPU6050 · 최근 ${SHOCK_WINDOW_MS / 1000}초)`,
      value: connected
        ? `${shocks}회${shocks >= SHOCK_REPEAT_COUNT ? ' · 반복' : ''}${
            lastShockAgoSec !== null ? ` · ${lastShockAgoSec}초 전` : ''
          }`
        : '—',
      active: connected && shocks >= SHOCK_REPEAT_COUNT,
    },
  ];

  // 이상 신호 요약 (서버 상태를 쓰는 실서버 모드에서는 표시만 담당)
  const anomalyCount = rows.filter((r) => r.active).length;
  const summaryText = !connected
    ? '연결 중'
    : anomalyCount === 0
      ? '이상 신호 없음'
      : `이상 신호 ${anomalyCount}건`;

  return (
    <>
      {/* 실시간 영상·박스는 이 탭에서만 연다. 탭을 벗어나면 언마운트되며 끊긴다 */}
      {isMockMode ? <AiDetectionCard signals={signals} /> : <LiveVideoCard />}

      <section className="section-container">
        <h3 className="section-title">센서</h3>
        <div className="card signal-card">
          {rows.map(({ Icon, label, value, active }) => (
            <div key={label} className="signal-row">
              <div className={`signal-icon ${connected && active ? 'active' : ''}`}>
                <Icon size={16} />
              </div>
              <span className="signal-label">{label}</span>
              <span className={`signal-value ${connected && active ? 'active' : ''}`}>
                {value}
              </span>
            </div>
          ))}
          <div className="signal-summary">{summaryText}</div>
        </div>
      </section>
    </>
  );
};
