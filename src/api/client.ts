/**
 * api/client.ts — HTTP fetch 래퍼
 *
 * 규칙:
 * - 모든 경로는 상대경로. 터널 주소를 코드에 박지 않는다.
 * - 토큰은 메모리에만 보관한다. localStorage 금지.
 * - 응답을 한 곳에서 정규화한다.
 * - 에러 코드·reason을 ControlError 형태로 정규화해서 던진다.
 */

import type {
  ControlAction,
  ControlError,
  ControlResponse,
  SessionInfo,
} from "../types";

// ── 토큰 저장소 (모듈 레벨 변수 — 메모리에만) ─────────────────────────
let _token: string | null = null;

export function setToken(token: string): void {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}

export function clearToken(): void {
  _token = null;
}

export function hasToken(): boolean {
  return _token !== null && _token.length > 0;
}

// ── 내부 fetch 헬퍼 ──────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }
  return headers;
}

/**
 * 공통 fetch.
 * 성공(2xx) → T 반환.
 * 실패 → ControlError를 throw.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers ?? {}),
      },
    });
  } catch (networkErr) {
    // 네트워크 자체가 끊긴 경우
    throw {
      status: 0,
      code: "network_error",
      reason: "네트워크에 연결할 수 없습니다.",
    } satisfies ControlError;
  }

  if (response.ok) {
    // 응답 바디가 없을 수도 있다 (204 No Content 등)
    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  // ── 에러 응답 정규화 ────────────────────────────────────────────────
  let body: Partial<ControlResponse> = {};
  try {
    body = await response.json();
  } catch {
    // JSON 파싱 실패 시 빈 객체
  }

  // 429: Retry-After 헤더 읽기
  let retryAfterMs: number | undefined;
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
      retryAfterMs = parseFloat(retryAfter) * 1000;
    } else if (body.cooldownRemainingMs) {
      retryAfterMs = body.cooldownRemainingMs;
    }
  }

  // 401: 계약서 1절 — detail 필드에 한국어 문구
  if (response.status === 401) {
    const detail = (body as Record<string, unknown>)?.detail as
      | string
      | undefined;
    throw {
      status: 401,
      code: "unauthorized",
      reason: detail ?? "토큰이 유효하지 않거나 만료되었습니다.",
    } satisfies ControlError;
  }

  throw {
    status: response.status,
    code: body.code ?? "error",
    reason: body.reason ?? `오류가 발생했습니다. (HTTP ${response.status})`,
    ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
  } satisfies ControlError;
}

// ── 공개 API ─────────────────────────────────────────────────────────────

/**
 * 세션 확인 — GET /api/web/session
 * 토큰이 유효한지, 역할이 무엇인지 확인한다.
 */
export async function fetchSession(): Promise<SessionInfo> {
  return apiFetch<SessionInfo>("/api/web/session");
}

/**
 * 버튼 조작 — POST /api/web/control
 *
 * 주의: action과 durationMs 이외의 필드를 보내면 422가 난다.
 * 각도 같은 추가 필드를 절대 넣지 마라.
 */
export async function postControl(
  action: ControlAction,
  durationMs: number = 200,
): Promise<ControlResponse> {
  return apiFetch<ControlResponse>("/api/web/control", {
    method: "POST",
    body: JSON.stringify({ action, durationMs }),
  });
}

export interface CommandState {
  commandId: string;
  action: ControlAction;
  status:
    | "pending"
    | "executed"
    | "completed"
    | "rejected"
    | "timeout"
    | "unknown";
  reason: string;
  outputActive: boolean | null;
  outputValid: boolean;
}
export async function waitForCommand(
  id: string,
  progress: (state: CommandState) => void,
): Promise<void> {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const state = await apiFetch<CommandState>(
      `/api/web/commands/${encodeURIComponent(id)}`,
    );
    progress(state);
    if (state.status === "completed") return;
    if (["rejected", "timeout", "unknown"].includes(state.status)) {
      throw {
        reason:
          state.status === "rejected"
            ? `장치 거절: ${state.reason}`
            : "실행 또는 종료 확인 불가. 실제 출력 상태를 확인하세요.",
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw {
    reason:
      "출력 종료 확인 시간이 지났습니다. 실행되지 않았다는 뜻은 아닙니다.",
  };
}
export interface ServerEvent {
  id: number;
  at: string;
  kind: string;
  type: "normal" | "watch" | "warning" | "intrusion" | "unknown";
  title: string;
}
export function fetchEvents(before?: number) {
  return apiFetch<{ items: ServerEvent[]; nextCursor: number | null }>(
    `/api/web/events?limit=100${before ? `&before=${before}` : ""}`,
  );
}
export interface TuningView {
  current: {
    shockThresholdMps2: number;
    shockDistanceDeltaMm: number;
    shockCount: number;
    shockWindowMs: number;
    autoAction: ControlAction;
    autoDurationMs: number;
  };
  defaults: Record<string, unknown>;
  changed: string[];
}
export const fetchTuning = () => apiFetch<TuningView>("/api/web/settings");
export const saveTuning = (current: TuningView["current"]) =>
  apiFetch<TuningView>("/api/web/settings", {
    method: "PATCH",
    body: JSON.stringify(current),
  });
export interface OutputStatus {
  valid: boolean;
  local_automation_enabled: boolean | null;
  local_actuations?: number | null;
  local_buzzer_enabled?: boolean | null;
  solenoid: { active: boolean | null; activation_count: number | null };
  buzzer: { active: boolean | null; activation_count: number | null };
}
export const fetchOutputs = () => apiFetch<OutputStatus>("/api/web/actuators");

export interface DoorStatus {
  raw: number | null;
  door_open: boolean | null;
  calibrated: boolean;
  closed_level: number | null;
  pending_observations: string[];
}
export interface SensorDiagnostics {
  connected: boolean;
  mpu6050: { shock_peak_mps2: number | null };
  vl53l0x: { distance_mm: number | null };
  errors: string[] | null;
  shock_detection: {
    valid: boolean; algorithm: string; event_count: number; distance_delta_mm: number;
    accel_threshold_mps2: number; distance_threshold_mm: number; coincidence_ms: number;
  } | null;
}
export const fetchSensors = () => apiFetch<SensorDiagnostics>('/api/web/sensors');
export const fetchDoor = () => apiFetch<DoorStatus>('/api/web/door');
export const calibrateDoor = (state: 'open' | 'closed') => apiFetch<DoorStatus>('/api/web/door/calibration', {
  method: 'POST', body: JSON.stringify({observed_state: state}),
});
export const resetDoorCalibration = () => apiFetch<DoorStatus>('/api/web/door/calibration', {method: 'DELETE'});
