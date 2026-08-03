import React from 'react';
import { Home } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header class="app-header">
      <div class="header-left">
        <div class="home-selector">
          <Home class="green-icon" size={20} />
          <span class="home-name">{title}</span>
        </div>
      </div>
      <div class="header-right">
        <div class="connection-badge online">
          <span class="pulse-dot"></span>
          <span>MQTT 연결됨</span>
        </div>
      </div>
    </header>
  );
};
