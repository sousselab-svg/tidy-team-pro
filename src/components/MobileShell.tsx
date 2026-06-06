import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Calendar, Radio, Users, FileText, Wallet, LogOut, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPendingProofsCount } from "@/lib/dashboard.functions";

const nav = [
  { to: "/", label: "Painel", Icon: Home },
  { to: "/agenda", label: "Agenda", Icon: Calendar },
  { to: "/dispatch", label: "Dispatch", Icon: Radio },
  { to: "/clientes", label: "Clientes", Icon: Users },
  { to: "/orcamentos", label: "Orçamentos", Icon: FileText },
  { to: "/faturamento", label: "Finanças", Icon: Wallet },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fn = useServerFn(getPendingProofsCount);
  const { data } = useQuery({
    queryKey: ["pending-proofs-count"],
    queryFn: () => fn().catch(() => ({ count: 0 })),
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const proofsCount = data?.count ?? 0;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[480px] min-h-screen pb-24">{children}</div>
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <ul className="mx-auto flex max-w-[480px] items-stretch justify-between px-2 pt-2 pb-5">
          {nav.map(({ to, label, Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            const showBadge = to === "/faturamento" && proofsCount > 0;
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className="flex flex-col items-center gap-0.5 py-1 text-[9px] font-semibold uppercase tracking-tight"
                >
                  <span className="relative">
                    <Icon
                      className="size-5"
                      style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }}
                    />
                    {showBadge && (
                      <span className="absolute -top-1 -right-2 grid min-w-4 h-4 px-1 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                        {proofsCount}
                      </span>
                    )}
                  </span>
                  <span style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="px-5 pt-8 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {right}
          <Link
            to="/configuracoes"
            aria-label="Configurações"
            className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"
          >
            <Settings className="size-4" />
          </Link>
          <button
            onClick={signOut}
            aria-label="Sair"
            className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}