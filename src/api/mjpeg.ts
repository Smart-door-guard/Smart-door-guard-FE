/**
 * api/mjpeg.ts — 관객용 영상 스트림 (계약서 8-1)
 *
 * 규칙:
 * - GET /api/web/stream 은 Authorization 헤더가 필요하다.
 *   <img src> 로는 헤더를 못 보내고, 토큰을 URL 에 넣는 것은 금지다 (터널 로그에 남는다).
 *   → fetch() 로 받아서 JPEG 경계(FF D8 … FF D9)를 직접 잘라 blob URL 로 그린다.
 * - start 한 쪽이 반드시 stop() 을 부른다. 안 부르면 시청 슬롯(기본 3개)이 안 풀린다.
 * - 프레임마다 만든 blob URL 은 다음 프레임에서 해제한다. 안 하면 메모리가 계속 쌓인다.
 */

import { getToken } from './client';

export type StreamErrorCode =
  | 'unauthorized'     // 401 — 토큰 없음/만료/폐기
  | 'camera_offline'   // 503
  | 'viewers_full'     // 503
  | 'upstream_error'   // 503
  | 'ended'            // 응답 본문이 정상 종료됨 (카메라 끊김, 토큰 폐기 등)
  | 'network'          // fetch/read 자체 실패
  | 'error';           // 그 외 HTTP 오류

export interface MjpegHandlers {
  /** 새 프레임이 img 에 들어갔을 때 (첫 프레임 = 영상 시작) */
  onFrame?: () => void;
  /** 스트림이 실패하거나 끝났을 때. detail 은 서버가 준 한국어 문장이면 그대로 온다 */
  onError: (detail: string, code: StreamErrorCode) => void;
}

/**
 * img 에 MJPEG 을 그리기 시작한다. 반환된 stop() 을 반드시 호출해야 한다.
 * stop() 은 여러 번 불러도 안전하다.
 */
export function startMjpeg(img: HTMLImageElement, handlers: MjpegHandlers): () => void {
  // Polls the latest frame instead of holding one long streaming response: mobile Safari
  // drops long streams through the tunnel, while short requests survive a weak network.
  const abort = new AbortController();
  let url: string | null = null;
  let stopped = false;
  let lastId: string | null = null;
  let failingSince: number | null = null;

  const fail = (detail: string, code: StreamErrorCode) => {
    if (!stopped) handlers.onError(detail, code);
  };

  (async () => {
    const token = getToken();
    if (!token) { fail('토큰이 없습니다. QR 코드를 다시 스캔하십시오.', 'unauthorized'); return; }
    while (!stopped) {
      const started = Date.now();
      try {
        const res = await fetch(`/api/web/snapshot${lastId ? `?after=${lastId}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abort.signal,
          cache: 'no-store',
        });
        if (stopped) return;
        if (res.status === 401) { fail('QR을 다시 스캔하세요', 'unauthorized'); return; }
        if (res.status === 200) {
          lastId = res.headers.get('X-Frame-Id');
          const blob = await res.blob();
          if (stopped) return;
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(blob);
          img.src = url;
          handlers.onFrame?.();
          failingSince = null;
        } else if (res.status === 304) {
          failingSince = null;
        } else {
          failingSince ??= Date.now();
        }
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') return;
        failingSince ??= Date.now();
      }
      // Only report after a sustained outage; single failed polls are just retried.
      if (failingSince !== null && Date.now() - failingSince > 15_000) {
        fail('카메라 연결을 기다리는 중', 'camera_offline');
        return;
      }
      // The server long-polls (answers when a new frame lands), so loop right away;
      // only back off after an error.
      await new Promise((r) => setTimeout(r, failingSince !== null ? 1000 : Math.max(0, 100 - (Date.now() - started))));
    }
  })();

  return function stop() {
    if (stopped) return;
    stopped = true;
    abort.abort();
    if (url) { URL.revokeObjectURL(url); url = null; }
  };
}

