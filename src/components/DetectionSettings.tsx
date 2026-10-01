import React, { useEffect, useState } from 'react';
import { Activity, DoorOpen } from 'lucide-react';
import {
  calibrateDoor,
  fetchDoor,
  fetchSensors,
  fetchTuning,
  saveImpactThreshold,
  type DoorStatus,
} from '../api/client';

const MIN = 1;
const MAX = 40;

/** Detection settings: impact-lock threshold and magnetic door sensor calibration. */
export const DetectionSettings: React.FC = () => {
  const [threshold, setThreshold] = useState<number | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [door, setDoor] = useState<DoorStatus | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<number | null>(null);
  const [recentMax, setRecentMax] = useState<number>(0);
  const peaks = React.useRef<{ at: number; v: number }[]>([]);

  // Live impact strength: the meter the threshold is set against.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const sensors = await fetchSensors();
        const v = sensors.mpu6050.shock_peak_mps2;
        if (!alive) return;
        setLive(v);
        const now = Date.now();
        if (v !== null) peaks.current.push({ at: now, v });
        peaks.current = peaks.current.filter((p) => now - p.at < 3000);
        setRecentMax(peaks.current.reduce((m, p) => Math.max(m, p.v), 0));
      } catch {
        /* keep last */
      } finally {
        if (alive) timer = setTimeout(poll, 250);
      }
    };
    void poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      try {
        const tuning = await fetchTuning();
        if (!alive) return;
        setThreshold(tuning.current.impactThresholdMps2);
        setSaved(tuning.current.impactThresholdMps2);
      } catch {
        /* offline: keep defaults */
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
        <div className="impact-meter" aria-label="실시간 충격 세기">
          <div className="impact-meter-bar">
            <div
              className={`impact-meter-fill ${threshold !== null && recentMax >= threshold ? 'over' : ''}`}
              style={{ width: `${Math.min(100, (recentMax / MAX) * 100)}%` }}
            />
            {threshold !== null && (
              <div className="impact-meter-line" style={{ left: `${(threshold / MAX) * 100}%` }} />
            )}
          </div>
          <div className="range-labels">
            <span>지금 {live === null ? '—' : live.toFixed(1)}</span>
            <span>최근 3초 최대 {recentMax.toFixed(1)} m/s²</span>
          </div>
        </div>
        <input
          type="range"
          min={MIN}
          max={MAX}
          step={0.5}
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
