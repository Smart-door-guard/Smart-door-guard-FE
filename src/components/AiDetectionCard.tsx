import React from 'react';
import { Cpu, Eye, User } from 'lucide-react';
import { SystemState } from '../types';

interface AiDetectionCardProps {
  systemState: SystemState;
}

export const AiDetectionCard: React.FC<AiDetectionCardProps> = ({ systemState }) => {
  const showBBox = systemState !== 'NORMAL';

  return (
    <section class="section-container">
      <div class="section-header-flex">
        <h3 class="section-title">AI 카메라 실시간 분석</h3>
        <span class="live-badge">
          <span class="red-dot"></span> LIVE
        </span>
      </div>

      <div class="card ai-card">
        <div class="ai-image-wrapper">
          <img src="/ai_snapshot.jpg" alt="AI CCTV Snapshot" />
          <div class={`bounding-box ${showBBox ? 'active' : ''}`}>
            <div class="bbox-label">
              <User size={12} />
              <span>PERSON (98.4%)</span>
            </div>
          </div>
        </div>
        <div class="ai-info-bar">
          <div class="ai-stat">
            <Cpu class="green-icon" size={16} />
            <span>추론 시간: <strong>42ms</strong></span>
          </div>
          <div class="ai-stat">
            <Eye class="green-icon" size={16} />
            <span>
              감지 객체: <strong>{showBBox ? '외부인 1명' : '없음'}</strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
