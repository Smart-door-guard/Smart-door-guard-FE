import React, { useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { PushNotificationData } from '../types';

interface PushNotificationProps {
  notification: PushNotificationData | null;
  onDismiss: () => void;
}

// 문자(SMS) 수신 알림처럼 보이는 상단 배너. 실제 문자는 보내지 않는다.
export const PushNotification: React.FC<PushNotificationProps> = ({ notification, onDismiss }) => {
  // 닫히며 위로 올라가는 동안 내용이 비지 않도록 마지막 알림을 유지한다
  const lastRef = useRef<PushNotificationData | null>(null);
  if (notification) lastRef.current = notification;
  const shown = notification ?? lastRef.current;
  const level = shown?.level ?? 'info';
  const recipients = shown?.recipients ?? [];

  return (
    <div
      className={`push-notification push-${level} ${notification ? 'active' : ''}`}
      role="alert"
      onClick={onDismiss}
    >
      <div className="push-app-row">
        <span className="push-app-icon"><MessageSquare size={12} /></span>
        <span className="push-app-name">메시지</span>
        <span className="push-time">지금</span>
      </div>
      <div className="push-sender">SafeGuard</div>
      <div className="push-title">{shown?.title}</div>
      <p className="push-body">{shown?.body}</p>
      {recipients.length > 0 && (
        <p className="push-recipients">
          문자 알림 → {recipients[0]}
          {recipients.length > 1 ? ` 외 ${recipients.length - 1}명` : ''}
        </p>
      )}
      {shown?.sticky && <p className="push-hint">탭하여 닫기</p>}
    </div>
  );
};
