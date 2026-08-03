import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Shield, History, Cpu, Settings } from 'lucide-react';
import { SystemState, EventLog, DeviceSettings, PushNotificationData } from './types';
import { Header } from './components/Header';
import { StatusCard } from './components/StatusCard';
import { QuickControls } from './components/QuickControls';
import { AiDetectionCard } from './components/AiDetectionCard';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { SimulatorPanel } from './components/SimulatorPanel';
import { PushNotification } from './components/PushNotification';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'devices' | 'settings'>('home');

  const [systemState, setSystemState] = useState<SystemState>('NORMAL');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [doorOpen, setDoorOpen] = useState<boolean>(false);
  const [doorAngle, setDoorAngle] = useState<number>(30);
  const [currentTime, setCurrentTime] = useState<string>('09:41');

  const [notification, setNotification] = useState<PushNotificationData | null>(null);

  const [settings, setSettings] = useState<DeviceSettings>({
    smsNumbers: ['010-9876-5432', '010-1111-2222'],
    sensitivity: 2,
    nightMode: true,
  });

  const [events, setEvents] = useState<EventLog[]>([
    { id: 1, type: 'normal', title: '정상 상태 관제 복귀', time: '11:45:10' },
    { id: 2, type: 'watch', title: 'AI 사람 감지 (정문)', time: '11:40:22' },
    { id: 3, type: 'normal', title: '시스템 전원 켜짐', time: '09:00:00' },
  ]);

  const [logs, setLogs] = useState<string[]>([
    '[System] Smart Door Guard React Engine 시작됨.',
    '[MQTT] sg/device_01/state 연결 수신중...',
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${h}:${m}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const addLog = (msg: string) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setLogs((prev) => [...prev, `[${timeStr}] ${msg}`]);
  };

  const triggerPush = (title: string, body: string) => {
    setNotification({ title, body });
    setTimeout(() => setNotification(null), 4500);
  };

  const addEventLog = (type: EventLog['type'], title: string) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setEvents((prev) => [
      { id: Date.now(), type, title, time: timeStr },
      ...prev.slice(0, 9),
    ]);
  };

  const handleSetState = (newState: SystemState) => {
    setSystemState(newState);
    if (newState === 'NORMAL') {
      setDoorOpen(false);
      setIsLocked(false);
      addLog('[EVENT] 상태: NORMAL | 문 닫힘, 경계 중');
      addEventLog('normal', '정상 관제 복귀');
    } else if (newState === 'WATCH') {
      addLog('[MQTT EVENT] sg/device_01/event -> {"type": "person_detected", "confidence": 0.98}');
      triggerPush('사람 접근 감지!', '카메라가 현관 앞에 접근한 외부인을 감지했습니다.');
      addEventLog('watch', 'AI 카메라 외부인 감지 (Confidence 98%)');
    } else if (newState === 'WARNING') {
      setDoorOpen(true);
      addLog('[MQTT EVENT] sg/device_01/event -> {"type": "door_open", "angle": 30}');
      triggerPush('문 열림 경고!', '외부인 접근 상태에서 현관문이 열렸습니다!');
      addEventLog('warning', '주의: 접근 중 문 열림 감지 (각도 30°)');
    } else if (newState === 'INTRUSION') {
      setDoorOpen(true);
      setIsLocked(true);
      addLog('[CRITICAL INTRUSION] 연속 충격 2.4G 감지 -> 강철 암 자동 결박 실행! SMS 발송 중...');
      triggerPush('🚨 침입 경보 발생!', '강한 충격 감지! 강철 암 결박 및 비상 SMS 발송이 완료되었습니다.');
      addEventLog('intrusion', '🚨 비상: 침입 확정! 강철 암 자동 결박 실행');
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'home': return '우리집 현관문';
      case 'history': return '이력 및 감지 로그';
      case 'devices': return '스마트 기기 관제';
      case 'settings': return '스마트 가드 설정';
    }
  };

  return (
    <div class="app-layout">
      <div class="phone-frame">
        {/* Status Bar */}
        <div class="status-bar">
          <span class="time">{currentTime}</span>
          <div class="notch" />
          <div class="status-icons">
            <Wifi size={16} />
            <Battery size={16} />
          </div>
        </div>

        {/* Push Notification */}
        <PushNotification notification={notification} />

        {/* Header */}
        <Header title={getPageTitle()} />

        {/* Dynamic Page Views */}
        <main class="app-content">
          {activeTab === 'home' && (
            <>
              <StatusCard
                systemState={systemState}
                isLocked={isLocked}
                doorOpen={doorOpen}
                doorAngle={doorAngle}
              />
              <QuickControls
                isLocked={isLocked}
                doorAngle={doorAngle}
                onToggleLock={() => {
                  const nextLocked = !isLocked;
                  setIsLocked(nextLocked);
                  addLog(`[MQTT CMD] sg/device_01/cmd -> {"action": "lock", "status": "${nextLocked ? 'LOCKED' : 'UNLOCKED'}"}`);
                }}
                onChangeAngle={(ang) => {
                  setDoorAngle(ang);
                  addLog(`[PATCH /devices/1/angle] 개방 제한 각도 ${ang}° 변경 완료`);
                }}
              />
              <AiDetectionCard systemState={systemState} />
            </>
          )}

          {activeTab === 'history' && (
            <HistoryPage
              events={events}
              onRefresh={() => addLog('[API GET /events] 이력 데이터 동기화 완료')}
            />
          )}

          {activeTab === 'devices' && (
            <section class="section-container">
              <h3 class="section-title">연결된 IoT 스마트 디바이스</h3>
              <div class="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div class="galaxy-item-icon" style={{ background: 'var(--primary-green-light)', color: 'var(--primary-green-dark)', width: 48, height: 48, borderRadius: 16 }}>
                  <Shield size={24} />
                </div>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 800 }}>ESP32 Smart Guard 메인 락</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>IP: 192.168.0.104 | MQTT LWT: Connected</p>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'settings' && (
            <SettingsPage
              settings={settings}
              onSaveSettings={(newSet) => {
                setSettings(newSet);
                addLog(`[SETTINGS SAVE] 비상 SMS 목록: [${newSet.smsNumbers.join(', ')}] 저장완료`);
              }}
            />
          )}
        </main>

        {/* Bottom Nav (탭 변경 연동) */}
        <nav class="bottom-nav">
          <button
            class={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Shield size={20} />
            <span>보안 홈</span>
          </button>
          <button
            class={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={20} />
            <span>이력</span>
          </button>
          <button
            class={`nav-item ${activeTab === 'devices' ? 'active' : ''}`}
            onClick={() => setActiveTab('devices')}
          >
            <Cpu size={20} />
            <span>기기</span>
          </button>
          <button
            class={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            <span>설정</span>
          </button>
        </nav>
        <div class="home-indicator" />
      </div>

      {/* Simulator Panel */}
      <SimulatorPanel onSetState={handleSetState} logs={logs} />
    </div>
  );
};
