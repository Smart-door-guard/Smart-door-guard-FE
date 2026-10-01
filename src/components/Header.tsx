import React from 'react';
import { Home } from 'lucide-react';
import type { WsStatus } from '../api/wsClient';

interface HeaderProps {
  title: string;
  connected: boolean;
  wsStatus?: WsStatus;
  isMockMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  connected,
  wsStatus,
  isMockMode = false,
}) => {
  // 연결 배지 텍스트/클래스 결정
  const getBadge = () => {
    if (isMockMode) {
      return {
        cls: connected ? 'online' : 'offline',
        label: connected ? '시뮬레이터' : '연결 끊김',
      };
    }
    switch (wsStatus) {
      case 'connected':
        return { cls: 'online', label: '장치 연결됨' };
      case 'connecting':
        return { cls: 'offline', label: '연결 중…' };
      case 'auth_failed':
        return { cls: 'offline', label: '인증 실패' };
      case 'capacity':
        return { cls: 'offline', label: '연결 대기 중' };
      case 'disconnected':
      default:
        return { cls: 'offline', label: '연결 끊김' };
    }
  };

  const badge = getBadge();

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="home-selector">
          <Home className="green-icon" size={20} />
          <span className="home-name">{title}</span>
        </div>
      </div>
      <div className="header-right">
        <div className={`connection-badge ${badge.cls}`}>
          <span className="pulse-dot"></span>
          <span>{badge.label}</span>
        </div>
      </div>
    </header>
  );
};
