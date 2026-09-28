import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Battery, Shield, History, Video, Settings } from 'lucide-react';
import { SystemState, EventLog, DeviceSettings, PushNotificationData, Signals } from './types';
import { evaluateState, activeReasons } from './stateEngine';
import { Header } from './components/Header';
import { StatusCard } from './components/StatusCard';
import { QuickControls, LOCK_PULSE_MS, BUZZER_MS } from './components/QuickControls';
import { VideoPage } from './components/VideoPage';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { SimulatorPanel } from './components/SimulatorPanel';
import { PushNotification } from './components/PushNotification';

const GAP_CLOSED_MM = 3;
const GAP_OPEN_MM = 120;

const initialSignals: Signals = {
  connected: true,
  personCount: 0,
  personRegistered: false,
  personConfidence: 0,
  doorOpen: false,
  gapMm: GAP_CLOSED_MM,
  shockTimes: [],
};

const formatTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'video' | 'settings'>('home');

  const [signals, setSignals] = useState<Signals>(initialSignals);
  const [now, setNow] = useState<number>(Date.now());
  const [latencySec, setLatencySec] = useState<number>(0.2);

  const [lockFiring, setLockFiring] = useState<boolean>(false);
  const [lastLockAt, setLastLockAt] = useState<number | null>(null);
  const [buzzerOn, setBuzzerOn] = useState<boolean>(false);

  const [notification, setNotification] = useState<PushNotificationData | null>(null);

  const [settings, setSettings] = useState<DeviceSettings>({
    smsNumbers: ['010-9876-5432', '010-1111-2222'],
    sensitivity: 2,
    nightMode: true,
  });

  const [events, setEvents] = useState<EventLog[]>([
    { id: 1, type: 'normal', title: '정상 단계 복귀', time: '11:45:10' },
    { id: 2, type: 'watch', title: '감시 단계: 미등록 인물 감지', time: '11:40:22' },
    { id: 3, type: 'normal', title: '시스템 전원 켜짐', time: '09:00:00' },
  ]);

  const [logs, setLogs] = useState<string[]>([
    '[System] SafeGuard 상태 판단 엔진 시작됨.',
    '[ESP32] 센서 수집 시작 (MPU6050 · VL53L0X · 문 상태 센서)',
  ]);

  const systemState: SystemState = evaluateState(signals, now);
  const prevStateRef = useRef<SystemState>(systemState);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      setLatencySec(0.1 + Math.round(Math.random() * 2) / 10);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${formatTime(new Date())}] ${msg}`]);
  };

  const triggerPush = (title: string, body: string) => {
    setNotification({ title, body });
    setTimeout(() => setNotification(null), 4500);
  };

  const addEventLog = (type: EventLog['type'], title: string) => {
    setEvents((prev) => [
      { id: Date.now() + Math.random(), type, title, time: formatTime(new Date()) },
      ...prev.slice(0, 19),
    ]);
  };

  const fireLock = (source: 'auto' | 'manual') => {
    setLockFiring(true);
    addLog(`[CMD] 솔레노이드 잠금핀 1회 구동 (${LOCK_PULSE_MS}ms, ${source === 'auto' ? '자동' : '수동'})`);
    setTimeout(() => {
      setLockFiring(false);
      setLastLockAt(Date.now());
      addLog('[ESP32] 잠금핀 구동 완료 응답 수신');
    }, LOCK_PULSE_MS);
    if (source === 'manual') addEventLog('normal', '사용자 결박 구동');
  };

  const ringBuzzer = (source: 'auto' | 'manual') => {
    setBuzzerOn(true);
    addLog(`[CMD] 부저 1회 (${BUZZER_MS}ms, ${source === 'auto' ? '자동' : '수동'})`);
    setTimeout(() => setBuzzerOn(false), BUZZER_MS);
    if (source === 'manual') addEventLog('normal', '사용자 경고음 울림');
  };

  // 단계가 바뀔 때만 알림·이력·출력 동작을 수행한다
  useEffect(() => {
    const prev = prevStateRef.current;
    if (prev === systemState) return;
    prevStateRef.current = systemState;

    const reasons = activeReasons(signals, now).join(' + ');
    const rank: Record<SystemState, number> = { UNKNOWN: -1, NORMAL: 0, WATCH: 1, WARNING: 2, INTRUSION: 3 };
    const escalated = rank[systemState] > rank[prev];

    addLog(`[ENGINE] 상태 변경 ${prev} → ${systemState}${reasons ? ` (${reasons})` : ''}`);

    switch (systemState) {
      case 'UNKNOWN':
        addEventLog('unknown', '판정 불가: 장치 신호 수신 없음');
        triggerPush('장치 연결 끊김', '신호가 들어오지 않아 상태를 판정할 수 없습니다.');
        break;
      case 'NORMAL':
        addEventLog('normal', prev === 'UNKNOWN' ? '신호 복구, 정상 단계' : '정상 단계 복귀');
        break;
      case 'WATCH':
        addEventLog('watch', `감시 단계: ${reasons}`);
        if (escalated) triggerPush('감시 단계', `${reasons} 신호를 확인하고 있습니다.`);
        break;
      case 'WARNING':
        addEventLog('warning', `경고 단계: ${reasons}`);
        if (escalated) {
          ringBuzzer('auto');
          triggerPush('경고 단계, 부저 작동', `${reasons} 신호가 함께 감지되었습니다.`);
        }
        break;
      case 'INTRUSION':
        addEventLog('intrusion', `침입 단계: ${reasons} → 잠금핀 구동`);
        ringBuzzer('auto');
        fireLock('auto');
        triggerPush('🚨 침입 판단, 잠금핀 구동', `${reasons} 신호가 모두 감지되어 잠금핀을 구동했습니다.`);
        break;
    }
  }, [systemState]);

  const handlePerson = (count: number, registered: boolean) => {
    const confidence = count > 0 ? 0.9 + Math.round(Math.random() * 90) / 1000 : 0;
    setSignals((s) => ({ ...s, personCount: count, personRegistered: registered, personConfidence: confidence }));
    addLog(
      count === 0
        ? '[AI] 사람 검출 없음'
        : `[AI] YOLO 사람 검출 (신뢰도 ${(confidence * 100).toFixed(1)}%) → 얼굴 식별: ${registered ? '등록 인물' : '미등록 인물'}`
    );
  };

  const handleToggleDoor = () => {
    const open = !signals.doorOpen;
    setSignals((s) => ({ ...s, doorOpen: open, gapMm: open ? GAP_OPEN_MM : GAP_CLOSED_MM }));
    addLog(`[ESP32] 문 상태 센서: ${open ? '열림' : '닫힘'} · 문틈 거리 ${open ? GAP_OPEN_MM : GAP_CLOSED_MM}mm`);
  };

  const handleShock = () => {
    const t = Date.now();
    setSignals((s) => ({ ...s, shockTimes: [...s.shockTimes.filter((x) => t - x <= 60_000), t] }));
    setNow(t);
    addLog('[ESP32] MPU6050 충격 감지');
  };

  const handleToggleConnection = () => {
    setSignals((s) => ({ ...s, connected: !s.connected }));
    addLog(signals.connected ? '[NET] 장치 신호 끊김' : '[NET] 장치 신호 복구');
  };

  const handleReset = () => {
    setSignals(initialSignals);
    addLog('[SIM] 신호 초기화');
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'home': return '우리집 현관문';
      case 'history': return '이력 및 감지 로그';
      case 'video': return '현관 영상';
      case 'settings': return 'SafeGuard 설정';
    }
  };

  const currentTime = formatTime(new Date(now)).slice(0, 5);

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
        <Header title={getPageTitle()} connected={signals.connected} />

        {/* Dynamic Page Views */}
        <main class="app-content">
          {activeTab === 'home' && (
            <>
              <StatusCard
                systemState={systemState}
                signals={signals}
                latencySec={signals.connected ? latencySec : null}
              />
              <QuickControls
                connected={signals.connected}
                lockFiring={lockFiring}
                buzzerOn={buzzerOn}
                lastLockAt={lastLockAt}
                now={now}
                onFireLock={() => fireLock('manual')}
                onRingBuzzer={() => ringBuzzer('manual')}
              />
            </>
          )}

          {activeTab === 'history' && (
            <HistoryPage
              events={events}
              onRefresh={() => addLog('[API] 이벤트 이력 동기화 완료')}
            />
          )}

          {activeTab === 'video' && <VideoPage signals={signals} now={now} />}

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
            class={`nav-item ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            <Video size={20} />
            <span>영상</span>
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
      <SimulatorPanel
        signals={signals}
        onPerson={handlePerson}
        onToggleDoor={handleToggleDoor}
        onShock={handleShock}
        onToggleConnection={handleToggleConnection}
        onReset={handleReset}
        logs={logs}
      />
    </div>
  );
};
