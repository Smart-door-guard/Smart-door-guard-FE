import React, { useState } from 'react';
import { RefreshCw, ShieldAlert, ShieldQuestion, AlertTriangle, Eye, CheckCircle } from 'lucide-react';
import { EventLog } from '../types';

interface HistoryPageProps {
  events: EventLog[];
  onRefresh: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ events, onRefresh }) => {
  const [isSpinning, setIsSpinning] = useState(false);

  const handleRefreshClick = () => {
    setIsSpinning(true);
    onRefresh();
    setTimeout(() => {
      setIsSpinning(false);
    }, 600);
  };

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
    <section class="section-container">
      <div class="section-header-flex">
        <div>
          <h3 class="section-title" style={{ fontSize: 18 }}>감지 및 결박 이력</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 4 }}>
            실시간 센서/이벤트 타임라인
          </span>
        </div>
        <button
          class={`btn-refresh-pretty ${isSpinning ? 'spinning' : ''}`}
          onClick={handleRefreshClick}
        >
          <RefreshCw size={14} />
          <span>새로고침</span>
        </button>
      </div>

      <div class="event-list" style={{ marginTop: 12 }}>
        {events.map((evt) => (
          <div key={evt.id} class="event-item">
            <div class={`event-icon-box ${getEventClass(evt.type)}`}>
              {getEventIcon(evt.type)}
            </div>
            <div class="event-details">
              <div class="event-title-text">{evt.title}</div>
              <div class="event-time-text">{evt.time}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
