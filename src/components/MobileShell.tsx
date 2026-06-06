import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Calendar, Radio, FileText, Wallet } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Painel", Icon: Home },
  { to: "/agenda", label: "Agenda", Icon: Calendar },
  { to: "/dispatch", label: "Dispatch", Icon: Radio },
  { to: "/orcamentos", label: "Orçamentos", Icon: FileText },
  { to: "/faturamento", label: "Finanças", Icon: Wallet },
] as const;

export function MobileShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[480px] min-h-screen pb-24">{children}</div>
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <ul className="mx-auto flex max-w-[480px] items-stretch justify-between px-3 pt-2 pb-5">
          {nav.map(({ to, label, Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold uppercase tracking-wide"
                >
                  <Icon
                    className="size-5"
                    style={{ color: active ? "var(--primary)" : "var(--muted-foreground)" }}
                  />
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
        {right}
      </div>
    </header>
  );
}