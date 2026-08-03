import React, { useState } from 'react';
import { Shield, PhoneCall, Sliders, Moon, Info, Cpu, XCircle } from 'lucide-react';
import { DeviceSettings } from '../types';

interface SettingsPageProps {
  settings: DeviceSettings;
  onSaveSettings: (newSettings: DeviceSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSaveSettings }) => {
  const [smsNumbers, setSmsNumbers] = useState<string[]>(settings.smsNumbers);
  const [sensitivity, setSensitivity] = useState<number>(settings.sensitivity);
  const [nightMode, setNightMode] = useState<boolean>(settings.nightMode);
  const [phoneInput, setPhoneInput] = useState<string>('');

  const handleAddPhone = () => {
    if (phoneInput.trim() && !smsNumbers.includes(phoneInput.trim())) {
      const updated = [...smsNumbers, phoneInput.trim()];
      setSmsNumbers(updated);
      setPhoneInput('');
      onSaveSettings({ smsNumbers: updated, sensitivity, nightMode });
    }
  };

  const handleRemovePhone = (num: string) => {
    const updated = smsNumbers.filter((item) => item !== num);
    setSmsNumbers(updated);
    onSaveSettings({ smsNumbers: updated, sensitivity, nightMode });
  };

  const handleSensitivityChange = (val: number) => {
    setSensitivity(val);
    onSaveSettings({ smsNumbers, sensitivity: val, nightMode });
  };

  const handleNightModeToggle = () => {
    const updated = !nightMode;
    setNightMode(updated);
    onSaveSettings({ smsNumbers, sensitivity, nightMode: updated });
  };

  return (
    <div class="galaxy-settings-container">
      {/* Profile Card */}
      <div class="galaxy-profile-card">
        <div class="galaxy-avatar">
          <Shield size={28} color="#FFFFFF" />
        </div>
        <div class="galaxy-profile-info">
          <h3>Smart Guard System</h3>
          <p>스마트 문 침입 방지 관제 장치 #01</p>
        </div>
      </div>

      {/* Section 1: Emergency SMS */}
      <div class="galaxy-setting-group">
        <div class="galaxy-setting-header">비상 연락처 관리</div>
        <div class="galaxy-setting-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div class="galaxy-item-left">
            <div class="galaxy-item-icon">
              <PhoneCall size={18} />
            </div>
            <div>
              <div class="galaxy-item-title">비상 SMS 수신 번호</div>
              <div class="galaxy-item-sub">침입 발생 시 즉시 문자를 전송합니다</div>
            </div>
          </div>
          <div class="input-with-btn" style={{ marginTop: 4 }}>
            <input
              type="tel"
              placeholder="010-1234-5678"
              class="form-input"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
            <button class="btn-secondary" onClick={handleAddPhone}>추가</button>
          </div>
          <div class="phone-chip-list">
            {smsNumbers.map((num) => (
              <div key={num} class="phone-chip">
                <span>{num}</span>
                <XCircle size={14} class="chip-remove" onClick={() => handleRemovePhone(num)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Sensitivity & Night Mode */}
      <div class="galaxy-setting-group">
        <div class="galaxy-setting-header">경계 및 보안 옵션</div>
        <div class="galaxy-setting-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div class="galaxy-item-left">
            <div class="galaxy-item-icon">
              <Sliders size={18} />
            </div>
            <div>
              <div class="galaxy-item-title">충격 감지 민감도</div>
              <div class="galaxy-item-sub">현재 <strong>{sensitivity}단계</strong> 설정됨</div>
            </div>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={sensitivity}
            class="form-range"
            onChange={(e) => handleSensitivityChange(Number(e.target.value))}
            style={{ marginTop: 4 }}
          />
          <div class="range-labels">
            <span>1단계 (둔감)</span>
            <span>3단계 (보통)</span>
            <span>5단계 (민감)</span>
          </div>
        </div>

        <div class="galaxy-setting-item">
          <div class="galaxy-item-left">
            <div class="galaxy-item-icon">
              <Moon size={18} />
            </div>
            <div>
              <div class="galaxy-item-title">야간 심야 자동 결박</div>
              <div class="galaxy-item-sub">23:00 ~ 06:00 미확인 열림 시 즉시 결박</div>
            </div>
          </div>
          <div
            class={`toggle-switch ${nightMode ? 'active' : ''}`}
            onClick={handleNightModeToggle}
          >
            <div class="toggle-handle" />
          </div>
        </div>
      </div>

      {/* Section 3: Device Info */}
      <div class="galaxy-setting-group">
        <div class="galaxy-setting-header">장치 시스템 정보</div>
        <div class="galaxy-setting-item">
          <div class="galaxy-item-left">
            <div class="galaxy-item-icon"><Info size={18} /></div>
            <div>
              <div class="galaxy-item-title">소프트웨어 버전</div>
              <div class="galaxy-item-sub">Smart Guard App v1.0.4 (Latest)</div>
            </div>
          </div>
        </div>
        <div class="galaxy-setting-item">
          <div class="galaxy-item-left">
            <div class="galaxy-item-icon"><Cpu size={18} /></div>
            <div>
              <div class="galaxy-item-title">디바이스 펌웨어</div>
              <div class="galaxy-item-sub">ESP32 Firmware v2.1.0-release</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
