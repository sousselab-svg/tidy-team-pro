import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCheck, Inbox } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications.functions";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyNotifications);
  const markFn = useServerFn(markNotificationRead);
  const markAllFn = useServerFn(markAllNotificationsRead);
  const { data } = useQuery({ queryKey: ["my-notifications"], queryFn: () => listFn() });

  const markMut = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-notifications"] }),
  });
  const allMut = useMutation({
    mutationFn: () => markAllFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-notifications"] });
      toast.success("Tudo marcado como lido");
    },
  });

  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Inbox"
        title="Notificações"
        subtitle={unread > 0 ? `${unread} não lida(s)` : "Tudo em dia"}
        right={
          unread > 0 ? (
            <button
              onClick={() => allMut.mutate()}
              className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"
              aria-label="Marcar todas como lidas"
            >
              <CheckCheck className="size-5" />
            </button>
          ) : null
        }
      />
      <section className="px-5 pb-24 space-y-2">
        {items.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            <Inbox className="mx-auto mb-2 size-6 opacity-60" />
            Nenhuma notificação ainda.
          </div>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.read_at && markMut.mutate(n.id)}
            className={`w-full text-left rounded-2xl border p-4 transition ${
              n.read_at
                ? "border-border bg-card"
                : "border-primary/40 bg-primary/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{n.title}</div>
                {n.body && (
                  <div className="mt-1 text-sm text-muted-foreground">{n.body}</div>
                )}
                <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {formatDateTime(n.created_at)}
                </div>
              </div>
              {!n.read_at && (
                <span className="mt-1 size-2 rounded-full bg-primary" aria-hidden />
              )}
            </div>
          </button>
        ))}
      </section>
    </MobileShell>
  );
}