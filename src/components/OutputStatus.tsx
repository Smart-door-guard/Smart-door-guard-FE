import React, { useEffect, useState } from "react";
import { fetchOutputs, type OutputStatus as State } from "../api/client";
export function OutputStatus() {
  const [state, setState] = useState<State | null>(null);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await fetchOutputs();
        if (!stopped) setState(result);
      } catch {
        if (!stopped) setState(null);
      } finally {
        if (!stopped) timer = setTimeout(poll, 500);
      }
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);
  if (!state?.valid) return <p>장치 출력 상태: 확인 불가</p>;
  const label = (on: boolean | null) =>
    on === null ? "확인 불가" : on ? "ON" : "OFF";
  return (
    <div aria-live="polite">
      <p>
        솔레노이드 {label(state.solenoid.active)} · 부저{" "}
        {label(state.buzzer.active)}
      </p>
      <p>
        ESP32 로컬 충격 제어:{" "}
        {state.local_automation_enabled === null
          ? "확인 불가"
          : state.local_automation_enabled
            ? "활성"
            : "비활성"}{" "}
        · 로컬 충격 대응 {state.local_actuations ?? "—"}회 · 로컬 부저 {state.local_buzzer_enabled ? "활성" : "비활성/미확인"}
        · 솔레노이드 작동 {state.solenoid.activation_count ?? "—"}회 (현재 부팅)
      </p>
    </div>
  );
}
