import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, Download } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { brl, invoices, INVOICE_STATUS } from "@/lib/mock-data";

export const Route = createFileRoute("/faturamento")({
  head: () => ({
    meta: [
      { title: "Faturamento — CleanOps" },
      { name: "description", content: "Faturas, cobranças e indicadores financeiros." },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const open = invoices.filter((i) => i.status === "open").reduce((s, i) => s + i.amount, 0);
  const overdue = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <MobileShell>
      <PageHeader eyebrow="Finanças" title="Faturamento" subtitle="Junho de 2026" />

      <section className="px-5">
        <div className="rounded-3xl bg-foreground p-5 text-background">
          <p className="text-xs uppercase tracking-widest opacity-60">Receita do mês</p>
          <p className="mt-1 text-4xl font-bold tracking-tight">{brl(paid + open)}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-[color:var(--success)]">
            <TrendingUp className="size-3" /> +18% vs. mês anterior
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-[color:var(--success)]" style={{ width: "62%" }} />
          </div>
          <div className="mt-3 flex justify-between text-[11px] opacity-70">
            <span>Meta {brl(50000)}</span>
            <span>62%</span>
          </div>
        </div>
      </section>

      <section className="px-5 pt-5">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Recebido", value: paid, tint: "var(--success)" },
            { label: "Em aberto", value: open, tint: "var(--info)" },
            { label: "Atrasado", value: overdue, tint: "var(--destructive)" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-card p-3 ring-1 ring-border">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 text-base font-bold" style={{ color: s.tint }}>
                {brl(s.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Faturas recentes</h2>
          <button className="flex items-center gap-1 text-xs font-semibold text-primary">
            <Download className="size-3.5" /> Exportar
          </button>
        </div>
        <ul className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {invoices.map((inv, i) => {
            const meta = INVOICE_STATUS[inv.status];
            return (
              <li
                key={inv.id}
                className={`flex items-center justify-between p-4 ${
                  i !== invoices.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {inv.id}
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">{inv.client}</p>
                  <p className="text-[11px] text-muted-foreground">Vence {inv.dueDate}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="text-sm font-bold text-foreground">{brl(inv.amount)}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.bg} ${meta.fg}`}
                  >
                    {meta.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </MobileShell>
  );
}