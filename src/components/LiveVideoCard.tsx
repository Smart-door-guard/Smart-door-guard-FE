import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, ScanFace, Wifi } from 'lucide-react';
import { startMjpeg, type StreamErrorCode } from '../api/mjpeg';
import { useWebSocket, type WsStatus } from '../api/wsClient';
import {
  BOXES_SILENCE_MS, BOX_COLORS, drawBoxes, isFresh, type BoxesMessage,
} from '../api/videoBoxes';

/**
 * 영상 탭 전용 실시간 영상 + 인식 박스 (계약서 8절)
 *
 * - 이 컴포넌트가 마운트돼 있는 동안만 스트림(/api/web/stream)과 박스 소켓(/ws/web/video)을 연다.
 *   탭을 벗어나면 언마운트되며 둘 다 끊는다. 홈 화면에는 절대 붙이지 않는다 (시청 슬롯 3개).
 * - 페이지가 숨겨지거나(pagehide / visibilityState hidden) 이탈하면 즉시 끊고, 돌아오면 다시 연다.
 */

const FALLBACK_SRC = '/ai_snapshot.jpg';
// 이 시간 넘게 새 프레임이 없으면 멈춘 것으로 보고 박스를 지우고 다시 연결한다
const FRAME_STALE_MS = 6000;
const FRAME_STALL_RESTART_MS = 15000;
const REDRAW_INTERVAL_MS = 200;

type StreamPhase =
  | { kind: 'connecting' }
  | { kind: 'live' }
  | { kind: 'error'; code: StreamErrorCode; detail: string; retryMs: number | null };

// 코드별 제목과 재시도 간격 (계약서 8-1 표)
const ERROR_INFO: Record<StreamErrorCode, { title: string; retryMs: number | null }> = {
  viewers_full:   { title: '동시 시청 인원이 가득 찼습니다', retryMs: 10_000 },
  camera_offline: { title: '카메라가 연결되어 있지 않습니다', retryMs: 5_000 },
  upstream_error: { title: '영상 서버에 연결하지 못했습니다', retryMs: 5_000 },
  ended:          { title: '영상이 끊겼습니다', retryMs: 3_000 },
  network:        { title: '네트워크 오류로 영상을 받지 못했습니다', retryMs: 5_000 },
  error:          { title: '영상을 불러오지 못했습니다', retryMs: 5_000 },
  unauthorized:   { title: 'QR을 다시 스캔하세요', retryMs: null },
};

const ANALYSIS_STATUS_TEXT: Record<string, string> = {
  not_configured: '미설정',
  waiting_for_camera: '카메라 대기',
  waiting: '분석 대기',
  loading: '모델 로딩 중',
  stale: '결과 지연',
  error: '분석 오류',
};

interface Summary {
  people: string;
  faces: string;
}

const EMPTY_SUMMARY: Summary = { people: '—', faces: '—' };

function summarize(msg: BoxesMessage | null, receivedAt: number, now: number): Summary {
  if (!msg) return EMPTY_SUMMARY;
  const people = isFresh(msg.people, msg.maxAgeMs, receivedAt, now)
    ? (msg.people.boxes.length === 0 ? '없음' : `${msg.people.boxes.length}명`)
    : ANALYSIS_STATUS_TEXT[msg.people.status] ?? '—';
  let faces: string;
  if (!msg.faces.enabled) {
    faces = '꺼짐';
  } else if (!isFresh(msg.faces, msg.maxAgeMs, receivedAt, now)) {
    faces = ANALYSIS_STATUS_TEXT[msg.faces.status] ?? '—';
  } else if (msg.faces.boxes.length === 0) {
    faces = '없음';
  } else {
    const reg = msg.faces.boxes.filter((b) => b.registered === true).length;
    const unreg = msg.faces.boxes.filter((b) => b.registered === false).length;
    const unk = msg.faces.boxes.length - reg - unreg;
    faces = [reg && `등록 ${reg}`, unreg && `미등록 ${unreg}`, unk && `판정 불가 ${unk}`]
      .filter(Boolean).join(' · ');
  }
  return { people, faces };
}

function usePageActive(): boolean {
  const [active, setActive] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const onVisibility = () => setActive(document.visibilityState === 'visible');
    const onHide = () => setActive(false);
    const onShow = () => setActive(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('pageshow', onShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('pageshow', onShow);
    };
  }, []);
  return active;
}

