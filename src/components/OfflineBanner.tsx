import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { updateJob } from "@/lib/jobs.functions";
import {
  drainQueueOnce,
  useOnlineStatus,
  useQueueSize,
} from "@/lib/offline-sync";

/**
 * Slim banner shown when the device is offline or has pending queued
 * mutations. Also triggers a replay attempt every time connectivity returns.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const pending = useQueueSize();
  const qc = useQueryClient();
  const update = useServerFn(updateJob);
  const draining = useRef(false);

  useEffect(() => {
    if (!online || pending === 0 || draining.current) return;
    draining.current = true;
    drainQueueOnce(async (entry) => {
      await update({ data: { id: entry.jobId, patch: entry.patch as never } });
    })
      .then((result) => {
        if (result.synced > 0) {
          qc.invalidateQueries({ queryKey: ["jobs"] });
          qc.invalidateQueries({ queryKey: ["job"] });
          toast.success(`${result.synced} alteração(ões) sincronizada(s)`);
        }
        if (result.failed > 0) {
          toast.error(`${result.failed} alteração(ões) não puderam ser sincronizadas`);
        }
      })
      .finally(() => {
        draining.current = false;
      });
  }, [online, pending, qc, update]);

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-30 flex items-center justify-center gap-2 px-4 py-1.5 text-[11px] font-semibold"
      style={{
        backgroundColor: online
          ? "color-mix(in oklab, var(--warning) 18%, var(--background))"
          : "color-mix(in oklab, var(--muted-foreground) 18%, var(--background))",
        color: "var(--foreground)",
      }}
    >
      {online ? (
        <>
          <RefreshCw className="size-3.5 animate-spin" />
          Sincronizando {pending} alteração(ões)…
        </>
      ) : (
        <>
          <CloudOff className="size-3.5" />
          Modo offline · dados em cache
          {pending > 0 ? ` · ${pending} pendente(s)` : ""}
        </>
      )}
    </div>
  );
}
