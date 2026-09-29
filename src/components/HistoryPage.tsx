import React from 'react';
import { ShieldAlert, ShieldQuestion, AlertTriangle, Eye, CheckCircle } from 'lucide-react';
import { EventLog } from '../types';

interface HistoryPageProps {
  isMockMode: boolean;
  events: EventLog[];
  onRefresh: () => void;  // 목 모드에서만 사용
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ isMockMode, events, onRefresh }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'intrusion': return <ShieldAlert size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      case 'watch': return <Eye size={18} />;
      case 'unknown': return <ShieldQuestion size={18} />;
      default: return <CheckCircle size={18} />;
    }
  };

  const getEventClass = (type: string) => {
    switch (type) {
      case 'intrusion': return 'type-intrusion';
      case 'warning': return 'type-warning';
      case 'watch': return 'type-watch';
      case 'unknown': return 'type-unknown';
      default: return 'type-normal';
    }
  };

  return (
    <section className="section-container">
      <div className="section-header-flex">
        <div>
          <h3 className="section-title" style={{ fontSize: 18 }}>감지 및 결박 이력</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 4 }}>
            {isMockMode
              ? '실시간 센서/이벤트 타임라인'
              : '이 세션의 상태 변화 이력 (새로고침 시 초기화)'}
          </span>
        </div>
        {/* 새로고침 버튼: 목 모드에서만 표시 — 실서버 모드는 서버 이력 API가 없다 */}
        {isMockMode && (
          <button className="btn-refresh-pretty" onClick={onRefresh}>
            <span>새로고침</span>
          </button>
        )}
      </div>

      <div className="event-list" style={{ marginTop: 12 }}>
        {events.length === 0 ? (
          <div className="history-empty">
            <ShieldQuestion size={32} color="var(--text-light)" />
            <p>아직 상태 변화가 없습니다.</p>
            <p style={{ fontSize: 12 }}>서버에서 신호가 오면 여기에 쌓입니다.</p>
          </div>
        ) : (
          events.map((evt) => (
            <div key={evt.id} className="event-item">
              <div className={`event-icon-box ${getEventClass(evt.type)}`}>
                {getEventIcon(evt.type)}
              </div>
              <div className="event-details">
                <div className="event-title-text">{evt.title}</div>
                <div className="event-time-text">{evt.time}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
