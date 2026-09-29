import React from 'react';
import { Activity, DoorOpen, Ruler, User } from 'lucide-react';
import { Signals } from '../types';
import { AiDetectionCard } from './AiDetectionCard';
import { SHOCK_REPEAT_COUNT, SHOCK_WINDOW_MS, recentShocks } from '../stateEngine';

// ─────────────────────────────────────────────────────────────
// 영상 소스 상수 — 나중에 프록시 경로가 생기면 여기만 바꾸면 된다
// 예: export const STREAM_URL = '/api/camera/stream';
// ─────────────────────────────────────────────────────────────
export const STREAM_URL: string | null = null; // null이면 스냅샷 이미지 사용

interface VideoPageProps {
  signals: Signals;
  now: number;
}

// null 가능 필드를 화면에 표시할 때 쓰는 헬퍼
// null = "모름", false나 0으로 대체하지 않는다
const nullableText = (
  value: string | number | boolean | null,
  format: (v: NonNullable<typeof value>) => string,
  unknownLabel = '모름',
): string => (value === null ? unknownLabel : format(value as NonNullable<typeof value>));

export const VideoPage: React.FC<VideoPageProps> = ({ signals, now }) => {
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
    '모름',
  );

  // 문틈 거리 표시
  const gapText = nullableText(signals.gapMm, (v) => `${v}mm`, '모름');

  // 사람 수 표시 — null은 "모름"
  const personText = !connected
    ? '—'
    : signals.personCount === null
      ? '모름'
      : signals.personCount === 0
        ? '없음'
        : `${signals.personCount}명 · ${
            signals.personRegistered === null
              ? '식별 불가'
              : signals.personRegistered
                ? '등록'
                : '미등록'
          }`;

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
    ? '신호가 들어오지 않아 판정할 수 없습니다'
    : anomalyCount === 0
      ? '이상 신호 없음'
      : `이상 신호 ${anomalyCount}건`;

  return (
    <>
      <AiDetectionCard signals={signals} />

      <section className="section-container">
        <h3 className="section-title">판단에 쓰이는 신호</h3>
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
        <p className="signal-note">
          상태 판정은 서버가 수행합니다. 이 화면은 현재 신호 값만 표시합니다.
        </p>
      </section>

      {/* bbox 오버레이 좌표 자리 — 나중에 /api/devices/{id}/detections/bboxes 연결 시 여기에 추가 */}
      {/* TODO: bbox REST API 경로 확정 후 AiDetectionCard에 좌표 prop 전달 */}
    </>
  );
};
