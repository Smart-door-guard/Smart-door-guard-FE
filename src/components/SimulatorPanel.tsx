import React from 'react';
import { Terminal, UserX, UserCheck, UserMinus, DoorOpen, Activity, WifiOff, RotateCcw } from 'lucide-react';
import { Signals } from '../types';

interface SimulatorPanelProps {
  signals: Signals;
  onPerson: (count: number, registered: boolean) => void;
  onToggleDoor: () => void;
  onShock: () => void;
  onToggleConnection: () => void;
  onReset: () => void;
  logs: string[];
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({
  signals,
  onPerson,
  onToggleDoor,
  onShock,
  onToggleConnection,
  onReset,
  logs,
}) => {
  return (
    <div class="simulator-panel">
      <div class="sim-header">
        <Terminal class="green-icon" size={20} />
        <h4>SafeGuard 시뮬레이터</h4>
      </div>
      <p class="sim-desc">
        센서·AI 신호를 하나씩 넣어보세요. 상태 판단 엔진이 여러 신호를 함께 확인해 단계를 정합니다.
      </p>

      <div class="sim-btn-grid">
        <button class="sim-btn sim-btn-watch" onClick={() => onPerson(1, false)}>
          <UserX size={18} />
          <span>미등록 인물</span>
        </button>
        <button class="sim-btn sim-btn-normal" onClick={() => onPerson(1, true)}>
          <UserCheck size={18} />
          <span>등록 인물</span>
        </button>
        <button class="sim-btn" onClick={() => onPerson(0, false)}>
          <UserMinus size={18} />
          <span>사람 사라짐</span>
        </button>
        <button class="sim-btn sim-btn-warning" onClick={onToggleDoor}>
          <DoorOpen size={18} />
          <span>{signals.doorOpen ? '문 닫힘' : '문 열림'}</span>
        </button>
        <button class="sim-btn sim-btn-intrusion" onClick={onShock}>
          <Activity size={18} />
          <span>충격 1회</span>
        </button>
        <button class="sim-btn" onClick={onToggleConnection}>
          <WifiOff size={18} />
          <span>{signals.connected ? '신호 끊김' : '신호 복구'}</span>
        </button>
        <button class="sim-btn" onClick={onReset}>
          <RotateCcw size={18} />
          <span>초기화</span>
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
