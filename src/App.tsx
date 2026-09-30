import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Wifi, Battery, Shield, History, Video, Settings } from 'lucide-react';
import {
  SystemState,
  EventLog,
  DeviceSettings,
  PushNotificationData,
  Signals,
  ServerPayload,
  MissingSignal,
} from './types';
import { evaluateState, activeReasons } from './stateEngine';
import { Header } from './components/Header';
import { StatusCard } from './components/StatusCard';
import { QuickControls, LOCK_PULSE_MS, BUZZER_MS } from './components/QuickControls';
import { VideoPage } from './components/VideoPage';
import { ServerHistory } from './components/ServerHistory';
import { HistoryPage } from './components/HistoryPage';
import { SettingsPage } from './components/SettingsPage';
import { SimulatorPanel } from './components/SimulatorPanel';
import { PushNotification } from './components/PushNotification';
import { setToken, hasToken } from './api/client';
import { useWebSocket, WsStatus } from './api/wsClient';

// ── 모드 판별 ─────────────────────────────────────────────────────────────
// ?mock=1 일 때만 목 모드. 기본은 실서버 모드.
const isMockMode = new URLSearchParams(location.search).get('mock') === '1';

// ── 토큰 처리 (실서버 모드에서만) ─────────────────────────────────────────
// #t=토큰 형식. 프래그먼트는 서버 로그에 남지 않는다.
function initToken(): boolean {
  if (isMockMode) return true; // 목 모드는 토큰 불필요
  const hash = location.hash; // "#t=sga_..."
  const match = hash.match(/[#&]t=([^&]+)/);
  if (match?.[1]) {
    setToken(match[1]);
    // 주소창에서 해시 제거 — 화면에 토큰이 보이지 않게 한다
    history.replaceState(null, '', location.pathname + location.search);
    return true;
  }
  return false; // 토큰 없음
}

const tokenFound = initToken();

// ── 초기값 ────────────────────────────────────────────────────────────────
// 실서버 모드: 서버에서 값이 오기 전에는 전부 "모름"
const unknownSignals: Signals = {
  connected: false,
  personCount: null,
  personRegistered: null,
  personConfidence: null,
  doorOpen: null,
  gapMm: null,
  shockTimes: [],
};

// 목 모드: 기존 동작을 유지하기 위한 초기값
const GAP_CLOSED_MM = 3;
const GAP_OPEN_MM = 120;
const mockInitialSignals: Signals = {
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

// 알림 본문에 붙일 감지 근거 (" (문 열림 · 충격 3회)" 형태, 없으면 빈 문자열)
const reasonText = (s: Signals) => {
  const parts = [
    s.doorOpen ? '문 열림' : null,
    s.shockTimes.length > 0 ? `충격 ${s.shockTimes.length}회` : null,
    s.personCount ? `사람 ${s.personCount}명` : null,
  ].filter(Boolean);
  return parts.length ? ` (${parts.join(' · ')})` : '';
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'video' | 'settings'>('home');

  // 실서버 모드는 unknownSignals로 시작, 목 모드는 mockInitialSignals
  const [signals, setSignals] = useState<Signals>(
    isMockMode ? mockInitialSignals : unknownSignals
  );
  const [now, setNow] = useState<number>(Date.now());

  // 실서버 모드 전용 상태
  const [systemState, setSystemState] = useState<SystemState>('UNKNOWN');
  const [degraded, setDegraded] = useState<boolean>(false);
  const [missing, setMissing] = useState<MissingSignal[]>([]);
  const [wsStatus, setWsStatus] = useState<WsStatus>('connecting');
  const [serverControls, setServerControls] = useState<{ available: boolean; reason: string }>({
    available: false,
    reason: '서버에 연결 중입니다.',
  });

  // 목 모드에서는 stateEngine이 상태를 계산한다
  const mockSystemState: SystemState = isMockMode
    ? evaluateState(signals, now)
    : systemState;

  const [latencySec, setLatencySec] = useState<number | null>(null);

  const [lockFiring, setLockFiring] = useState<boolean>(false);
  const [lastLockAt, setLastLockAt] = useState<number | null>(null);
  const [buzzerOn, setBuzzerOn] = useState<boolean>(false);

  const [notification, setNotification] = useState<PushNotificationData | null>(null);

  const [settings, setSettings] = useState<DeviceSettings>({
    smsNumbers: ['010-9876-5432', '010-1111-2222'],
    sensitivity: 2,
    nightMode: true,
  });

  const [events, setEvents] = useState<EventLog[]>(
    isMockMode
      ? [
          { id: 1, type: 'normal', title: '정상 단계 복귀', time: '11:45:10' },
          { id: 2, type: 'watch', title: '감시 단계: 미등록 인물 감지', time: '11:40:22' },
          { id: 3, type: 'normal', title: '시스템 전원 켜짐', time: '09:00:00' },
        ]
      : [] // 실서버 모드: 빈 상태로 시작, WS 이벤트로 쌓는다
  );

  const [logs, setLogs] = useState<string[]>(
    isMockMode
      ? [
          '[System] SafeGuard 상태 판단 엔진 시작됨.',
          '[ESP32] 센서 수집 시작 (MPU6050 · VL53L0X · 문 상태 센서)',
        ]
      : []
  );

  // 이전 상태 추적 (상태 변화 감지용)
  const prevStateRef = useRef<SystemState>(isMockMode ? evaluateState(mockInitialSignals, Date.now()) : 'UNKNOWN');

  // ── 1초 타이머 ────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      if (isMockMode) {
        setLatencySec(0.1 + Math.round(Math.random() * 2) / 10);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-99), `[${formatTime(new Date())}] ${msg}`]);
  }, []);

  // 최신 설정을 콜백 재생성 없이 읽기 위한 ref (문자 수신자 표시용)
  const smsNumbersRef = useRef<string[]>([]);
  smsNumbersRef.current = settings.smsNumbers;
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissPush = useCallback(() => {
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = null;
    setNotification(null);
  }, []);

  const triggerPush = useCallback(
    (title: string, body: string, level: PushNotificationData['level'] = 'info') => {
      const sticky = level === 'intrusion';
      const recipients = level === 'info' ? [] : smsNumbersRef.current;
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = sticky ? null : setTimeout(() => setNotification(null), 4500);
      setNotification({ title, body, level, sticky, recipients });
      // 진동은 안드로이드 크롬 등에서만 동작한다 (iOS Safari는 미지원이라 무시됨)
      if (level === 'intrusion') navigator.vibrate?.([300, 150, 300, 150, 600]);
      else if (level === 'warning') navigator.vibrate?.(200);
    },
    [],
  );

  const addEventLog = useCallback((type: EventLog['type'], title: string) => {
    setEvents((prev) => [
      { id: Date.now() + Math.random(), type, title, time: formatTime(new Date()) },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // ── 목 모드 전용: 수동 구동 ────────────────────────────────────────────────
  // 실서버 모드에서는 QuickControls가 직접 API를 호출한다
  const fireLock = useCallback((source: 'auto' | 'manual') => {
    if (!isMockMode) return; // 실서버 모드에서는 호출하지 않는다
    setLockFiring(true);
    addLog(`[CMD] 솔레노이드 잠금핀 1회 구동 (${LOCK_PULSE_MS}ms, ${source === 'auto' ? '자동' : '수동'})`);
    setTimeout(() => {
      setLockFiring(false);
      setLastLockAt(Date.now());
      addLog('[ESP32] 잠금핀 구동 완료 응답 수신');
    }, LOCK_PULSE_MS);
    if (source === 'manual') addEventLog('normal', '사용자 결박 구동');
  }, [addLog, addEventLog]);

  const ringBuzzer = useCallback((source: 'auto' | 'manual') => {
    if (!isMockMode) return; // 실서버 모드에서는 호출하지 않는다
    setBuzzerOn(true);
    addLog(`[CMD] 부저 1회 (${BUZZER_MS}ms, ${source === 'auto' ? '자동' : '수동'})`);
    setTimeout(() => setBuzzerOn(false), BUZZER_MS);
    if (source === 'manual') addEventLog('normal', '사용자 경고음 울림');
  }, [addLog, addEventLog]);

  // ── 목 모드 전용: 상태 변화 감지 + 자동 구동 (목 모드에서만) ──────────────
  useEffect(() => {
    if (!isMockMode) return;

    const current = evaluateState(signals, now);
    const prev = prevStateRef.current;
    if (prev === current) return;
    prevStateRef.current = current;

    const reasons = activeReasons(signals, now).join(' + ');
    const rank: Record<SystemState, number> = { UNKNOWN: -1, NORMAL: 0, WATCH: 1, WARNING: 2, INTRUSION: 3 };
    const escalated = rank[current] > rank[prev];

    addLog(`[ENGINE] 상태 변경 ${prev} → ${current}${reasons ? ` (${reasons})` : ''}`);

    switch (current) {
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
          // 목 모드에서만 자동 부저 — 실서버 모드에서는 서버가 한다
          ringBuzzer('auto');
          triggerPush('경고 단계, 부저 작동', `${reasons} 신호가 함께 감지되었습니다.`, 'warning');
        }
        break;
      case 'INTRUSION':
        addEventLog('intrusion', `침입 단계: ${reasons} → 잠금핀 구동`);
        // 목 모드에서만 자동 구동 — 실서버 모드에서는 서버가 한다
        ringBuzzer('auto');
        fireLock('auto');
        triggerPush('🚨 침입 판단, 잠금핀 구동', `${reasons} 신호가 모두 감지되어 잠금핀을 구동했습니다.`, 'intrusion');
        break;
    }
  }, [signals, now, isMockMode, addLog, addEventLog, triggerPush, ringBuzzer, fireLock]);

  // ── 실서버 모드: WebSocket 메시지 처리 ────────────────────────────────────
  const handleWsMessage = useCallback((payload: ServerPayload) => {
    const prevState = prevStateRef.current;
    const newState = payload.systemState;

    setSystemState(newState);
    setDegraded(payload.degraded);
    setMissing(payload.missing);
    setSignals(payload.signals);
    setServerControls(payload.controls);
    setLatencySec(0.2); // 200ms 주기 — 고정 표시

    // 상태가 바뀌었을 때만 이력에 추가
    if (prevState !== newState) {
      prevStateRef.current = newState;

      const typeMap: Record<SystemState, EventLog['type']> = {
        UNKNOWN: 'unknown',
        NORMAL: 'normal',
        WATCH: 'watch',
        WARNING: 'warning',
        INTRUSION: 'intrusion',
      };

      const stateLabel: Record<SystemState, string> = {
        UNKNOWN: '판정 불가',
        NORMAL: '정상',
        WATCH: '감시',
        WARNING: '경고',
        INTRUSION: '침입',
      };

      const missingLabel = payload.missing
        .map((m) => ({ doorOpen: '문 모름', shock: '충격 모름', person: '사람 모름' }[m]))
        .join(' · ');

      const title = `${stateLabel[prevState]} → ${stateLabel[newState]}${
        payload.degraded && missingLabel ? ` (${missingLabel})` : ''
      }`;

      addEventLog(typeMap[newState], title);

      // 침입 상태 알림
      if (newState === 'INTRUSION') {
        triggerPush(
          '🚨 침입 감지',
          `[${formatTime(new Date()).slice(0, 5)}] 현관에서 침입이 감지되었습니다${
            reasonText(payload.signals)
          }. 침입 조건이 해소되면 상태가 자동으로 복귀합니다.`,
          'intrusion',
        );
      } else if (newState === 'WARNING') {
        triggerPush(
          '⚠ 경고 단계',
          `[${formatTime(new Date()).slice(0, 5)}] 현관 이상 징후${
            reasonText(payload.signals)
          }. 실제 출력 여부는 제어 상태에서 확인하세요.`,
          'warning',
        );
      } else if (newState === 'UNKNOWN' && prevState !== 'UNKNOWN') {
        triggerPush('장치 연결 끊김', '신호가 들어오지 않아 상태를 판정할 수 없습니다.');
      }
    }
  }, [addEventLog, triggerPush]);

  const handleWsStatusChange = useCallback((status: WsStatus) => {
    setWsStatus(status);
    if (status === 'disconnected' || status === 'auth_failed' || status === 'capacity') {
      // 연결이 끊기면 UNKNOWN으로. 목 기본값으로 폴백하지 않는다.
      setSystemState('UNKNOWN');
      setSignals(unknownSignals);
      setDegraded(false);
      setMissing([]);
      setLatencySec(null);
      setServerControls({ available: false, reason: '장치에 연결되어 있지 않습니다.' });
    }
  }, []);

  const handleWsTimeout = useCallback(() => {
    // 3초 타임아웃 — UNKNOWN으로
    setSystemState('UNKNOWN');
    setSignals(unknownSignals);
    setDegraded(false);
    setMissing([]);
    setLatencySec(null);
    setServerControls({ available: false, reason: '서버 응답이 없습니다.' });
  }, []);

  // ── WebSocket 훅 — 실서버 모드 + 토큰 있을 때만 ──────────────────────────
  const wsEnabled = !isMockMode && hasToken();
  useWebSocket(
    wsEnabled
      ? { onMessage: handleWsMessage, onStatusChange: handleWsStatusChange, onTimeout: handleWsTimeout }
      // 목 모드 또는 토큰 없음: 훅은 항상 호출해야 하므로 no-op 버전 전달
      : { onMessage: () => {}, onStatusChange: () => {}, onTimeout: () => {} }
  );

  // ── 목 모드 시뮬레이터 핸들러 ────────────────────────────────────────────
  const handlePerson = (count: number, registered: boolean) => {
    if (!isMockMode) return;
    const confidence = count > 0 ? 0.9 + Math.round(Math.random() * 90) / 1000 : 0;
    setSignals((s) => ({ ...s, personCount: count, personRegistered: registered, personConfidence: confidence }));
    addLog(
      count === 0
        ? '[AI] 사람 검출 없음'
        : `[AI] YOLO 사람 검출 (신뢰도 ${(confidence * 100).toFixed(1)}%) → 얼굴 식별: ${registered ? '등록 인물' : '미등록 인물'}`
    );
  };

  const handleToggleDoor = () => {
    if (!isMockMode) return;
    const open = signals.doorOpen === null ? true : !signals.doorOpen;
    setSignals((s) => ({ ...s, doorOpen: open, gapMm: open ? GAP_OPEN_MM : GAP_CLOSED_MM }));
    addLog(`[ESP32] 문 상태 센서: ${open ? '열림' : '닫힘'} · 문틈 거리 ${open ? GAP_OPEN_MM : GAP_CLOSED_MM}mm`);
  };

  const handleShock = () => {
    if (!isMockMode) return;
    const t = Date.now();
    setSignals((s) => ({ ...s, shockTimes: [...s.shockTimes.filter((x) => t - x <= 60_000), t] }));
    setNow(t);
    addLog('[ESP32] MPU6050 충격 감지');
  };

  const handleToggleConnection = () => {
    if (!isMockMode) return;
    setSignals((s) => ({ ...s, connected: !s.connected }));
    addLog(signals.connected ? '[NET] 장치 신호 끊김' : '[NET] 장치 신호 복구');
  };

  const handleReset = () => {
    if (!isMockMode) return;
    setSignals(mockInitialSignals);
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

  // 실서버 모드에서 쓸 connected 값
  const displayConnected = isMockMode ? signals.connected : signals.connected;

  // ── 토큰 없음 화면 (실서버 모드에서 #t=가 없을 때) ──────────────────────
  if (!isMockMode && !tokenFound) {
    return (
      <div className="no-token-screen">
        <div className="no-token-card">
          <div className="no-token-icon">📵</div>
          <h2 className="no-token-title">QR 코드를 다시 스캔하세요</h2>
          <p className="no-token-body">
            입장 토큰이 없습니다.<br />
            운영자에게 받은 QR 코드를 스캔하면<br />
            자동으로 연결됩니다.
          </p>
          <p className="no-token-hint">
            URL을 직접 열거나 복사·붙여넣기 하면<br />
            토큰이 빠져서 연결할 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="phone-frame">
        {/* 가짜 Status Bar (데스크톱 데모용 — 폰에서는 CSS로 숨김) */}
        <div className="status-bar">
          <span className="time">{currentTime}</span>
          <div className="notch" />
          <div className="status-icons">
            <Wifi size={16} />
            <Battery size={16} />
          </div>
        </div>

        {/* Push Notification */}
        <PushNotification notification={notification} onDismiss={dismissPush} />

        {/* Header */}
        <Header
          title={getPageTitle()}
          connected={displayConnected}
          degraded={degraded}
          wsStatus={wsStatus}
          isMockMode={isMockMode}
        />

        {/* Dynamic Page Views */}
        <main className="app-content">
          {activeTab === 'home' && (
            <>
              <StatusCard
                systemState={mockSystemState}
                signals={signals}
                latencySec={displayConnected ? latencySec : null}
                degraded={degraded}
                missing={missing}
              />
              <QuickControls
                isMockMode={isMockMode}
                connected={displayConnected}
                lockFiring={lockFiring}
                buzzerOn={buzzerOn}
                lastLockAt={lastLockAt}
                now={now}
                onFireLock={() => fireLock('manual')}
                onRingBuzzer={() => ringBuzzer('manual')}
                controls={isMockMode ? undefined : serverControls}
              />
            </>
          )}

          {activeTab === 'history' && !isMockMode && <ServerHistory />}
          {activeTab === 'history' && isMockMode && (
            <HistoryPage
              isMockMode={isMockMode}
              events={events}
              onRefresh={() => addLog('[API] 이벤트 이력 동기화 완료')}
            />
          )}

          {activeTab === 'video' && <VideoPage signals={signals} now={now} isMockMode={isMockMode} />}

          {activeTab === 'settings' && (
            <SettingsPage
              isMockMode={isMockMode}
              settings={settings}
              onSaveSettings={(newSet) => {
                setSettings(newSet);
                addLog(`[SETTINGS] 비상 SMS 목록 저장: [${newSet.smsNumbers.join(', ')}]`);
              }}
            />
          )}
        </main>

        {/* Bottom Nav */}
        <nav className="bottom-nav">
          <button
            className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <Shield size={20} />
            <span>보안 홈</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={20} />
            <span>이력</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            <Video size={20} />
            <span>영상</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            <span>설정</span>
          </button>
        </nav>
        <div className="home-indicator" />
      </div>

      {/* 시뮬레이터 패널 — ?mock=1 일 때만 렌더링 (CSS 숨김이 아니라 아예 없음) */}
      {isMockMode && (
        <SimulatorPanel
          signals={signals}
          onPerson={handlePerson}
          onToggleDoor={handleToggleDoor}
          onShock={handleShock}
          onToggleConnection={handleToggleConnection}
          onReset={handleReset}
          logs={logs}
        />
      )}
    </div>
  );
};
