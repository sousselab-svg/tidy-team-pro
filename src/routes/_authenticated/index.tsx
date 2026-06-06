import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { ArrowUpRight, BarChart3, Bell, Calendar, FileText, MapPin, Plus, ShieldCheck, Star, Wallet, Briefcase, Repeat, Gift, Sparkles, Route as RouteIcon, Brain } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { getMyContext } from "@/lib/team-users.functions";
import { useTranslation } from "react-i18next";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard — CleanOps" },
      { name: "description", content: "Daily operations overview." },
    ],
  }),
  component: Dashboard,
});

const statsQuery = queryOptions({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats() });

function Dashboard() {
  const { t } = useTranslation();
  const STATUS_TINT: Record<string, string> = {
    scheduled: "var(--muted-foreground)",
    on_way: "var(--warning)",
    in_progress: "var(--info)",
    completed: "var(--success)",
    cancelled: "var(--destructive)",
  };
  const fn = useServerFn(getDashboardStats);
  const meFn = useServerFn(getMyContext);
  const navigate = useNavigate();
  const { data: me } = useQuery({ queryKey: ["my-context"], queryFn: () => meFn(), staleTime: 60_000, retry: false });
  const isOperator = me?.role === "operator";

  useEffect(() => {
    if (isOperator) navigate({ to: "/agenda", replace: true });
  }, [isOperator, navigate]);

  const { data, isLoading } = useQuery({
    ...statsQuery,
    queryFn: () => fn(),
    enabled: !isOperator,
  });

  if (isOperator) {
    return (
      <MobileShell>
        <div className="p-8 text-center text-sm text-muted-foreground">{t("dashboard.redirecting")}</div>
      </MobileShell>
    );
  }

  const todayJobs = data?.todayJobs ?? [];
  const upcoming = data?.upcomingJobs ?? [];

  return (
    <MobileShell>
      <PageHeader
        eyebrow={t("brand")}
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
        right={
          <Link
            to="/lembretes"
            className="relative grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"
            aria-label={t("nav.reminders")}
          >
            <Bell className="size-5" />
            {(data?.pendingProofsCount ?? 0) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {data!.pendingProofsCount}
              </span>
            )}
          </Link>
        }
      />

      <section className="px-5">
        <div className="rounded-3xl bg-foreground p-5 text-background shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest opacity-70">{t("dashboard.monthRevenue")}</p>
            <span className="flex items-center gap-1 text-xs font-semibold text-[color:var(--success)]">
              <ArrowUpRight className="size-3" /> {formatCurrency(data?.todayRevenueCents ?? 0)} {t("dashboard.todaySuffix")}
            </span>
          </div>
          <p className="mt-2 text-4xl font-bold tracking-tight">
            {isLoading ? "…" : formatCurrency(data?.monthRevenueCents ?? 0)}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">{data?.todayJobsTotal ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">{t("dashboard.today")}</p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-lg font-bold">{data?.todayJobsActive ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">{t("dashboard.inField")}</p>
            </div>
            <div>
              <p className="text-lg font-bold">{data?.todayJobsCompleted ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">{t("dashboard.completed")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="grid grid-cols-3 gap-3">
          <KpiCard
            to="/faturamento"
            Icon={Wallet}
            tint="var(--info)"
            value={formatCurrency(data?.openInvoicesSumCents ?? 0)}
            label={t("dashboard.openInvoices", { count: data?.openInvoicesCount ?? 0 })}
          />
          <KpiCard
            to="/orcamentos"
            Icon={FileText}
            tint="var(--warning)"
            value={String(data?.pendingQuotesCount ?? 0)}
            label={t("dashboard.quotesToApprove")}
          />
          <KpiCard
            to="/agenda"
            Icon={Calendar}
            tint="var(--primary)"
            value={String(data?.todayJobsTotal ?? 0)}
            label={t("dashboard.todayJobs")}
          />
        </div>
      </section>

      {(data?.pendingProofsCount ?? 0) > 0 && (
        <section className="px-5 pt-5">
          <Link
            to="/faturamento"
            className="block rounded-2xl bg-[color:var(--warning)]/10 p-4 ring-1 ring-[color:var(--warning)]/30"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--warning)]">
              {t("dashboard.proofsPending", { count: data!.pendingProofsCount })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.tapToReview")}</p>
          </Link>
        </section>
      )}

      <section className="px-5 pt-5">
        <Link
          to="/relatorios"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
              <BarChart3 className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold">{t("dashboard.reportsTitle")}</p>
              <p className="text-[11px] text-muted-foreground">{t("dashboard.reportsSubtitle")}</p>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground" />
        </Link>
      </section>

      <section className="px-5 pt-3">
        <Link
          to="/servicos"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-[color:var(--info)]/15 text-[color:var(--info)]">
              <Briefcase className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold">{t("dashboard.catalogTitle")}</p>
              <p className="text-[11px] text-muted-foreground">{t("dashboard.catalogSubtitle")}</p>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground" />
        </Link>
      </section>

      <section className="px-5 pt-3">
        <Link
          to="/nps"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-[color:var(--warning)]/15 text-[color:var(--warning)]">
              <Star className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold">{t("dashboard.npsTitle")}</p>
              <p className="text-[11px] text-muted-foreground">{t("dashboard.npsSubtitle")}</p>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground" />
        </Link>
      </section>

      <section className="px-5 pt-3">
        <Link
          to="/permissoes"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-sm font-bold">{t("dashboard.permsTitle")}</p>
              <p className="text-[11px] text-muted-foreground">{t("dashboard.permsSubtitle")}</p>
            </div>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground" />
        </Link>
      </section>

      <section className="px-5 pt-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Growth
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <Link to="/recorrencia" className="flex flex-col items-start gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
            <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
              <Repeat className="size-4" />
            </span>
            <p className="text-[11px] font-bold leading-tight">Recurring</p>
          </Link>
          <Link to="/indicacoes" className="flex flex-col items-start gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
            <span className="grid size-9 place-items-center rounded-full bg-[color:var(--warning)]/15 text-[color:var(--warning)]">
              <Gift className="size-4" />
            </span>
            <p className="text-[11px] font-bold leading-tight">Referrals</p>
          </Link>
          <Link to="/reativacao" className="flex flex-col items-start gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
            <span className="grid size-9 place-items-center rounded-full bg-[color:var(--info)]/15 text-[color:var(--info)]">
              <Sparkles className="size-4" />
            </span>
            <p className="text-[11px] font-bold leading-tight">Win-back</p>
          </Link>
          <Link to="/operacao" className="flex flex-col items-start gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
            <span className="grid size-9 place-items-center rounded-full bg-[color:var(--success)]/15 text-[color:var(--success)]">
              <RouteIcon className="size-4" />
            </span>
            <p className="text-[11px] font-bold leading-tight">Route opt.</p>
          </Link>
          <Link to="/inteligencia" className="flex flex-col items-start gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
            <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
              <Brain className="size-4" />
            </span>
            <p className="text-[11px] font-bold leading-tight">AI Intel</p>
          </Link>
        </div>
      </section>

      <section className="px-5 pt-7">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-bold text-foreground">{t("dashboard.todayHeader")}</h2>
          <Link to="/agenda" className="text-xs font-semibold text-primary">{t("dashboard.viewSchedule")}</Link>
        </div>
        {todayJobs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
            <p className="text-sm font-semibold">{t("dashboard.nothingScheduled")}</p>
            <Link
              to="/agenda"
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              <Plus className="size-3" /> {t("dashboard.scheduleJob")}
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {todayJobs.map((job) => (
              <JobLi key={job.id} job={job} statusTint={STATUS_TINT} />
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="px-5 pt-7">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-sm font-bold text-foreground">{t("dashboard.upcoming")}</h2>
          </div>
          <ul className="space-y-3">
            {upcoming.map((job) => (
              <JobLi key={job.id} job={job} showDate statusTint={STATUS_TINT} />
            ))}
          </ul>
        </section>
      )}
    </MobileShell>
  );
}

function KpiCard({
  to,
  Icon,
  tint,
  value,
  label,
}: {
  to: "/faturamento" | "/orcamentos" | "/agenda";
  Icon: React.ComponentType<{ className?: string }>;
  tint: string;
  value: string;
  label: string;
}) {
  return (
    <Link to={to} className="flex flex-col gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
      <span
        className="grid size-9 place-items-center rounded-full"
        style={{ backgroundColor: `color-mix(in oklab, ${tint} 15%, transparent)`, color: tint }}
      >
        <Icon className="size-4" />
      </span>
      <p className="text-sm font-bold leading-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">{label}</p>
    </Link>
  );
}

function JobLi({ job, showDate = false, statusTint }: { job: { id: string; title: string; scheduled_at: string; status: string; address: string | null; price_cents: number; client_name: string | null }; showDate?: boolean; statusTint: Record<string, string> }) {
  const { t } = useTranslation();
  const dt = new Date(job.scheduled_at);
  const tint = statusTint[job.status] ?? statusTint.scheduled;
  const label = t(`status.${job.status}` as const, { defaultValue: job.status });
  const when = showDate ? formatDateTime(dt) : formatTime(dt);
  return (
    <li>
      <Link
        to="/agenda/$jobId"
        params={{ jobId: job.id }}
        className="block rounded-2xl bg-card p-4 ring-1 ring-border"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">{when}</p>
            <h3 className="mt-0.5 truncate text-base font-semibold text-foreground">{job.title}</h3>
            {job.client_name && (
              <p className="truncate text-sm text-muted-foreground">{job.client_name}</p>
            )}
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase"
            style={{
              backgroundColor: `color-mix(in oklab, ${tint} 15%, transparent)`,
              color: tint,
            }}
          >
            {label}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{job.address || "—"}</span>
          </span>
          <span className="font-semibold text-foreground">{formatCurrency(job.price_cents)}</span>
        </div>
      </Link>
    </li>
  );
}