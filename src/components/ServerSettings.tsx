import { SensorDiagnostics } from "./SensorDiagnostics";
import React, { useEffect, useState } from "react";
import {
  fetchSession,
  fetchTuning,
  saveTuning,
  type TuningView,
} from "../api/client";
export function ServerSettings() {
  const [value, setValue] = useState<TuningView["current"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("서버 설정 조회 중…");
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const session = await fetchSession();
        if (session.role !== "operator") {
          if (alive)
            setMessage("설정 변경은 운영자 QR로 접속해야 합니다.");
          return;
        }
        const settings = await fetchTuning();
        if (alive) {
          setValue(settings.current);
          setMessage("");
        }
      } catch (e) {
        if (alive)
          setMessage((e as { reason?: string }).reason ?? "설정 조회 실패");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage((e as { reason?: string }).reason ?? "요청 실패");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="galaxy-setting-group server-tuning">
      <SensorDiagnostics />
      <h3>센서 감지 설정</h3>
      <p role="status">{message}</p>
      {value && (
        <>
          <p>
            감지 설정은 서버에 저장됩니다. ESP32 로컬 충격 임계값은 펌웨어에서
            별도로 설정합니다. 새 펌웨어는 가속도와 거리 변화가 동시에 충족된 충격만 전송합니다. 서버 임계값을 보드보다 낮춰도 감도가 더 높아지지는 않습니다.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const saved = await saveTuning({
                  shockThresholdMps2: value.shockThresholdMps2,
                  shockDistanceDeltaMm: value.shockDistanceDeltaMm,
                  shockCount: value.shockCount,
                  shockWindowMs: value.shockWindowMs,
                  autoAction: value.autoAction,
                  autoDurationMs: value.autoDurationMs,
                });
                setValue(saved.current);
                setMessage("서버 설정 저장 완료");
              });
            }}
          >
            <fieldset disabled={busy}>
              <label>거리 변화 임계값 (mm) <input type="number" min="0.1" max="8190" step="0.1" required value={value.shockDistanceDeltaMm} onChange={e => setValue({...value, shockDistanceDeltaMm: Number(e.target.value)})} /></label>
              <br />
              <label>
                충격 임계값 (m/s²){" "}
                <input
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  required
                  value={value.shockThresholdMps2}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      shockThresholdMps2: Number(e.target.value),
                    })
                  }
                />
              </label>
              <br />
              <label>
                판정 구간 (ms){" "}
                <input
                  type="number"
                  min="100"
                  max="600000"
                  required
                  value={value.shockWindowMs}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      shockWindowMs: Number(e.target.value),
                    })
                  }
                />
              </label>
              <br />
              <label>
                충격 횟수{" "}
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={value.shockCount}
                  onChange={(e) =>
                    setValue({ ...value, shockCount: Number(e.target.value) })
                  }
                />
              </label>
              <br />
              <label>
                서버 자동 출력{" "}
                <select
                  value={value.autoAction}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      autoAction: e.target.value as "buzzer" | "solenoid",
                    })
                  }
                >
                  <option value="buzzer">부저</option>
                  <option value="solenoid">솔레노이드</option>
                </select>
              </label>
              <br />
              <label>
                출력 시간 (ms){" "}
                <input
                  type="number"
                  min="50"
                  max="1000"
                  required
                  value={value.autoDurationMs}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      autoDurationMs: Number(e.target.value),
                    })
                  }
                />
              </label>
              <br />
              <button type="submit">서버에 저장</button>
            </fieldset>
          </form>
        </>
      )}
    </section>
  );
}
