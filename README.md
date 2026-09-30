# Smart Door Guard Frontend

스마트 문 침입 방지 시스템(Smart Door Guard)의 프론트엔드 모바일 웹 애플리케이션입니다.  
하드웨어 디바이스(ESP32) 및 백엔드 서버와 연동하여 실시간 침입 상태 관제, 강철 암 비상 결박 제어, AI 스냅샷 분석 및 사용자 설정을 제공합니다.

---

## 🎨 Design & UX

- **Modern Clean Theme**: Slate White 레이아웃 기반에 Fresh Emerald Green 액센트를 결합한 스마트 모바일 UI
- **Responsive Mobile Frame**: 디바이스 프레임, Dynamic Island, 상단 상태바 및 실시간 푸시 알림 배너
- **Intuitive User Interface**: 사용자 중심의 카드형 컨트롤 레이아웃 및 반응형 설정 인터페이스

---

## 📱 탭별 주요 기능

### 1. 보안 홈 (Home)
- **4단계 실시간 상태 머신 관제**: `NORMAL` → `WATCH` → `WARNING` → `INTRUSION` 상태 링 게이지 및 애니메이션
- **원터치 강철 암 비상 결박**: 토글 스위치로 문 결박 및 해제 제어
- **안전 개방 각도 프리셋**: 15°, 30°, 45°, 60° 개방 제한 조절
- **AI 카메라 실시간 분석**: CCTV 스냅샷 상의 AI 사람 감지 Bounding Box 및 추론 시간 시각화

### 2. 이력 및 로그 (History)
- 실시간 센서 및 침입 이력 타임라인 렌더링
- 새로고침 기능을 통한 최신 이력 데이터 동기화

### 3. 스마트 가드 설정 (Settings)
- **비상 SMS 연락처**: 비상 문자 수신 번호 추가 및 삭제
- **경계 민감도**: 1~5단계 충격 감지 민감도 조절
- **야간 심야 자동 결박**: 심야 시간대(23:00~06:00) 미확인 열림 시 즉시 결박 기능
- **디바이스 정보**: 앱 및 ESP32 펌웨어 버전 확인

---

## 🔄 백엔드 연동 인터페이스 Specification

### 1. REST API
| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| `GET` | `/devices/{id}/state` | 디바이스 현재 상태 조회 |
| `POST` | `/devices/{id}/lock` | 강철 암 비상 결박 / 해제 |
| `PATCH` | `/devices/{id}/angle` | 안전 개방 각도 설정 |
| `GET` | `/events?deviceId=` | 최근 감지 및 침입 이력 조회 |
| `POST` | `/settings` | 비상 SMS 번호 및 민감도 저장 |

### 2. MQTT & WebSocket
| 토픽 / 경로 | 방향 | 설명 |
| --- | --- | --- |
| `sg/{id}/cmd` | Client → Device | 결박 및 각도 제어 명령 발송 |
| `sg/{id}/event` | Device → Server | 충격 감지 및 사람 감지 이벤트 수신 |
| `/ws/state` | Server → Client | 4단계 상태 머신 실시간 구독 |

---

## 📂 프로젝트 구조

```text
smart-door-guard-fe/
├── demo.html               # 더블클릭 단일 실행 데모
├── index.html              # Vite React Root 마운트
├── public/                 # AI 카메라 스냅샷 이미지
└── src/
    ├── main.tsx            # Entrypoint
    ├── App.tsx             # 메인 상태 및 탭 라우팅
    ├── types.ts            # TypeScript 인터페이스
    ├── index.css           # UI 디자인 CSS
    └── components/         # 컴포넌트 모듈
        ├── Header.tsx
        ├── StatusCard.tsx
        ├── QuickControls.tsx
        ├── AiDetectionCard.tsx
        ├── HistoryPage.tsx
        ├── SettingsPage.tsx
        ├── PushNotification.tsx
        └── SimulatorPanel.tsx
```

---

## 🚀 실행 및 테스트

### 1. Standalone Demo
`demo.html` 파일을 브라우저로 실행하여 시뮬레이터 조종판과 함께 바로 테스트할 수 있습니다.

### 2. Vite React Development
```bash
npm install
npm run dev
```

## FastAPI end-to-end integration

Live mode now uses persistent `/api/web/events` history and operator `/api/web/settings` tuning.
Command buttons follow the returned ID through execution ACK and fresh output-OFF confirmation;
HTTP 202 alone is never presented as completed actuation. Output state and local automation
are read from `/api/web/actuators`. Server tuning persists across restart; server arming does not.

The live settings page exposes actual server shock thresholds and arm/ack controls.
The old unimplemented night schedule stays in mock mode only. SMS ownership is unchanged.
ESP32 local shock control is independent of server arming, and cannot be disabled from this page.

Requires the matching SafeGuard backend update providing `/api/web/events`,
`/api/web/commands/{id}`, `/api/web/actuators` and persisted tuning.
Validated with a simulated sensor and camera over real HTTP/WebSocket plus browser interaction.
Physical hardware and real AI inference must still be verified on the deployment machine.
