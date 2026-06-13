import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Calendar, Users, FileText, Wallet, LogOut, Settings, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPendingProofsCount } from "@/lib/dashboard.functions";
import { getMyContext } from "@/lib/team-users.functions";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OperatorOnboarding } from "@/components/OperatorOnboarding";

const adminNav = [
  { to: "/", labelKey: "nav.dashboard", Icon: Home },
  { to: "/agenda", labelKey: "nav.schedule", Icon: Calendar },
  { to: "/equipe", labelKey: "nav.team", Icon: UsersRound },
  { to: "/clientes", labelKey: "nav.clients", Icon: Users },
  { to: "/orcamentos", labelKey: "nav.quotes", Icon: FileText },
  { to: "/faturamento", labelKey: "nav.finances", Icon: Wallet },
] as const;

const operatorNav = [
  { to: "/agenda", labelKey: "nav.schedule", Icon: Calendar },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();
  const fn = useServerFn(getPendingProofsCount);
  const ctxFn = useServerFn(getMyContext);
  const { data: me } = useQuery({
    queryKey: ["my-context"],
    queryFn: () => ctxFn(),
    staleTime: 60_000,
    retry: false,
  });
  const nav = me?.role === "operator" ? operatorNav : adminNav;
  const { data } = useQuery({
    queryKey: ["pending-proofs-count"],
    queryFn: () => fn().catch(() => ({ count: 0 })),
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: !!me && me.role !== "operator",
  });
  const proofsCount = data?.count ?? 0;
  return (
    <div className="min-h-[100dvh] bg-background text-foreground overflow-x-hidden">
      <OfflineBanner />
      <OperatorOnboarding />
      <div
        className="mx-auto max-w-[480px] min-h-[100dvh]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
      >
        {children}
      </div>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-[480px] items-stretch justify-between px-2 pt-1.5 pb-1.5">
          {nav.map(({ to, labelKey, Icon }) => {
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
                    {t(labelKey)}
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
  const { t } = useTranslation();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header
      className="px-5 pb-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
    >
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
          <LanguageSwitcher compact />
          <Link
            to="/configuracoes"
            aria-label={t("common.settings")}
            className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"
          >
            <Settings className="size-4" />
          </Link>
          <button
            onClick={signOut}
            aria-label={t("common.signOut")}
            className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}