import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { PushNotificationData } from '../types';

interface PushNotificationProps {
  notification: PushNotificationData | null;
}

export const PushNotification: React.FC<PushNotificationProps> = ({ notification }) => {
  return (
    <div className={`push-notification ${notification ? 'active' : ''}`}>
      <div className="push-icon-box">
        <ShieldAlert size={22} />
      </div>
      <div className="push-content">
        <div className="push-header">
          <span className="push-title">{notification?.title}</span>
          <span className="push-time">방금 전</span>
        </div>
        <p className="push-body">{notification?.body}</p>
      </div>
    </div>
  );
};
