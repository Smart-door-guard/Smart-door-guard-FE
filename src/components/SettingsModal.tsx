import React, { useState } from 'react';
import { X, XCircle } from 'lucide-react';
import { DeviceSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: DeviceSettings;
  onClose: () => void;
  onSave: (newSettings: DeviceSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
}) => {
  const [smsNumbers, setSmsNumbers] = useState<string[]>(settings.smsNumbers);
  const [sensitivity, setSensitivity] = useState<number>(settings.sensitivity);
  const [nightMode, setNightMode] = useState<boolean>(settings.nightMode);
  const [phoneInput, setPhoneInput] = useState<string>('');

  if (!isOpen) return null;

  const handleAddPhone = () => {
    if (phoneInput.trim() && !smsNumbers.includes(phoneInput.trim())) {
      setSmsNumbers([...smsNumbers, phoneInput.trim()]);
      setPhoneInput('');
    }
  };

  const handleRemovePhone = (num: string) => {
    setSmsNumbers(smsNumbers.filter((item) => item !== num));
  };

  const handleSave = () => {
    onSave({
      smsNumbers,
      sensitivity,
      nightMode,
    });
    onClose();
  };

  return (
    <div class="modal-overlay active">
      <div class="modal-content">
        <div class="modal-header">
          <h3>스마트 가드 경계 설정</h3>
          <button class="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">비상 SMS 수신 번호</label>
            <div class="input-with-btn">
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

          <div class="form-group">
            <label class="form-label">충격 감지 민감도 (단계: {sensitivity})</label>
            <input
              type="range"
              min="1"
              max="5"
              value={sensitivity}
              class="form-range"
              onChange={(e) => setSensitivity(Number(e.target.value))}
            />
            <div class="range-labels">
              <span>둔감 (1)</span>
              <span>보통 (3)</span>
              <span>민감 (5)</span>
            </div>
          </div>

          <div class="form-group flex-between">
            <div>
              <div class="form-label">야간 심야 자동 결박</div>
              <div class="form-subtext">23:00 ~ 06:00 미확인 열림 시 즉시 결박</div>
            </div>
            <div
              class={`toggle-switch ${nightMode ? 'active' : ''}`}
              onClick={() => setNightMode(!nightMode)}
            >
              <div class="toggle-handle" />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-primary" onClick={handleSave}>설정 저장</button>
        </div>
      </div>
    </div>
  );
};
