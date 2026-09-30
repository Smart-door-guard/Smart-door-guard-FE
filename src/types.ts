// ============================================================
// 공통 열거형
// ============================================================

export type SystemState = 'UNKNOWN' | 'NORMAL' | 'WATCH' | 'WARNING' | 'INTRUSION';

/** missing 배열에 올 수 있는 값 — 계약서 4절, 3개뿐 */
export type MissingSignal = 'doorOpen' | 'shock' | 'person';

// ============================================================
// 센서 신호 (WebSocket signals 필드와 1:1 대응)
// null = "모른다". false나 0이 아니다.
// ============================================================
export interface Signals {
  connected: boolean;           // ESP32 TTL 이내 신호 수신 여부 — null 불가

  // ── null 가능 5개 ──────────────────────────────────────────
  // 카메라 없거나 분석 불가이면 null
  personCount: number | null;
  // 얼굴 인식 꺼져 있거나 카메라 없으면 null
  personRegistered: boolean | null;
  // 카메라 없거나 감지 불가이면 null
  personConfidence: number | null;
  // 센서 미연결 또는 캘리브레이션 없으면 null
  doorOpen: boolean | null;
  // 센서 미연결이면 null
  gapMm: number | null;
  // ──────────────────────────────────────────────────────────

  shockTimes: number[];         // 최근 60초 내 충격 시각 목록 — null 불가, 없으면 []
}

// ============================================================
// WebSocket 페이로드 — /ws/web 서버 발신 메시지
// ============================================================
export interface ServerPayload {
  systemState: SystemState;
  degraded: boolean;
  missing: MissingSignal[];
  controls: ControlsInfo;
  signals: Signals;
}

export interface ControlsInfo {
  available: boolean;
  reason: string;  // available=true이면 빈 문자열 ""
}

// ============================================================
// 조작 API 응답 — POST /api/web/control
// ============================================================
export type ControlAction = 'buzzer' | 'solenoid';

export interface ControlResponse {
  accepted: boolean;
  code: string;
  reason: string;
  commandId: string | null;
  controls: ControlsInfo;
  killSwitch: boolean;
  cooldownRemainingMs: number;
  busyRemainingMs: number;
}

/** 버튼 에러 표시용 — 서버 reason 문구를 그대로 사용 */
export interface ControlError {
  status: number;   // HTTP 상태 코드
  code: string;     // 계약서 5-2의 code 필드
  reason: string;   // 서버가 내려주는 한국어 사유
  retryAfterMs?: number;  // 429일 때만 존재 (Retry-After 헤더 × 1000)
}

// ============================================================
// 세션 — GET /api/web/session
// ============================================================
export interface SessionInfo {
  role: 'audience' | 'operator';
  tokenId: string;
  expiresAt: number;  // 밀리초 Unix 타임스탬프
}

// ============================================================
// 이벤트 이력 (로컬 세션 누적용)
// ============================================================
export interface EventLog {
  id: number;
  type: 'unknown' | 'normal' | 'watch' | 'warning' | 'intrusion';
  title: string;
  time: string;
}

// ============================================================
// 장치 설정 (로컬 UI 전용 — 서버 PATCH 미구현)
// ============================================================
export interface DeviceSettings {
  smsNumbers: string[];
  sensitivity: number;
  nightMode: boolean;
}

// ============================================================
// 푸시 알림
// ============================================================
export interface PushNotificationData {
  title: string;
  body: string;
  level?: 'intrusion' | 'warning' | 'info';
  // true면 자동으로 사라지지 않고 탭해야 닫힌다 (침입)
  sticky?: boolean;
  // 문자 알림 수신자 표시용 (설정의 smsNumbers)
  recipients?: string[];
}
