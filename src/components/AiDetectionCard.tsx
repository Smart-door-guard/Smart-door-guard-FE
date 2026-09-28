import React from 'react';
import { Eye, User, Film, ScanFace } from 'lucide-react';
import { Signals } from '../types';

export const SAMPLE_FPS = 4; // 입력 영상 3~5 FPS 샘플링

interface AiDetectionCardProps {
  signals: Signals;
}

export const AiDetectionCard: React.FC<AiDetectionCardProps> = ({ signals }) => {
  const connected = signals.connected;
  const showBBox = connected && signals.personCount > 0;
  const confidence = (signals.personConfidence * 100).toFixed(1);
  const faceText = !showBBox ? '—' : signals.personRegistered ? '등록 인물' : '미등록 인물';

  return (
    <section class="section-container">
      <div class="section-header-flex">
        <h3 class="section-title">현관 카메라 · AI 분석</h3>
        <span class={`live-badge ${connected ? '' : 'offline'}`}>
          <span class="red-dot"></span> {connected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>

      <div class="card ai-card">
        <div class="ai-image-wrapper">
          <img src="/ai_snapshot.jpg" alt="현관 카메라 영상" style={{ opacity: connected ? 1 : 0.3 }} />
          <div class={`bounding-box ${showBBox ? 'active' : ''} ${signals.personRegistered ? 'registered' : ''}`}>
            <div class="bbox-label">
              <User size={12} />
              <span>PERSON ({confidence}%) · {signals.personRegistered ? '등록' : '미등록'}</span>
            </div>
          </div>
        </div>
        <div class="ai-info-bar">
          <div class="ai-stat">
            <Film class="green-icon" size={16} />
            <span>샘플링: <strong>{connected ? `${SAMPLE_FPS} FPS` : '—'}</strong></span>
          </div>
          <div class="ai-stat">
            <Eye class="green-icon" size={16} />
            <span>
              YOLO 검출: <strong>{showBBox ? `사람 ${signals.personCount}명` : '없음'}</strong>
            </span>
          </div>
          <div class="ai-stat">
            <ScanFace class="green-icon" size={16} />
            <span>얼굴: <strong>{faceText}</strong></span>
          </div>
        </div>
      </div>
    </section>
  );
};
