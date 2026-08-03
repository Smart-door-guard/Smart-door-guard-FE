export type SystemState = 'NORMAL' | 'WATCH' | 'WARNING' | 'INTRUSION';

export interface EventLog {
  id: number;
  type: 'normal' | 'watch' | 'warning' | 'intrusion';
  title: string;
  time: string;
}

export interface DeviceSettings {
  smsNumbers: string[];
  sensitivity: number;
  nightMode: boolean;
}

export interface PushNotificationData {
  title: string;
  body: string;
}
