import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, TrendingUp, CheckCircle2, XCircle, Wallet, AlertTriangle, Receipt } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { getReports, type ReportsData } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — CleanOps" }] }),
  component: ReportsPage,
});

const brl = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  on_way: "A caminho",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};
const STATUS_COLORS = ["#3b82f6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

function fmtMonth(k: string) {
  const [y, m] = k.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const fn = useServerFn(getReports);
  const [months, setMonths] = useState(6);
  const options = useMemo(
    () => queryOptions({ queryKey: ["reports", months], queryFn: () => fn({ data: { months } }) }),
    [fn, months],
  );
  const { data, isLoading } = useQuery(options);

  function exportAll(d: ReportsData) {
    const rows: (string | number)[][] = [
      ["Relatório", `${d.rangeStart.slice(0, 10)} a ${d.rangeEnd.slice(0, 10)}`],
      [],
      ["Mês", "Receita (R$)", "Serviços"],
      ...d.monthly.map((m) => [fmtMonth(m.month), (m.revenue_cents / 100).toFixed(2), m.jobs]),
      [],
      ["Status", "Quantidade"],
      ...d.status.map((s) => [STATUS_LABELS[s.status] ?? s.status, s.count]),
      [],
      ["Cliente", "Receita (R$)", "Serviços"],
      ...d.topClients.map((c) => [c.name, (c.revenue_cents / 100).toFixed(2), c.jobs]),
    ];
    downloadCsv(`relatorio-${months}m.csv`, rows);
  }

  return (
    <MobileShell>
      <PageHeader
        eyebrow="BI"
        title="Relatórios"
        subtitle="Receita, serviços e clientes"
        right={
          data ? (
            <button
              onClick={() => exportAll(data)}
              aria-label="Exportar CSV"
              className="grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground"
            >
              <Download className="size-4" />
            </button>
          ) : null
        }
      />

      <div className="px-5 space-y-5">
        <div className="flex gap-2">
          {[3, 6, 12].map((n) => (
            <button
              key={n}
              onClick={() => setMonths(n)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
                months === n ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {n} meses
            </button>
          ))}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard Icon={TrendingUp} label="Receita" value={brl(data.totalRevenueCents)} tone="text-emerald-600" />
              <KpiCard Icon={Receipt} label="Ticket médio" value={brl(data.avgTicketCents)} tone="text-primary" />
              <KpiCard Icon={CheckCircle2} label="Concluídos" value={String(data.completedJobs)} tone="text-emerald-600" />
              <KpiCard Icon={XCircle} label="Cancelados" value={String(data.cancelledJobs)} tone="text-destructive" />
              <KpiCard Icon={Wallet} label="Recebido" value={brl(data.invoicesPaidCents)} tone="text-emerald-600" />
              <KpiCard Icon={AlertTriangle} label="Vencido" value={brl(data.invoicesOverdueCents)} tone="text-destructive" />
            </div>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold">Receita por mês</h2>
              <div className="mt-3 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly.map((m) => ({ ...m, label: fmtMonth(m.month), valor: m.revenue_cents / 100 }))}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" width={40} />
                    <Tooltip
                      formatter={(v: number) => brl(Math.round(v * 100))}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="valor" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold">Status dos serviços</h2>
              {data.status.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Sem dados no período.</p>
              ) : (
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.status.map((s) => ({ name: STATUS_LABELS[s.status] ?? s.status, value: s.count }))}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={70}
                      >
                        {data.status.map((_, i) => (
                          <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-bold">Top clientes</h2>
              {data.topClients.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Sem dados no período.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {data.topClients.map((c, i) => (
                    <li key={c.client_id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid size-6 place-items-center rounded-full bg-secondary text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.jobs} serviço(s)</p>
                        </div>
                      </div>
                      <p className="font-bold tabular-nums">{brl(c.revenue_cents)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </MobileShell>
  );
}

function KpiCard({
  Icon, label, value, tone,
}: {
  Icon: typeof TrendingUp;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${tone}`} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}