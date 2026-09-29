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
    <div className="galaxy-settings-container">
      {/* Profile Card */}
      <div className="galaxy-profile-card">
        <div className="galaxy-avatar">
          <Shield size={28} color="#FFFFFF" />
        </div>
        <div className="galaxy-profile-info">
          <h3>SafeGuard</h3>
          <p>현관문 보조 잠금 장치 #01</p>
        </div>
      </div>

      {/* Section 1: Emergency SMS */}
      <div className="galaxy-setting-group">
        <div className="galaxy-setting-header">비상 연락처 관리</div>
        <div className="galaxy-setting-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div className="galaxy-item-left">
            <div className="galaxy-item-icon">
              <PhoneCall size={18} />
            </div>
            <div>
              <div className="galaxy-item-title">비상 SMS 수신 번호</div>
              <div className="galaxy-item-sub">침입 발생 시 즉시 문자를 전송합니다</div>
            </div>
          </div>
          <div className="input-with-btn" style={{ marginTop: 4 }}>
            <input
              type="tel"
              placeholder="010-1234-5678"
              className="form-input"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
            />
            <button className="btn-secondary" onClick={handleAddPhone}>추가</button>
          </div>
          <div className="phone-chip-list">
            {smsNumbers.map((num) => (
              <div key={num} className="phone-chip">
                <span>{num}</span>
                <XCircle size={14} className="chip-remove" onClick={() => handleRemovePhone(num)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Sensitivity & Night Mode */}
      <div className="galaxy-setting-group">
        <div className="galaxy-setting-header">경계 및 보안 옵션</div>
        <div className="galaxy-setting-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div className="galaxy-item-left">
            <div className="galaxy-item-icon">
              <Sliders size={18} />
            </div>
            <div>
              <div className="galaxy-item-title">충격 감지 민감도</div>
              <div className="galaxy-item-sub">현재 <strong>{sensitivity}단계</strong> 설정됨</div>
            </div>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={sensitivity}
            className="form-range"
            onChange={(e) => handleSensitivityChange(Number(e.target.value))}
            style={{ marginTop: 4 }}
          />
          <div className="range-labels">
            <span>1단계 (둔감)</span>
            <span>3단계 (보통)</span>
            <span>5단계 (민감)</span>
          </div>
        </div>

        <div className="galaxy-setting-item">
          <div className="galaxy-item-left">
            <div className="galaxy-item-icon">
              <Moon size={18} />
            </div>
            <div>
              <div className="galaxy-item-title">야간 심야 자동 결박</div>
              <div className="galaxy-item-sub">23:00 ~ 06:00 미확인 열림 시 즉시 결박</div>
            </div>
          </div>
          <div
            className={`toggle-switch ${nightMode ? 'active' : ''}`}
            onClick={handleNightModeToggle}
          >
            <div className="toggle-handle" />
          </div>
        </div>
      </div>

      {/* Section 3: Device Info */}
      <div className="galaxy-setting-group">
        <div className="galaxy-setting-header">장치 시스템 정보</div>
        <div className="galaxy-setting-item">
          <div className="galaxy-item-left">
            <div className="galaxy-item-icon"><Info size={18} /></div>
            <div>
              <div className="galaxy-item-title">소프트웨어 버전</div>
              <div className="galaxy-item-sub">SafeGuard App v1.0.4 (Latest)</div>
            </div>
          </div>
        </div>
        <div className="galaxy-setting-item">
          <div className="galaxy-item-left">
            <div className="galaxy-item-icon"><Cpu size={18} /></div>
            <div>
              <div className="galaxy-item-title">디바이스 펌웨어</div>
              <div className="galaxy-item-sub">ESP32 Firmware v2.1.0-release</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
