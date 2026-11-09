import { LiveSnapshotSchema, liveStatus, type LiveSnapshot, type LiveStatus } from '@p1/shared';
import { useEffect, useState } from 'react';
import { api } from '../api/client';

const RECONNECT_MS = 5_000;
const SSE_RETRY_AFTER_FALLBACK_MS = 60_000;
const POLL_MS = 15_000;
const FAILURES_BEFORE_POLLING = 3;

interface Received {
  snapshot: LiveSnapshot;
  receivedAt: number;
}

export interface LiveState {
  snapshot?: LiveSnapshot;
  /** Age of the latest point now, counting on from the server's `ageSec`. */
  ageSec?: number;
  status?: LiveStatus;
}

/**
 * Live values over SSE. Re-checks the session when the stream closes (the API may have
 * restarted), falls back to polling after repeated failures, and ages the last value every
 * second so a silent stream still turns "stale" and later "offline".
 */
export function useLiveSnapshot(enabled: boolean): LiveState {
  const [received, setReceived] = useState<Received>();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let source: EventSource | undefined;
    let failures = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const accept = (snapshot: LiveSnapshot) => setReceived({ snapshot, receivedAt: Date.now() });

    const poll = async () => {
      const result = await api.getLive();
      if (!stopped && result.ok) accept(result.data);
    };
    const startPolling = () => {
      if (pollTimer) return;
      void poll();
      pollTimer = setInterval(() => void poll(), POLL_MS);
    };
    const stopPolling = () => {
      clearInterval(pollTimer);
      pollTimer = undefined;
    };

    const connect = async () => {
      if (stopped) return;
      // Verifies the session and silently reopens it when the API forgot it.
      const check = await api.getCapabilities();
      const url = api.streamUrl();
      if (stopped) return;
      if (!check.ok || !url) {
        scheduleReconnect();
        return;
      }
      source = new EventSource(url);
      source.addEventListener('live', (event: MessageEvent<string>) => {
        const parsed = LiveSnapshotSchema.safeParse(JSON.parse(event.data));
        if (!parsed.success) return;
        failures = 0;
        stopPolling();
        accept(parsed.data);
      });
      source.addEventListener('error', () => {
        // CONNECTING means the browser retries by itself; CLOSED means it gave up.
        if (source?.readyState !== EventSource.CLOSED) return;
        source.close();
        scheduleReconnect();
      });
    };

    const scheduleReconnect = () => {
      failures++;
      if (failures >= FAILURES_BEFORE_POLLING) startPolling();
      const delay =
        failures >= FAILURES_BEFORE_POLLING ? SSE_RETRY_AFTER_FALLBACK_MS : RECONNECT_MS;
      reconnectTimer = setTimeout(() => void connect(), delay);
    };

    void connect();
    return () => {
      stopped = true;
      source?.close();
      clearTimeout(reconnectTimer);
      stopPolling();
    };
  }, [enabled]);

  if (!received) return {};
  const ageSec = Math.max(0, received.snapshot.ageSec + (now - received.receivedAt) / 1000);
  return { snapshot: received.snapshot, ageSec, status: liveStatus(ageSec) };
}
