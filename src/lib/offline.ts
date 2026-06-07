import { useEffect, useState } from "react";

/**
 * Lightweight offline support for operators in the field.
 *
 * - `useOnlineStatus()` reflects `navigator.onLine` + `online`/`offline` events.
 * - `readCache` / `writeCache` persist the last known good payload in
 *   `localStorage` so the agenda + job detail screens render with stale data
 *   when the signal is gone.
 * - `enqueueJobPatch` / `drainJobPatches` queue mutations done offline so they
 *   replay automatically when connectivity comes back.
 *
 * No service worker is shipped — the app shell loads from the device (Capacitor
 * native build) or from the browser cache. This module covers the data layer.
 */

const CACHE_PREFIX = "fs.offline.cache.v1:";
const QUEUE_KEY = "fs.offline.queue.v1";

function ssrSafeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readCache<T>(key: string): T | undefined {
  const s = ssrSafeStorage();
  if (!s) return undefined;
  try {
    const raw = s.getItem(CACHE_PREFIX + key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeCache<T>(key: string, value: T): void {
  const s = ssrSafeStorage();
  if (!s) return;
  try {
    s.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // quota exceeded or serialization error — silently ignore
  }
}

export type QueuedJobPatch = {
  id: string; // queue entry id
  jobId: string;
  patch: Record<string, unknown>;
  queuedAt: number;
};

export function readQueue(): QueuedJobPatch[] {
  const s = ssrSafeStorage();
  if (!s) return [];
  try {
    const raw = s.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedJobPatch[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedJobPatch[]): void {
  const s = ssrSafeStorage();
  if (!s) return;
  try {
    s.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
  // Notify in-tab subscribers (storage event does not fire in same tab)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fs:offline-queue-changed"));
  }
}

export function enqueueJobPatch(jobId: string, patch: Record<string, unknown>): QueuedJobPatch {
  const entry: QueuedJobPatch = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    jobId,
    patch,
    queuedAt: Date.now(),
  };
  const items = readQueue();
  items.push(entry);
  writeQueue(items);
  return entry;
}

export function removeFromQueue(id: string): void {
  writeQueue(readQueue().filter((e) => e.id !== id));
}

export function clearQueue(): void {
  writeQueue([]);
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function useQueueSize(): number {
  const [n, setN] = useState<number>(() => readQueue().length);
  useEffect(() => {
    const refresh = () => setN(readQueue().length);
    window.addEventListener("fs:offline-queue-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("fs:offline-queue-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return n;
}
