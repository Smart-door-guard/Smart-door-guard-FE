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

// 깨진 스트림 방어: FF D9 없이 이만큼 쌓이면 버린다
const MAX_BUFFER_BYTES = 2_000_000;

/**
 * img 에 MJPEG 을 그리기 시작한다. 반환된 stop() 을 반드시 호출해야 한다.
 * stop() 은 여러 번 불러도 안전하다.
 */
export function startMjpeg(img: HTMLImageElement, handlers: MjpegHandlers): () => void {
  const abort = new AbortController();
  let url: string | null = null;
  let stopped = false;

  const fail = (detail: string, code: StreamErrorCode) => {
    if (!stopped) handlers.onError(detail, code);
  };

  (async () => {
    const token = getToken();
    if (!token) { fail('토큰이 없습니다. QR 코드를 다시 스캔하십시오.', 'unauthorized'); return; }

    const res = await fetch('/api/web/stream', {
      headers: { Authorization: `Bearer ${token}` },
      signal: abort.signal,
      cache: 'no-store',
    });
    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({})) as { detail?: string; code?: string };
      const code: StreamErrorCode =
        res.status === 401 ? 'unauthorized'
        : body.code === 'camera_offline' || body.code === 'viewers_full' || body.code === 'upstream_error'
          ? body.code
          : 'error';
      fail(body.detail ?? `HTTP ${res.status}`, code);
      return;
    }

    const reader = res.body.getReader();
    let buf = new Uint8Array(0);
    for (;;) {
      const { value, done } = await reader.read();
      if (stopped) return;
      if (done) { fail('영상이 끊겼습니다.', 'ended'); return; }

      const next = new Uint8Array(buf.length + value.length);
      next.set(buf); next.set(value, buf.length); buf = next;

      // JPEG 는 FF D8 로 시작해서 FF D9 로 끝난다. 완성된 프레임만 그린다.
      for (;;) {
        const s = indexOfPair(buf, 0xff, 0xd8, 0);
        if (s < 0) { buf = buf.slice(-1); break; }
        const e = indexOfPair(buf, 0xff, 0xd9, s + 2);
        if (e < 0) { buf = buf.slice(s); break; }
        const blob = new Blob([buf.slice(s, e + 2)], { type: 'image/jpeg' });
        if (url) URL.revokeObjectURL(url);          // 메모리 누수 방지
        url = URL.createObjectURL(blob);
        img.src = url;
        buf = buf.slice(e + 2);
        handlers.onFrame?.();
      }
      if (buf.length > MAX_BUFFER_BYTES) buf = new Uint8Array(0);
    }
  })().catch((e: unknown) => {
    if ((e as { name?: string })?.name !== 'AbortError') fail('영상 연결 오류가 발생했습니다.', 'network');
  });

  return function stop() {
    if (stopped) return;
    stopped = true;
    abort.abort();          // 연결을 끊어야 서버가 시청 슬롯을 돌려준다
    if (url) { URL.revokeObjectURL(url); url = null; }
  };
}

function indexOfPair(b: Uint8Array, x: number, y: number, from: number): number {
  for (let i = from; i < b.length - 1; i++) if (b[i] === x && b[i + 1] === y) return i;
  return -1;
}
