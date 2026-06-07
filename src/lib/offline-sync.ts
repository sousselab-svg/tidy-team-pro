import { readQueue, removeFromQueue, type QueuedJobPatch } from "@/lib/offline";

export { useOnlineStatus, useQueueSize } from "@/lib/offline";

/**
 * Walk the offline queue once and try to replay each entry. Entries that
 * succeed are removed from the queue; failures stay queued for the next
 * online event.
 */
export async function drainQueueOnce(
  send: (entry: QueuedJobPatch) => Promise<unknown>,
): Promise<{ synced: number; failed: number }> {
  const items = readQueue();
  let synced = 0;
  let failed = 0;
  for (const entry of items) {
    try {
      await send(entry);
      removeFromQueue(entry.id);
      synced++;
    } catch {
      failed++;
    }
  }
  return { synced, failed };
}
