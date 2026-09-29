/**
 * api/wsClient.ts — WebSocket 훅
 *
 * 규칙:
 * - 경로 /ws/web
 * - 연결 후 5초 이내에 {"token": "..."} 전송. 안 보내면 서버가 끊는다.
 * - 200ms마다 메시지가 온다. 3초 넘게 없으면 끊긴 것으로 간주 → UNKNOWN.
 * - 끊기면 지수 백오프로 재연결 (1s → 2s → 4s → … → 최대 30s).
 * - close code 1008: 인증 실패 → 재연결하지 않고 에러 콜백 호출.
 * - close code 1013: 연결 수 상한 → 잠시 후 재시도.
 * - 실서버 모드에서만 사용한다. 목 모드에서는 이 훅을 쓰지 않는다.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { ServerPayload } from '../types';
import { getToken } from './client';

// 서버 상수와 맞춘다 (계약서 2절)
const HELLO_TIMEOUT_S = 5;        // 5초 이내 hello 전송
const MESSAGE_TIMEOUT_MS = 3000;  // 3초 넘게 메시지 없으면 UNKNOWN
const BACKOFF_INITIAL_MS = 1000;
const BACKOFF_MAX_MS = 30_000;

export type WsStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'auth_failed'   // 1008: 토큰 만료/무효
  | 'capacity';     // 1013: 연결 수 상한

interface UseWebSocketOptions {
  /** 새 페이로드가 도착했을 때 */
  onMessage: (payload: ServerPayload) => void;
  /** 연결 상태가 바뀔 때 */
  onStatusChange: (status: WsStatus) => void;
  /** 3초 타임아웃으로 연결이 끊겼을 때 */
  onTimeout: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): void {
  const { onMessage, onStatusChange, onTimeout } = options;

  // ref로 관리해서 stale closure 문제를 피한다
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef<number>(BACKOFF_INITIAL_MS);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef<boolean>(false);

  // 콜백 ref — effect 재실행 없이 최신 콜백을 참조한다
  const onMessageRef = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

  const clearMessageTimeout = useCallback(() => {
    if (messageTimeoutRef.current !== null) {
      clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null;
    }
  }, []);

  const resetMessageTimeout = useCallback(() => {
    clearMessageTimeout();
    messageTimeoutRef.current = setTimeout(() => {
      // 3초 동안 메시지가 없음 → 끊긴 것으로 간주
      onTimeoutRef.current();
      onStatusChangeRef.current('disconnected');
      // 소켓을 강제로 닫아서 재연결을 트리거한다
      if (wsRef.current) {
        wsRef.current.close();
      }
    }, MESSAGE_TIMEOUT_MS);
  }, [clearMessageTimeout]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    const token = getToken();
    if (!token) {
      // 토큰 없으면 연결하지 않는다. 목 모드로 폴백하지 않는다.
      onStatusChangeRef.current('auth_failed');
      return;
    }

    onStatusChangeRef.current('connecting');

    // ws:// vs wss:// — location.protocol에 맞춘다
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${location.host}/ws/web`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    // 연결 후 HELLO_TIMEOUT_S 이내에 token 전송
    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return; }
      try {
        ws.send(JSON.stringify({ token }));
      } catch {
        ws.close();
        return;
      }
      // hello 전송 성공 — 아직 connected는 아니다. 첫 메시지 오면 connected.
      resetMessageTimeout();
    };

    ws.onmessage = (event) => {
      if (unmountedRef.current) return;

      // 메시지 수신 → 타임아웃 리셋
      resetMessageTimeout();

      // 첫 메시지 수신 시 connected 상태로
      onStatusChangeRef.current('connected');
      backoffRef.current = BACKOFF_INITIAL_MS; // 백오프 리셋

      let payload: ServerPayload;
      try {
        payload = JSON.parse(event.data) as ServerPayload;
      } catch {
        // JSON 파싱 실패는 무시 (서버 버그)
        return;
      }

      onMessageRef.current(payload);
    };

    ws.onclose = (event) => {
      clearMessageTimeout();
      wsRef.current = null;

      if (unmountedRef.current) return;

      if (event.code === 1008) {
        // 인증 실패 — 재연결하지 않는다. 토큰이 만료됐을 수 있다.
        onStatusChangeRef.current('auth_failed');
        return;
      }

      if (event.code === 1013) {
        // 연결 수 상한 — 백오프 후 재연결
        onStatusChangeRef.current('capacity');
        scheduleReconnect();
        return;
      }

      // 그 외: 정상/비정상 종료 모두 재연결 시도
      onStatusChangeRef.current('disconnected');
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onerror 다음에 onclose가 반드시 온다. 여기서는 아무것도 안 해도 된다.
    };
  }, [clearMessageTimeout, resetMessageTimeout, clearReconnectTimer]);

  const scheduleReconnect = useCallback(() => {
    if (unmountedRef.current) return;
    clearReconnectTimer();

    const delay = backoffRef.current;
    backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAX_MS);

    reconnectTimerRef.current = setTimeout(() => {
      if (!unmountedRef.current) connect();
    }, delay);
  }, [clearReconnectTimer, connect]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      clearReconnectTimer();
      clearMessageTimeout();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // connect는 useCallback으로 안정적이지만, 최초 마운트에만 실행한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// HELLO_TIMEOUT_S를 외부에서 참조할 필요가 있을 경우를 위해 export
export { HELLO_TIMEOUT_S };
