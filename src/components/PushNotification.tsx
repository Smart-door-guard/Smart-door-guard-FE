import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { PushNotificationData } from '../types';

interface PushNotificationProps {
  notification: PushNotificationData | null;
}

export const PushNotification: React.FC<PushNotificationProps> = ({ notification }) => {
  return (
    <div class={`push-notification ${notification ? 'active' : ''}`}>
      <div class="push-icon-box">
        <ShieldAlert size={22} />
      </div>
      <div class="push-content">
        <div class="push-header">
          <span class="push-title">{notification?.title}</span>
          <span class="push-time">방금 전</span>
        </div>
        <p class="push-body">{notification?.body}</p>
      </div>
    </div>
  );
};