export const LiveVideoCard: React.FC = () => {
  const pageActive = usePageActive();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── 영상 스트림 ─────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<StreamPhase>({ kind: 'connecting' });
  const [attempt, setAttempt] = useState(0);
  const lastFrameAtRef = useRef(0);
  const liveRef = useRef(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!pageActive || !img) return;

    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    liveRef.current = false;
    lastFrameAtRef.current = 0;
    setPhase({ kind: 'connecting' });

    // onError 는 startMjpeg 안에서 동기로 불릴 수도 있다 (토큰 없음) — let 으로 받는다
    let stop: (() => void) | null = null;
    let failed = false;
    stop = startMjpeg(img, {
      onFrame: () => {
        lastFrameAtRef.current = Date.now();
        if (!liveRef.current) {
          liveRef.current = true;
          setPhase({ kind: 'live' });
        }
      },
      onError: (detail, code) => {
        liveRef.current = false;
        failed = true;
        stop?.();   // blob URL 해제 + 연결 확실히 종료
        const { retryMs } = ERROR_INFO[code];
        setPhase({ kind: 'error', code, detail, retryMs });
        if (retryMs !== null) {
          retryTimer = setTimeout(() => setAttempt((a) => a + 1), retryMs);
        }
      },
    });
    if (failed) stop();

    // 끝나지는 않았는데 프레임이 멈춘 경우 (터널 버퍼링 등) — 끊고 다시 연다
    const stallTimer = setInterval(() => {
      if (liveRef.current && Date.now() - lastFrameAtRef.current > FRAME_STALL_RESTART_MS) {
        setAttempt((a) => a + 1);
      }
    }, 1000);

    return () => {
      stop?.();
      liveRef.current = false;
      clearInterval(stallTimer);
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, [pageActive, attempt]);

  // ── 인식 박스 ───────────────────────────────────────────────────────────
  const boxesRef = useRef<{ msg: BoxesMessage | null; receivedAt: number }>({ msg: null, receivedAt: 0 });
  const [boxStatus, setBoxStatus] = useState<WsStatus>('connecting');
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const now = Date.now();
    const { msg, receivedAt } = boxesRef.current;
    // 영상이 멈췄거나 폴백 이미지일 때는 박스를 그리지 않는다
    const videoFresh = liveRef.current && now - lastFrameAtRef.current <= FRAME_STALE_MS;
    drawBoxes(canvas, videoFresh ? msg : null, receivedAt, now);

    const next = summarize(msg, receivedAt, now);
    setSummary((prev) => (prev.people === next.people && prev.faces === next.faces ? prev : next));
  }, []);

  const clearBoxes = useCallback(() => {
    boxesRef.current = { msg: null, receivedAt: 0 };
    redraw();
  }, [redraw]);

  useWebSocket<BoxesMessage>({
    path: '/ws/web/video',
    messageTimeoutMs: BOXES_SILENCE_MS,
    enabled: pageActive,
    onMessage: (msg) => {
      if (msg?.type !== 'boxes') return;
      boxesRef.current = { msg, receivedAt: Date.now() };
      redraw();
    },
    onStatusChange: (s) => {
      setBoxStatus(s);
      if (s !== 'connected') clearBoxes();
    },
    onTimeout: clearBoxes,
  });

  useEffect(() => {
    if (!pageActive) clearBoxes();
  }, [pageActive, clearBoxes]);

  // 오래된 박스를 지우기 위한 주기적 재그리기 + 창 크기/회전 대응
  useEffect(() => {
    const timer = setInterval(redraw, REDRAW_INTERVAL_MS);
    const ro = new ResizeObserver(redraw);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    window.addEventListener('orientationchange', redraw);
    return () => {
      clearInterval(timer);
      ro.disconnect();
      window.removeEventListener('orientationchange', redraw);
    };
  }, [redraw]);

  // 첫 프레임이 들어오거나 끊길 때 즉시 반영
  useEffect(() => { redraw(); }, [phase, redraw]);

  const live = phase.kind === 'live';
  const badge = live ? 'LIVE' : phase.kind === 'connecting' ? '연결 중' : 'OFFLINE';

  return (
    <section className="section-container">
      <div className="section-header-flex">
        <h3 className="section-title">현관 카메라 · 실시간</h3>
        <span className={`live-badge ${live ? '' : 'offline'}`}>
          <span className="red-dot"></span> {badge}
        </span>
      </div>

      <div className="card ai-card">
        <div className="live-video-wrapper" ref={wrapperRef}>
          {/* 폴백: 실시간 영상이 없을 때 정지 이미지 */}
          {!live && <img className="live-video-fallback" src={FALLBACK_SRC} alt="현관 카메라 정지 이미지" />}
          {/* 실시간: src 는 startMjpeg 가 blob URL 로 채운다 */}
          <img
            ref={imgRef}
            className="live-video-img"
            alt="현관 카메라 실시간 영상"
            style={{ visibility: live ? 'visible' : 'hidden' }}
          />
          <canvas ref={canvasRef} className="live-video-canvas" aria-hidden="true" />

          {phase.kind === 'connecting' && (
            <div className="live-video-overlay">영상 연결 중…</div>
          )}
          {phase.kind === 'error' && (
            <div className="live-video-overlay error">
              <strong>{ERROR_INFO[phase.code].title}</strong>
              {phase.detail && <span>{phase.detail}</span>}
              <span className="live-video-retry">
                {phase.retryMs !== null ? '다시 연결하는 중…' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="box-legend">
          <span><i className="legend-swatch dashed" style={{ borderColor: BOX_COLORS.person }} />사람</span>
          <span><i className="legend-swatch" style={{ borderColor: BOX_COLORS.registered }} />등록 얼굴</span>
          <span><i className="legend-swatch" style={{ borderColor: BOX_COLORS.unregistered }} />미등록 얼굴</span>
          <span><i className="legend-swatch" style={{ borderColor: BOX_COLORS.unknown }} />판정 불가</span>
        </div>

        <div className="ai-info-bar">
          <div className="ai-stat">
            <Eye className="green-icon" size={16} />
            <span>사람: <strong>{summary.people}</strong></span>
          </div>
          <div className="ai-stat">
            <ScanFace className="green-icon" size={16} />
            <span>얼굴: <strong>{summary.faces}</strong></span>
          </div>
          <div className="ai-stat">
            <Wifi className="green-icon" size={16} />
            <span>박스: <strong>{boxStatus === 'connected' ? '수신 중' : boxStatus === 'auth_failed' ? '인증 실패' : '끊김'}</strong></span>
          </div>
        </div>
      </div>
    </section>
  );
};
