import React, { useEffect, useState } from 'react';
import { fetchSensors, fetchDoor, fetchSession, calibrateDoor, resetDoorCalibration, type SensorDiagnostics as Sensors, type DoorStatus } from '../api/client';

export function SensorDiagnostics() {
  const [sensors, setSensors] = useState<Sensors | null>(null);
  const [door, setDoor] = useState<DoorStatus | null>(null);
  const [operator, setOperator] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    void fetchSession().then(s => { if (!stopped) setOperator(s.role === 'operator'); }).catch(() => {});
    async function poll() {
      try {
        const [s, d] = await Promise.all([fetchSensors(), fetchDoor()]);
        if (!stopped) { setSensors(s); setDoor(d); }
      } catch {
        if (!stopped) { setSensors(null); setDoor(null); }
      } finally { if (!stopped) timer = setTimeout(poll, 500); }
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);
  async function observe(state: 'open' | 'closed' | 'reset') {
    setBusy(true); setMessage('');
    try {
      const result = await (state === 'reset' ? resetDoorCalibration() : calibrateDoor(state));
      setDoor(result);
      setMessage(state === 'reset' ? '문 보정 초기화 완료' : result.calibrated && result.pending_observations.length === 0
        ? '열림·닫힘 극성 보정 완료' : '기록했습니다. 반대 상태로 바꾼 뒤 2초 기다리고 기록하세요.');
    } catch (e) { setMessage((e as {reason?: string}).reason ?? '문 보정 실패'); }
    finally { setBusy(false); }
  }
  const fusion = sensors?.shock_detection;
  const known = sensors?.connected && fusion?.valid;
  return <section className="galaxy-setting-group server-tuning">
    <h3>센서·문 상태 점검</h3>
    <p>충격: {known ? 'MPU6050 + VL53L0X 함께 확인' : sensors?.connected && !fusion ? '이전 펌웨어: MPU 단독 감지' : '센서 연결·유효성 확인 필요'}</p>
    <p>가속도 {sensors?.mpu6050.shock_peak_mps2?.toFixed(1) ?? '—'} m/s² · 거리 {sensors?.vl53l0x.distance_mm ?? '—'} mm · 변화 {fusion?.distance_delta_mm?.toFixed(1) ?? '—'} mm</p>
    {fusion && <p>보드 충격 기준: {fusion.accel_threshold_mps2} m/s² + {fusion.distance_threshold_mm} mm / {fusion.coincidence_ms} ms · 확정 {fusion.event_count}회</p>}
    <p>리드 스위치 자석 감지: {door?.door_open === true ? '문 열림' : door?.door_open === false ? '문 닫힘' : '판정 불가'} · 원시 신호 {door?.raw ?? '—'} · {door?.calibrated ? '보정됨' : '보정 필요'}</p>
    <p>자석을 문틀에 고정하고 문을 닫은 상태와 연 상태를 각각 2초 이상 유지한 뒤 기록하세요. 디지털 OUT은 자석 감지 여부이며 실제 거리(mm)가 아닙니다.</p>
    {operator && <fieldset disabled={busy || !sensors?.connected}>
      <button onClick={() => void observe('closed')}>문 닫힘 기록</button>{' '}
      <button onClick={() => void observe('open')}>문 열림 기록</button>{' '}
      <button onClick={() => void observe('reset')}>문 보정 초기화</button>
    </fieldset>}
    <p role="status">{message}</p>
    {!!sensors?.errors?.length && <p>센서 진단: {sensors.errors.join(', ')}</p>}
  </section>;
}
