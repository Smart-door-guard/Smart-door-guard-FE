/**
 * api/videoBoxes.ts — 인식 박스 (계약서 8-2, 8-3)
 *
 * 규칙:
 * - 좌표는 원본 프레임 픽셀 [x_min, y_min, x_max, y_max]. 416 기준이 아니다.
 * - 스케일 기준은 각 파트의 frame.width / frame.height. img.naturalWidth 를 쓰지 않는다.
 * - valid:false 이거나 ageMs + (받은 뒤 흐른 시간) > maxAgeMs 이면 그리지 않는다.
 * - 이름·ID 는 서버가 보내지 않는다. registered 만 쓴다.
 */

export interface BoxFrame {
  streamId: string;
  frameId: number;
  width: number;
  height: number;
  ageMs: number;
}

export interface PersonBox {
  bbox: [number, number, number, number];
  confidence: number;
}

export interface FaceBox {
  bbox: [number, number, number, number];
  registered: boolean | null;
  matchStatus?: string;
}

export interface BoxesPart<B> {
  valid: boolean;
  status: string;
  frame: BoxFrame | null;
  boxes: B[];
}

export interface BoxesMessage {
  type: 'boxes';
  coordinateSpace: 'pixel';
  bboxFormat: 'xyxy';
  maxAgeMs: number;
  people: BoxesPart<PersonBox>;
  faces: BoxesPart<FaceBox> & { enabled: boolean };
}

/** 소켓이 끊긴 것으로 보는 시간 — 서버는 최소 1초마다 보낸다 (계약서 8-3) */
export const BOXES_SILENCE_MS = 1500;

// 색 구분이 데모의 핵심이다 — 범례(LiveVideoCard)와 같은 값을 쓴다
export const BOX_COLORS = {
  person: '#FFC107',
  registered: '#4CAF50',
  unregistered: '#F44336',
  unknown: '#9E9E9E',
} as const;

export function faceColor(registered: boolean | null): string {
  return registered === true ? BOX_COLORS.registered
    : registered === false ? BOX_COLORS.unregistered
      : BOX_COLORS.unknown;
}

export function faceLabel(registered: boolean | null): string {
  return registered === true ? '등록' : registered === false ? '미등록' : '판정 불가';
}

/** 이 파트를 지금 그려도 되는가 (유효하고 오래되지 않았는가) */
export function isFresh(part: BoxesPart<unknown>, maxAgeMs: number, receivedAt: number, now: number): boolean {
  if (!part.valid || !part.frame) return false;
  if (now - receivedAt > BOXES_SILENCE_MS) return false;
  return part.frame.ageMs + (now - receivedAt) <= maxAgeMs;
}

/**
 * canvas 전체를 지우고 박스를 다시 그린다.
 * canvas 는 영상 <img>(object-fit: contain) 위에 같은 위치·크기로 겹쳐 있어야 한다.
 * msg 가 null 이면 지우기만 한다.
 */
export function drawBoxes(
  canvas: HTMLCanvasElement,
  msg: BoxesMessage | null,
  receivedAt: number,
  now: number,
): void {
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  const pxW = Math.round(cssW * dpr);
  const pxH = Math.round(cssH * dpr);
  // 크기가 바뀔 때만 버퍼를 다시 잡는다 (창 크기·회전 대응)
  if (canvas.width !== pxW || canvas.height !== pxH) {
    canvas.width = pxW;
    canvas.height = pxH;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  if (!msg || cssW === 0 || cssH === 0) return;

  // 사람: 노란 점선 · 얇게 / 얼굴: 등록 여부 색 · 실선 · 두껍게
  if (isFresh(msg.people, msg.maxAgeMs, receivedAt, now)) {
    const t = contain(msg.people.frame!, cssW, cssH);
    for (const b of msg.people.boxes) {
      drawOne(ctx, t, b.bbox, BOX_COLORS.person, `사람 ${Math.round(b.confidence * 100)}%`, {
        lineWidth: 2, dash: [6, 4], fill: false,
      });
    }
  }
  if (msg.faces.enabled && isFresh(msg.faces, msg.maxAgeMs, receivedAt, now)) {
    const t = contain(msg.faces.frame!, cssW, cssH);
    for (const b of msg.faces.boxes) {
      drawOne(ctx, t, b.bbox, faceColor(b.registered), `얼굴 · ${faceLabel(b.registered)}`, {
        lineWidth: 3, dash: [], fill: true,
      });
    }
  }
}

interface Transform { scale: number; dx: number; dy: number }

// object-fit: contain 기준 스케일과 여백 (계약서 8-3)
function contain(frame: BoxFrame, w: number, h: number): Transform {
  const scale = Math.min(w / frame.width, h / frame.height);
  return {
    scale,
    dx: (w - frame.width * scale) / 2,
    dy: (h - frame.height * scale) / 2,
  };
}

function drawOne(
  ctx: CanvasRenderingContext2D,
  t: Transform,
  bbox: [number, number, number, number],
  color: string,
  label: string,
  style: { lineWidth: number; dash: number[]; fill: boolean },
): void {
  const [x1, y1, x2, y2] = bbox;
  const x = t.dx + x1 * t.scale;
  const y = t.dy + y1 * t.scale;
  const w = (x2 - x1) * t.scale;
  const h = (y2 - y1) * t.scale;

  if (style.fill) {
    ctx.fillStyle = hexAlpha(color, 0.18);
    ctx.fillRect(x, y, w, h);
  }
  ctx.setLineDash(style.dash);
  ctx.lineWidth = style.lineWidth;
  ctx.strokeStyle = color;
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  // 라벨: 박스 위쪽, 공간이 없으면 박스 안쪽 위
  ctx.font = '700 11px system-ui, -apple-system, sans-serif';
  const padX = 4;
  const labelH = 16;
  const textW = ctx.measureText(label).width + padX * 2;
  const ly = y - labelH >= 0 ? y - labelH : y;
  ctx.fillStyle = color;
  ctx.fillRect(x, ly, textW, labelH);
  ctx.fillStyle = color === BOX_COLORS.person ? '#000000' : '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + padX, ly + labelH / 2);
}

function hexAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
