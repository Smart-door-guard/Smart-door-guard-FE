import React, { useEffect, useState } from "react";
import { fetchEvents, type ServerEvent } from "../api/client";
export function ServerHistory() {
  const [items, setItems] = useState<ServerEvent[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load(more = false) {
    setBusy(true);
    setError("");
    try {
      const result = await fetchEvents(
        more ? (cursor ?? undefined) : undefined,
      );
      setItems((old) => (more ? [...old, ...result.items] : result.items));
      setCursor(result.nextCursor);
    } catch (e) {
      setError((e as { reason?: string }).reason ?? "이력 조회 실패");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <section className="section-container">
      <h3>서버 이벤트 이력</h3>
      <button disabled={busy} onClick={() => void load()}>
        새로고침
      </button>
      <p role="alert">{error}</p>
      {busy && <p role="status">조회 중…</p>}
      {!busy && !items.length && !error && <p>저장된 이벤트가 없습니다.</p>}
      <div className="event-list">
        {items.map((e) => (
          <div className="event-item" key={e.id}>
            <div className="event-details">
              <div className="event-title-text">{e.title}</div>
              <time className="event-time-text">
                {new Date(e.at).toLocaleString()}
              </time>
            </div>
          </div>
        ))}
      </div>
      {cursor && (
        <button disabled={busy} onClick={() => void load(true)}>
          이전 기록 더 보기
        </button>
      )}
    </section>
  );
}
