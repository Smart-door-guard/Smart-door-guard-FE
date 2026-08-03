import React from 'react';
import { Terminal, CheckCircle, UserCheck, AlertTriangle, Siren } from 'lucide-react';
import { SystemState } from '../types';

interface SimulatorPanelProps {
  onSetState: (state: SystemState) => void;
  logs: string[];
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({ onSetState, logs }) => {
  return (
    <div class="simulator-panel">
      <div class="sim-header">
        <Terminal class="green-icon" size={20} />
        <h4>스마트 가드 시뮬레이터</h4>
      </div>
      <p class="sim-desc">
        백엔드 서버 없이도 아래 버튼을 눌러 침입 및 상태 변화를 즉시 시뮬레이션할 수 있습니다.
      </p>

      <div class="sim-btn-grid">
        <button class="sim-btn sim-btn-normal" onClick={() => onSetState('NORMAL')}>
          <CheckCircle size={18} />
          <span>1. NORMAL (정상)</span>
        </button>
        <button class="sim-btn sim-btn-watch" onClick={() => onSetState('WATCH')}>
          <UserCheck size={18} />
          <span>2. WATCH (사람 감지)</span>
        </button>
        <button class="sim-btn sim-btn-warning" onClick={() => onSetState('WARNING')}>
          <AlertTriangle size={18} />
          <span>3. WARNING (문 열림)</span>
        </button>
        <button class="sim-btn sim-btn-intrusion" onClick={() => onSetState('INTRUSION')}>
          <Siren size={18} />
          <span>4. INTRUSION (침입 결박!)</span>
        </button>
      </div>

      <div class="sim-log-box">
        <div class="sim-log-header">시스템 로그 콘솔</div>
        <div class="sim-log-content">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
