import React from 'react';
import { ShieldAlert, AlertTriangle, UserCheck, CheckCircle } from 'lucide-react';
import { EventLog } from '../types';

interface EventTimelineProps {
  events: EventLog[];
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'intrusion':
        return <ShieldAlert size={18} />;
      case 'warning':
        return <AlertTriangle size={18} />;
      case 'watch':
        return <UserCheck size={18} />;
      default:
        return <CheckCircle size={18} />;
    }
  };

  const getEventClass = (type: string) => {
    switch (type) {
      case 'intrusion': return 'type-intrusion';
      case 'warning': return 'type-warning';
      case 'watch': return 'type-watch';
      default: return 'type-normal';
    }
  };

  return (
    <section class="section-container">
      <div class="section-header-flex">
        <h3 class="section-title">최근 이력 로그</h3>
        <button class="text-button">새로고침</button>
      </div>

      <div class="event-list">
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
