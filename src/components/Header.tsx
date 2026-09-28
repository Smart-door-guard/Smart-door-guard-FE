import React from 'react';
import { Home } from 'lucide-react';

interface HeaderProps {
  title: string;
  connected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, connected }) => {
  return (
    <header class="app-header">
      <div class="header-left">
        <div class="home-selector">
          <Home class="green-icon" size={20} />
          <span class="home-name">{title}</span>
        </div>
      </div>
      <div class="header-right">
        <div class={`connection-badge ${connected ? 'online' : 'offline'}`}>
          <span class="pulse-dot"></span>
          <span>{connected ? '장치 연결됨' : '연결 끊김'}</span>
        </div>
      </div>
    </header>
  );
};
