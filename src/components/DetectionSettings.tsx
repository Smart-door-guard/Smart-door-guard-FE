import React, { useEffect, useState } from 'react';
import { Activity, DoorOpen } from 'lucide-react';
import {
  calibrateDoor,
  fetchDoor,
  fetchSession,
  fetchTuning,
  saveImpactThreshold,
  type DoorStatus,
} from '../api/client';

const MIN = 5;
const MAX = 40;

/** Owner-only detection settings. Renders nothing for audience (QR visitor) sessions. */
export const DetectionSettings: React.FC = () => {
  const [operator, setOperator] = useState(false);
  const [threshold, setThreshold] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [door, setDoor] = useState<DoorStatus | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      try {
        const session = await fetchSession();
        if (!alive || session.role !== 'operator') return;
        setOperator(true);
        const tuning = await fetchTuning();
        if (!alive) return;
        setThreshold(tuning.current.impactThresholdMps2);
        setSaved(tuning.current.impactThresholdMps2);
      } catch {
        /* audience or offline: stay hidden */
      }
    })();
    const pollDoor = async () => {
      try {
        const d = await fetchDoor();
        if (alive) setDoor(d);
      } catch {
        /* keep last */
      } finally {
        if (alive) timer = setTimeout(pollDoor, 1000);
      }
    };
    void pollDoor();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  if (!operator) return null;

  const run = async (action: () => Promise<void>, done: string) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(done);
    } catch (e) {
      setMessage((e as { reason?: string }).reason ?? '실패했습니다');
    } finally {
      setBusy(false);
    }
  };

  const doorText =
    door === null ? '—' : door.door_open === null ? '보정 필요' : door.door_open ? '열림' : '닫힘';

  return (
    <div className="galaxy-setting-group">
      <div className="galaxy-setting-header">감지 설정</div>

      <div className="galaxy-setting-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        <div className="galaxy-item-left">
          <div className="galaxy-item-icon"><Activity size={18} /></div>
          <div>
            <div className="galaxy-item-title">충격 잠금 기준</div>
            <div className="galaxy-item-sub">
              {threshold === null ? '—' : `${threshold} m/s² 이상이면 잠금`}
            </div>
          </div>
        </div>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={1}
          value={threshold ?? 12}
          className="form-range"
          onChange={(e) => setThreshold(Number(e.target.value))}
        />
        <div className="range-labels">
          <span>민감</span>
          <span>둔감</span>
        </div>
        <button
          className="btn-secondary"
          disabled={busy || threshold === null || threshold === saved}
          onClick={() =>
            run(async () => {
              const view = await saveImpactThreshold(threshold as number);
              setSaved(view.current.impactThresholdMps2);
            }, '저장했습니다')
          }
        >
          저장
        </button>
      </div>

      <div className="galaxy-setting-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        <div className="galaxy-item-left">
          <div className="galaxy-item-icon"><DoorOpen size={18} /></div>
          <div>
            <div className="galaxy-item-title">문 센서</div>
            <div className="galaxy-item-sub">{doorText}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            style={{ flex: 1 }}
            disabled={busy}
            onClick={() => run(async () => setDoor(await calibrateDoor('closed')), '닫힘 기록')}
          >
            닫힘 기록
          </button>
          <button
            className="btn-secondary"
            style={{ flex: 1 }}
            disabled={busy}
            onClick={() => run(async () => setDoor(await calibrateDoor('open')), '열림 기록')}
          >
            열림 기록
          </button>
        </div>
      </div>
      {message && <div className="galaxy-item-sub" style={{ padding: '0 16px 12px' }}>{message}</div>}
    </div>
  );
};
