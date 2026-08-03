import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Lock, DoorClosed } from 'lucide-react';
import { SystemState } from '../types';

interface StatusCardProps {
  systemState: SystemState;
  isLocked: boolean;
  doorOpen: boolean;
  doorAngle: number;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  systemState,
  isLocked,
  doorOpen,
  doorAngle,
}) => {
  const getStrokeDashOffset = () => {
    const totalDash = 534;
    switch (systemState) {
      case 'NORMAL': return 0;
      case 'WATCH': return totalDash * 0.35;
      case 'WARNING': return totalDash * 0.65;
      case 'INTRUSION': return totalDash * 0.95;
    }
  };

  const getStrokeColor = () => {
    switch (systemState) {
      case 'NORMAL': return '#10B981';
      case 'WATCH': return '#F59E0B';
      case 'WARNING': return '#EA580C';
      case 'INTRUSION': return '#E11D48';
    }
  };

  const renderStateInfo = () => {
    switch (systemState) {
      case 'NORMAL':
        return {
          title: '안전 상태 (NORMAL)',
          pillText: '정상 감시 중',
          pillClass: 'state-normal',
          gaugeText: '정상',
          subText: '침입/이상 없음',
          bg: 'linear-gradient(145deg, #FFFFFF 0%, #F0FDF4 100%)',
          iconBg: '#ECFDF5',
          iconColor: '#10B981',
          Icon: ShieldCheck,
        };
      case 'WATCH':
        return {
          title: '주의 상태 (WATCH)',
          pillText: '외부인 접근 감지',
          pillClass: 'state-watch',
          gaugeText: '감시 중',
          subText: '카메라 사람 감지',
          bg: 'linear-gradient(145deg, #FFFFFF 0%, #FFFBEB 100%)',
          iconBg: '#FEF3C7',
          iconColor: '#F59E0B',
          Icon: ShieldAlert,
        };
      case 'WARNING':
        return {
          title: '경고 상태 (WARNING)',
          pillText: '열림 + 접근 중',
          pillClass: 'state-warning',
          gaugeText: '경고',
          subText: '미확인 문 열림!',
          bg: 'linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 100%)',
          iconBg: '#FFEDD5',
          iconColor: '#EA580C',
          Icon: AlertTriangle,
        };
      case 'INTRUSION':
        return {
          title: '침입 심각 (INTRUSION)',
          pillText: '비상 결박 작동!',
          pillClass: 'state-intrusion',
          gaugeText: '침입 발생!',
          subText: '자동 강철 암 결박 실행',
          bg: 'linear-gradient(145deg, #FFFFFF 0%, #FFF1F2 100%)',
          iconBg: '#FFE4E6',
          iconColor: '#E11D48',
          Icon: ShieldAlert,
        };
    }
  };

  const info = renderStateInfo();
  const StateIcon = info.Icon;

  return (
    <section class="card status-card" style={{ background: info.bg }}>
      <div class="card-header">
        <div>
          <span class="card-subtitle">SYSTEM STATUS</span>
          <h2 class="card-title">{info.title}</h2>
        </div>
        <span class={`status-pill ${info.pillClass}`}>{info.pillText}</span>
      </div>

      <div class="gauge-container">
        <svg class="gauge-svg" viewBox="0 0 200 200">
          <circle class="gauge-bg" cx="100" cy="100" r="85" />
          <circle
            class="gauge-progress"
            cx="100"
            cy="100"
            r="85"
            style={{
              stroke: getStrokeColor(),
              strokeDashoffset: getStrokeDashOffset(),
            }}
          />
        </svg>
        <div class="gauge-center">
          <div class="shield-circle" style={{ background: info.iconBg, color: info.iconColor }}>
            <StateIcon size={28} />
          </div>
          <span class="gauge-state-text">{info.gaugeText}</span>
          <span class="gauge-sub-text">{info.subText}</span>
        </div>
      </div>

      <div class="door-stats-grid">
        <div class="stat-box">
          <span class="stat-label">강철 암 결박</span>
          <div class="stat-value">
            <Lock class="stat-icon" style={{ color: isLocked ? '#10B981' : '#64748B' }} size={16} />
            <span style={{ color: isLocked ? '#10B981' : '#64748B' }}>
              {isLocked ? '자동 결박됨' : '결박 해제됨'}
            </span>
          </div>
        </div>
        <div class="stat-box">
          <span class="stat-label">문 개폐 상태</span>
          <div class="stat-value">
            <DoorClosed class="stat-icon" style={{ color: doorOpen ? '#EA580C' : '#0F172A' }} size={16} />
            <span style={{ color: doorOpen ? '#EA580C' : '#0F172A' }}>
              {doorOpen ? `열림 (${doorAngle}°)` : '닫힘 (0°)'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
