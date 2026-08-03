import React from 'react';
import { Lock, Compass } from 'lucide-react';

interface QuickControlsProps {
  isLocked: boolean;
  doorAngle: number;
  onToggleLock: () => void;
  onChangeAngle: (angle: number) => void;
}

export const QuickControls: React.FC<QuickControlsProps> = ({
  isLocked,
  doorAngle,
  onToggleLock,
  onChangeAngle,
}) => {
  const angles = [15, 30, 45, 60];

  return (
    <section class="section-container">
      <h3 class="section-title">빠른 제어</h3>
      <div class="quick-grid">
        <button class="quick-card" onClick={onToggleLock}>
          <div class={`quick-icon-wrapper ${isLocked ? 'active' : ''}`}>
            <Lock size={20} />
          </div>
          <div class="quick-info">
            <span class="quick-title">비상 결박 제어</span>
            <span class="quick-status">
              {isLocked ? '강철 암이 문을 결박함' : '터치하여 즉시 결박'}
            </span>
          </div>
          <div class={`toggle-switch ${isLocked ? 'active' : ''}`}>
            <div class="toggle-handle" />
          </div>
        </button>

        <div class="quick-card angle-card">
          <div class="quick-card-header">
            <div class="quick-icon-wrapper green-bg">
              <Compass size={20} />
            </div>
            <div style={{ marginLeft: 16 }}>
              <span class="quick-title">안전 개방 각도</span>
              <span class="quick-status">현재 {doorAngle}° 설정</span>
            </div>
          </div>
          <div class="angle-presets">
            {angles.map((ang) => (
              <button
                key={ang}
                class={`preset-chip ${doorAngle === ang ? 'active' : ''}`}
                onClick={() => onChangeAngle(ang)}
              >
                {ang}°
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
