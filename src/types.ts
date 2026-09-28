export type SystemState = 'UNKNOWN' | 'NORMAL' | 'WATCH' | 'WARNING' | 'INTRUSION';

export interface EventLog {
  id: number;
  type: 'unknown' | 'normal' | 'watch' | 'warning' | 'intrusion';
  title: string;
  time: string;
}

// 상태 판단 엔진에 들어가는 입력 신호 (ESP32 센서 + 서버 AI 분석 결과)
export interface Signals {
  connected: boolean; // 서버·ESP32 신호 수신 여부
  personCount: number; // YOLO 사람 검출 수
  personRegistered: boolean; // 얼굴 식별 결과: 등록 인물 여부
  personConfidence: number; // 검출 신뢰도 (0~1)
  doorOpen: boolean; // 문 상태 센서
  gapMm: number; // VL53L0X 문틈 거리
  shockTimes: number[]; // MPU6050 충격 감지 시각(ms)
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
