import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Inbox } from "lucide-react";
import { listMyNotifications } from "@/lib/notifications.functions";

export function NotificationsBell() {
  const fn = useServerFn(listMyNotifications);
  const { data } = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
  });
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  return (
    <Link
      to="/notificacoes"
      aria-label="Notificações"
      className="relative grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"
    >
      <Inbox className="size-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}