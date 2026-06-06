import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Bell, Calendar, FileText, MapPin, Plus, Wallet } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { getDashboardStats } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Painel — CleanOps" },
      { name: "description", content: "Resumo operacional do dia." },
    ],
  }),
  component: Dashboard,
});

const statsQuery = queryOptions({ queryKey: ["dashboard-stats"], queryFn: () => getDashboardStats() });

const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const STATUS_LABEL: Record<string, { label: string; tint: string }> = {
  scheduled: { label: "Agendado", tint: "var(--muted-foreground)" },
  on_way: { label: "A caminho", tint: "var(--warning)" },
  in_progress: { label: "Em andamento", tint: "var(--info)" },
  completed: { label: "Concluído", tint: "var(--success)" },
  cancelled: { label: "Cancelado", tint: "var(--destructive)" },
};

function Dashboard() {
  const fn = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({ ...statsQuery, queryFn: () => fn() });

  const todayJobs = data?.todayJobs ?? [];
  const upcoming = data?.upcomingJobs ?? [];

  return (
    <MobileShell>
      <PageHeader
        eyebrow="CleanOps"
        title="Painel"
        subtitle="Resumo da operação"
        right={
          <Link
            to="/faturamento"
            className="relative grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"
            aria-label="Comprovantes pendentes"
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
            <p className="text-xs font-medium uppercase tracking-widest opacity-70">Recebido no mês</p>
            <span className="flex items-center gap-1 text-xs font-semibold text-[color:var(--success)]">
              <ArrowUpRight className="size-3" /> {brl(data?.todayRevenueCents ?? 0)} hoje
            </span>
          </div>
          <p className="mt-2 text-4xl font-bold tracking-tight">
            {isLoading ? "…" : brl(data?.monthRevenueCents ?? 0)}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">{data?.todayJobsTotal ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">Hoje</p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-lg font-bold">{data?.todayJobsActive ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">Em campo</p>
            </div>
            <div>
              <p className="text-lg font-bold">{data?.todayJobsCompleted ?? 0}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">Concluídos</p>
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
            value={brl(data?.openInvoicesSumCents ?? 0)}
            label={`${data?.openInvoicesCount ?? 0} em aberto`}
          />
          <KpiCard
            to="/orcamentos"
            Icon={FileText}
            tint="var(--warning)"
            value={String(data?.pendingQuotesCount ?? 0)}
            label="Orçamentos p/ aprovar"
          />
          <KpiCard
            to="/agenda"
            Icon={Calendar}
            tint="var(--primary)"
            value={String(data?.todayJobsTotal ?? 0)}
            label="Serviços hoje"
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
              {data!.pendingProofsCount} comprovante(s) aguardando confirmação
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Toque para revisar</p>
          </Link>
        </section>
      )}

      <section className="px-5 pt-7">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-bold text-foreground">Serviços de hoje</h2>
          <Link to="/agenda" className="text-xs font-semibold text-primary">Ver agenda</Link>
        </div>
        {todayJobs.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
            <p className="text-sm font-semibold">Nada agendado hoje</p>
            <Link
              to="/agenda"
              className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              <Plus className="size-3" /> Agendar serviço
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {todayJobs.map((job) => (
              <JobLi key={job.id} job={job} />
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="px-5 pt-7">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-sm font-bold text-foreground">Próximos serviços</h2>
          </div>
          <ul className="space-y-3">
            {upcoming.map((job) => (
              <JobLi key={job.id} job={job} showDate />
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

function JobLi({ job, showDate = false }: { job: { id: string; title: string; scheduled_at: string; status: string; address: string | null; price_cents: number; client_name: string | null }; showDate?: boolean }) {
  const dt = new Date(job.scheduled_at);
  const meta = STATUS_LABEL[job.status] ?? STATUS_LABEL.scheduled;
  const when = showDate
    ? dt.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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
              backgroundColor: `color-mix(in oklab, ${meta.tint} 15%, transparent)`,
              color: meta.tint,
            }}
          >
            {meta.label}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{job.address || "—"}</span>
          </span>
          <span className="font-semibold text-foreground">{brl(job.price_cents)}</span>
        </div>
      </Link>
    </li>
  );
}