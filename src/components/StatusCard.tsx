import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldQuestion, AlertTriangle, Eye } from 'lucide-react';
import { Signals, SystemState } from '../types';

interface StatusCardProps {
  systemState: SystemState;
  signals: Signals;
  latencySec: number | null;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  systemState,
  signals,
  latencySec,
}) => {
  const getStrokeDashOffset = () => {
    const totalDash = 534;
    switch (systemState) {
      case 'UNKNOWN':   return totalDash;   // 링이 비어 있다
      case 'NORMAL':    return 0;
      case 'WATCH':     return totalDash * 0.35;
      case 'WARNING':   return totalDash * 0.65;
      case 'INTRUSION': return totalDash * 0.95;
      default:          return totalDash;
    }
  };

  const getStrokeColor = () => {
    switch (systemState) {
      case 'UNKNOWN':   return '#CBD5E1';
      case 'NORMAL':    return '#10B981';
      case 'WATCH':     return '#F59E0B';
      case 'WARNING':   return '#EA580C';
      case 'INTRUSION': return '#E11D48';
      default:          return '#CBD5E1';
    }
  };

  const renderStateInfo = () => {
    switch (systemState) {
      case 'UNKNOWN':
        return {
          title: '연결 중',
          pillText: '연결 중',
          pillClass: 'state-unknown',
          gaugeText: '연결 중',
          subText: '잠시만 기다려 주세요',
          bg: 'linear-gradient(145deg, #FFFFFF 0%, #F1F5F9 100%)',
          iconBg: '#E2E8F0',
          iconColor: '#64748B',
          Icon: ShieldQuestion,
        };
      case 'NORMAL':
        return {
          title: '안전',
          pillText: '정상 감시 중',
          pillClass: 'state-normal',
          gaugeText: '정상',
          subText: '이상 없음',
          bg: 'linear-gradient(145deg, #FFFFFF 0%, #F0FDF4 100%)',
          iconBg: '#ECFDF5',
          iconColor: '#10B981',
          Icon: ShieldCheck,
        };
      case 'WATCH':
        return {
          title: '주의',
          pillText: '충격 감지',
          pillClass: 'state-watch',
          gaugeText: '주의',
          subText: '현관 확인 중',
          bg: 'linear-gradient(145deg, #FFFFFF 0%, #FFFBEB 100%)',
          iconBg: '#FEF3C7',
          iconColor: '#F59E0B',
          Icon: Eye,
        };
      case 'WARNING':
        return {
          title: '경고',
          pillText: '경고',
          pillClass: 'state-warning',
          gaugeText: '경고',
          subText: '이상 징후 감지',
          bg: 'linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 100%)',
          iconBg: '#FFEDD5',
          iconColor: '#EA580C',
          Icon: AlertTriangle,
        };
      case 'INTRUSION':
        return {
          title: '침입',
          pillText: '잠금 작동',
          pillClass: 'state-intrusion',
          gaugeText: '침입',
          subText: '현관을 확인하세요',
          bg: 'linear-gradient(145deg, #FFFFFF 0%, #FFF1F2 100%)',
          iconBg: '#FFE4E6',
          iconColor: '#E11D48',
          Icon: ShieldAlert,
        };
      default:
        // 예상 외 값 — UNKNOWN과 동일하게 처리 (TypeError 방지)
        return {
          title: '연결 중',
          pillText: '연결 중',
          pillClass: 'state-unknown',
          gaugeText: '연결 중',
          subText: '잠시만 기다려 주세요',
          bg: 'linear-gradient(145deg, #FFFFFF 0%, #F1F5F9 100%)',
          iconBg: '#E2E8F0',
          iconColor: '#64748B',
          Icon: ShieldQuestion,
        };
    }
  };

  const info = renderStateInfo();
  const StateIcon = info.Icon;
  const connected = signals.connected;

  const doorText = !connected
    ? '—'
    : signals.doorOpen === null
      ? '—'
      : signals.doorOpen
        ? '열림'
        : '닫힘';

  const personText = !connected
    ? '—'
    : !signals.personCount
      ? '없음'
      : `${signals.personCount}명${signals.personRegistered === true ? ' · 등록' : signals.personRegistered === false ? ' · 미등록' : ''}`;

  const latencyText = latencySec === null ? '—' : `${latencySec.toFixed(1)}초`;

  return (
    <section className="card status-card" style={{ background: info.bg }}>
      <div className="card-header">
        <div>
          <span className="card-subtitle">SYSTEM STATUS</span>
          <h2 className="card-title">{info.title}</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className={`status-pill ${info.pillClass}`}>{info.pillText}</span>
        </div>
      </div>


      <div className="gauge-container">
        <svg className="gauge-svg" viewBox="0 0 200 200">
          <circle className="gauge-bg" cx="100" cy="100" r="85" />
          <circle
            className="gauge-progress"
            cx="100"
            cy="100"
            r="85"
            style={{
              stroke: getStrokeColor(),
              strokeDashoffset: getStrokeDashOffset(),
            }}
          />
        </svg>
        <div className="gauge-center">
          <div className="shield-circle" style={{ background: info.iconBg, color: info.iconColor }}>
            <StateIcon size={28} />
          </div>
          <span className="gauge-state-text" style={{ color: info.iconColor }}>{info.gaugeText}</span>
          <span className="gauge-sub-text">{info.subText}</span>
        </div>
      </div>

      <div className="door-stats-grid">
        <div className="stat-box">
          <span className="stat-label">문 상태</span>
          <div className="stat-value" style={{ color: signals.doorOpen === true && connected ? '#EA580C' : undefined }}>
            {doorText}
          </div>
        </div>
        <div className="stat-box">
          <span className="stat-label">사람 감지</span>
          <div className="stat-value">{personText}</div>
        </div>
        <div className="stat-box">
          <span className="stat-label">신호 지연</span>
          <div className="stat-value">{latencyText}</div>
        </div>
      </div>
    </section>
  );
};
