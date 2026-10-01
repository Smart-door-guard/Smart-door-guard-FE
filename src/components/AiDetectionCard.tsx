import React from 'react';
import { Eye, User, Film, ScanFace } from 'lucide-react';
import { Signals } from '../types';

export const SAMPLE_FPS = 4; // 입력 영상 3~5 FPS 샘플링

interface AiDetectionCardProps {
  signals: Signals;
}

export const AiDetectionCard: React.FC<AiDetectionCardProps> = ({ signals }) => {
  const connected = signals.connected;

  // personCount가 null이면 카메라 없음 — "모름"으로 표시
  const showBBox = connected && signals.personCount !== null && signals.personCount > 0;

  // personConfidence가 null이면 신뢰도 계산 불가
  const confidence =
    signals.personConfidence !== null
      ? (signals.personConfidence * 100).toFixed(1)
      : null;

  const faceText = !showBBox
    ? '—'
    : signals.personRegistered === null
      ? '식별 불가'
      : signals.personRegistered
        ? '등록 인물'
        : '미등록 인물';

  // bounding box label: 신뢰도 null이면 %를 표시하지 않음
  const bboxLabel =
    confidence !== null
      ? `PERSON (${confidence}%) · ${signals.personRegistered === null ? '식별 불가' : signals.personRegistered ? '등록' : '미등록'}`
      : `PERSON · ${signals.personRegistered === null ? '식별 불가' : signals.personRegistered ? '등록' : '미등록'}`;

  const personCountText =
    !signals.personCount
        ? '없음'
        : `사람 ${signals.personCount}명`;

  return (
    <section className="section-container">
      <div className="section-header-flex">
        <h3 className="section-title">현관 카메라 · AI 분석</h3>
        <span className={`live-badge ${connected ? '' : 'offline'}`}>
          <span className="red-dot"></span> {connected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      <div className="card ai-card">
        <div className="ai-image-wrapper">
          <img src="/ai_snapshot.jpg" alt="현관 카메라 영상" style={{ opacity: connected ? 1 : 0.3 }} />
          <div className={`bounding-box ${showBBox ? 'active' : ''} ${signals.personRegistered ? 'registered' : ''}`}>
            <div className="bbox-label">
              <User size={12} />
              <span>{bboxLabel}</span>
            </div>
          </div>
        </div>
        <div className="ai-info-bar">
          <div className="ai-stat">
            <Film className="green-icon" size={16} />
            <span>샘플링: <strong>{connected ? `${SAMPLE_FPS} FPS` : '—'}</strong></span>
          </div>
          <div className="ai-stat">
            <Eye className="green-icon" size={16} />
            <span>
              YOLO 검출: <strong>{connected ? personCountText : '—'}</strong>
            </span>
          </div>
          <div className="ai-stat">
            <ScanFace className="green-icon" size={16} />
            <span>얼굴: <strong>{connected ? faceText : '—'}</strong></span>
          </div>
        </div>
      </div>
    </section>
  );
};
