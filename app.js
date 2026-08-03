/**
 * Smart Door Guard - Frontend Interactive Application Engine
 * Samsung SmartThings White + Fresh Emerald Green Theme
 */

document.addEventListener('DOMContentLoaded', () => {
  // Lucide 아이콘 랜더링
  if (window.lucide) {
    lucide.createIcons();
  }

  // --- App Global State ---
  const state = {
    systemState: 'NORMAL', // NORMAL | WATCH | WARNING | INTRUSION
    isLocked: false,       // 강철 암 결박 유무
    doorOpen: false,       // 문 열림 유무
    doorAngle: 30,         // 개방 각도
    hasPerson: false,      // AI 사람 감지 유무
    smsNumbers: ['010-9876-5432', '010-1111-2222'],
    sensitivity: 2,
    nightMode: true,
    events: [
      { id: 1, type: 'normal', title: '정상 상태 복귀', time: '11:45:10' },
      { id: 2, type: 'watch', title: 'AI 사람 감지 (정문)', time: '11:40:22' },
      { id: 3, type: 'normal', title: '시스템 전원 켜짐', time: '09:00:00' }
    ]
  };

  // --- DOM Elements ---
  const gaugeCircle = document.getElementById('gauge-circle');
  const statusTitle = document.getElementById('status-title');
  const statusPill = document.getElementById('status-pill');
  const shieldCircle = document.getElementById('shield-circle');
  const mainShieldIcon = document.getElementById('main-shield-icon');
  const gaugeStateText = document.getElementById('gauge-state-text');
  const gaugeSubText = document.getElementById('gauge-sub-text');
  const statusCardBg = document.getElementById('status-card-bg');

  const textLock = document.getElementById('text-lock');
  const textDoor = document.getElementById('text-door');

  const btnToggleLock = document.getElementById('btn-toggle-lock');
  const lockIconWrapper = document.getElementById('lock-icon-wrapper');
  const lockToggleSwitch = document.getElementById('lock-toggle-switch');
  const quickLockStatus = document.getElementById('quick-lock-status');

  const boundingBox = document.getElementById('bounding-box');
  const detectedObjectText = document.getElementById('detected-object-text');

  const pushNotification = document.getElementById('push-notification');
  const pushTitle = document.getElementById('push-title');
  const pushBody = document.getElementById('push-body');

  const eventList = document.getElementById('event-list');
  const simConsole = document.getElementById('sim-console');

  // Settings Modal Elements
  const btnSettings = document.getElementById('btn-settings');
  const navSettings = document.getElementById('nav-settings');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const inputPhone = document.getElementById('input-phone');
  const btnAddPhone = document.getElementById('btn-add-phone');
  const phoneChipList = document.getElementById('phone-chip-list');

  // --- Real-time Clock ---
  function updateClock() {
    const timeEl = document.getElementById('current-time');
    if (!timeEl) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeEl.textContent = `${hours}:${minutes}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // --- UI Update Renderer ---
  function renderApp() {
    // 1. 상태 머신 게이지 및 마크업 반영
    const totalDash = 534;

    switch (state.systemState) {
      case 'NORMAL':
        gaugeCircle.style.stroke = '#10B981';
        gaugeCircle.style.strokeDashoffset = '0';
        statusTitle.textContent = '안전 상태 (NORMAL)';
        statusPill.textContent = '정상 감시 중';
        statusPill.className = 'status-pill state-normal';
        shieldCircle.style.background = '#ECFDF5';
        shieldCircle.style.color = '#10B981';
        gaugeStateText.textContent = '정상';
        gaugeSubText.textContent = '침입/이상 없음';
        statusCardBg.style.background = 'linear-gradient(145deg, #FFFFFF 0%, #F0FDF4 100%)';
        boundingBox.classList.remove('active');
        detectedObjectText.textContent = '없음';
        break;

      case 'WATCH':
        gaugeCircle.style.stroke = '#F59E0B';
        gaugeCircle.style.strokeDashoffset = `${totalDash * 0.35}`;
        statusTitle.textContent = '주의 상태 (WATCH)';
        statusPill.textContent = '외부인 접근 감지';
        statusPill.className = 'status-pill state-watch';
        shieldCircle.style.background = '#FEF3C7';
        shieldCircle.style.color = '#F59E0B';
        gaugeStateText.textContent = '감시 중';
        gaugeSubText.textContent = '카메라 사람 감지';
        statusCardBg.style.background = 'linear-gradient(145deg, #FFFFFF 0%, #FFFBEB 100%)';
        boundingBox.classList.add('active');
        detectedObjectText.textContent = '외부인 1명';
        break;

      case 'WARNING':
        gaugeCircle.style.stroke = '#EA580C';
        gaugeCircle.style.strokeDashoffset = `${totalDash * 0.65}`;
        statusTitle.textContent = '경고 상태 (WARNING)';
        statusPill.textContent = '열림 + 접근 중';
        statusPill.className = 'status-pill state-warning';
        shieldCircle.style.background = '#FFEDD5';
        shieldCircle.style.color = '#EA580C';
        gaugeStateText.textContent = '경고';
        gaugeSubText.textContent = '미확인 문 열림!';
        statusCardBg.style.background = 'linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 100%)';
        boundingBox.classList.add('active');
        detectedObjectText.textContent = '외부인 1명';
        break;

      case 'INTRUSION':
        gaugeCircle.style.stroke = '#E11D48';
        gaugeCircle.style.strokeDashoffset = `${totalDash * 0.95}`;
        statusTitle.textContent = '침입 심각 (INTRUSION)';
        statusPill.textContent = '비상 결박 작동!';
        statusPill.className = 'status-pill state-intrusion';
        shieldCircle.style.background = '#FFE4E6';
        shieldCircle.style.color = '#E11D48';
        gaugeStateText.textContent = '침입 발생!';
        gaugeSubText.textContent = '자동 강철 암 결박 실행';
        statusCardBg.style.background = 'linear-gradient(145deg, #FFFFFF 0%, #FFF1F2 100%)';
        boundingBox.classList.add('active');
        detectedObjectText.textContent = '침입자 감지!';
        break;
    }

    // 2. 결박 및 문 상태 업데이트
    if (state.isLocked) {
      textLock.textContent = '자동 결박됨';
      textLock.style.color = '#10B981';
      lockIconWrapper.classList.add('active');
      lockToggleSwitch.classList.add('active');
      quickLockStatus.textContent = '강철 암이 문을 결박함';
    } else {
      textLock.textContent = '결박 해제됨';
      textLock.style.color = '#64748B';
      lockIconWrapper.classList.remove('active');
      lockToggleSwitch.classList.remove('active');
      quickLockStatus.textContent = '터치하여 즉시 결박';
    }

    if (state.doorOpen) {
      textDoor.textContent = `열림 (${state.doorAngle}°)`;
      textDoor.style.color = '#EA580C';
    } else {
      textDoor.textContent = `닫힘 (0°)`;
      textDoor.style.color = '#0F172A';
    }

    // 3. 이벤트 로그 타임라인 재렌더링
    renderEvents();
  }

  // --- Push Notification Handler ---
  function triggerPushNotification(title, body) {
    pushTitle.textContent = title;
    pushBody.textContent = body;
    pushNotification.classList.add('active');
    setTimeout(() => {
      pushNotification.classList.remove('active');
    }, 4500);
  }

  // --- Add New Event Log ---
  function addEventLog(type, title) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    state.events.unshift({
      id: Date.now(),
      type,
      title,
      time: timeStr
    });
    if (state.events.length > 8) state.events.pop();
    renderEvents();
  }

  function renderEvents() {
    eventList.innerHTML = '';
    state.events.forEach(evt => {
      const item = document.createElement('div');
      item.className = 'event-item';

      let iconName = 'info';
      let typeClass = 'type-normal';

      if (evt.type === 'intrusion') {
        iconName = 'shield-alert';
        typeClass = 'type-intrusion';
      } else if (evt.type === 'warning') {
        iconName = 'alert-triangle';
        typeClass = 'type-warning';
      } else if (evt.type === 'watch') {
        iconName = 'user-check';
        typeClass = 'type-watch';
      } else {
        iconName = 'check-circle';
        typeClass = 'type-normal';
      }

      item.innerHTML = `
        <div class="event-icon-box ${typeClass}">
          <i data-lucide="${iconName}"></i>
        </div>
        <div class="event-details">
          <div class="event-title-text">${evt.title}</div>
          <div class="event-time-text">${evt.time}</div>
        </div>
      `;
      eventList.appendChild(item);
    });
    if (window.lucide) lucide.createIcons();
  }

  // --- Log Console ---
  function logSim(msg) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    simConsole.innerHTML += `<br>[${timeStr}] ${msg}`;
    simConsole.scrollTop = simConsole.scrollHeight;
  }

  // --- Quick Control Interactivity ---
  btnToggleLock.addEventListener('click', () => {
    state.isLocked = !state.isLocked;
    const actionStr = state.isLocked ? '결박(LOCKED)' : '해제(UNLOCKED)';
    logSim(`[MQTT CMD] sg/device_01/cmd -> {"action": "lock", "status": "${actionStr}"}`);
    renderApp();
  });

  // Angle Presets
  const presetChips = document.querySelectorAll('.preset-chip');
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const angle = parseInt(chip.getAttribute('data-angle'), 10);
      state.doorAngle = angle;
      document.getElementById('angle-display-value').textContent = `현재 ${angle}° 설정`;
      logSim(`[PATCH /devices/1/angle] 개방 제한 각도 ${angle}° 변경 완료`);
      renderApp();
    });
  });

  // --- Simulator Buttons (4-State Transitions) ---
  document.getElementById('sim-btn-normal').addEventListener('click', () => {
    state.systemState = 'NORMAL';
    state.doorOpen = false;
    state.isLocked = false;
    state.hasPerson = false;
    logSim('[EVENT] 상태: NORMAL | 문 닫힘, 경계 중');
    addEventLog('normal', '정상 관제 복귀');
    renderApp();
  });

  document.getElementById('sim-btn-watch').addEventListener('click', () => {
    state.systemState = 'WATCH';
    state.hasPerson = true;
    logSim('[MQTT EVENT] sg/device_01/event -> {"type": "person_detected", "confidence": 0.98}');
    triggerPushNotification('사람 접근 감지!', '카메라가 현관 앞에 접근한 외부인을 감지했습니다.');
    addEventLog('watch', 'AI 카메라 외부인 감지 (Confidence 98%)');
    renderApp();
  });

  document.getElementById('sim-btn-warning').addEventListener('click', () => {
    state.systemState = 'WARNING';
    state.doorOpen = true;
    state.hasPerson = true;
    logSim('[MQTT EVENT] sg/device_01/event -> {"type": "door_open", "angle": 30}');
    triggerPushNotification('문 열림 경고!', '외부인 접근 상태에서 현관문이 열렸습니다!');
    addEventLog('warning', '주의: 접근 중 문 열림 감지 (각도 30°)');
    renderApp();
  });

  document.getElementById('sim-btn-intrusion').addEventListener('click', () => {
    state.systemState = 'INTRUSION';
    state.doorOpen = true;
    state.isLocked = true; // 침입 시 자동 결박!
    state.hasPerson = true;
    logSim('[CRITICAL INTRUSION] 연속 충격 2.4G 감지 -> 강철 암 자동 결박 실행! SMS 발송 중...');
    triggerPushNotification('🚨 침입 경보 발생!', '강한 충격 감지! 강철 암 결박 및 비상 SMS 발송이 완료되었습니다.');
    addEventLog('intrusion', '🚨 비상: 침입 확정! 강철 암 자동 결박 실행');
    renderApp();
  });

  // --- Settings Modal Logic ---
  function openModal() {
    settingsModal.classList.add('active');
    renderPhoneChips();
  }
  function closeModal() {
    settingsModal.classList.remove('active');
  }

  btnSettings.addEventListener('click', openModal);
  if (navSettings) navSettings.addEventListener('click', openModal);
  btnCloseModal.addEventListener('click', closeModal);

  btnAddPhone.addEventListener('click', () => {
    const val = inputPhone.value.trim();
    if (val && !state.smsNumbers.includes(val)) {
      state.smsNumbers.push(val);
      inputPhone.value = '';
      renderPhoneChips();
    }
  });

  function renderPhoneChips() {
    phoneChipList.innerHTML = '';
    state.smsNumbers.forEach((num, index) => {
      const chip = document.createElement('div');
      chip.className = 'phone-chip';
      chip.innerHTML = `
        <span>${num}</span>
        <i data-lucide="x-circle" class="chip-remove" data-index="${index}"></i>
      `;
      phoneChipList.appendChild(chip);
    });

    document.querySelectorAll('.chip-remove').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        state.smsNumbers.splice(idx, 1);
        renderPhoneChips();
      });
    });

    if (window.lucide) lucide.createIcons();
  }

  btnSaveSettings.addEventListener('click', () => {
    logSim(`[SETTINGS SAVE] 비상 SMS 목록: [${state.smsNumbers.join(', ')}] 저장완료`);
    closeModal();
  });

  // Range slider label
  const rangeSens = document.getElementById('range-sensitivity');
  if (rangeSens) {
    rangeSens.addEventListener('input', (e) => {
      document.getElementById('sensitivity-val').textContent = e.target.value;
    });
  }

  // --- Initial Render ---
  renderApp();
});
