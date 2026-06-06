import { createFileRoute } from "@tanstack/react-router";
import { Bell, ArrowUpRight, MapPin, Sparkles, Plus, DollarSign, MessageCircle } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { brl, todayJobs, STATUS_META } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CleanOps — Painel Operacional" },
      { name: "description", content: "Plataforma completa para empresas de limpeza residencial e comercial." },
      { property: "og:title", content: "CleanOps — Painel Operacional" },
      { property: "og:description", content: "Gerencie clientes, agenda, equipes, orçamentos e faturamento em um só lugar." },
    ],
  }),
  component: Index,
});

function Index() {
  const activeJobs = todayJobs.filter((j) => j.status === "in_progress" || j.status === "on_way");
  const completed = todayJobs.filter((j) => j.status === "completed");
  const revenueToday = todayJobs.reduce((sum, j) => sum + j.price, 0);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="CleanOps Pro"
        title="Bom dia, João"
        subtitle="Aqui está o resumo da sua operação hoje."
        right={
          <button className="relative grid size-10 place-items-center rounded-full bg-secondary text-muted-foreground">
            <Bell className="size-5" />
            <span className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              3
            </span>
          </button>
        }
      />

      <section className="px-5">
        <div className="rounded-3xl bg-foreground p-5 text-background shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest opacity-70">Receita hoje</p>
            <span className="flex items-center gap-1 text-xs font-semibold text-[color:var(--success)]">
              <ArrowUpRight className="size-3" /> +12%
            </span>
          </div>
          <p className="mt-2 text-4xl font-bold tracking-tight">{brl(revenueToday)}</p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">{todayJobs.length}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">Serviços</p>
            </div>
            <div className="border-x border-white/10">
              <p className="text-lg font-bold">{activeJobs.length}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">Em campo</p>
            </div>
            <div>
              <p className="text-lg font-bold">{completed.length}</p>
              <p className="text-[10px] uppercase tracking-wider opacity-60">Concluídos</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pt-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { Icon: Plus, label: "Novo orçamento", tint: "var(--primary)" },
            { Icon: DollarSign, label: "Cobrar", tint: "var(--info)" },
            { Icon: MessageCircle, label: "Mensagens", tint: "var(--warning)" },
          ].map(({ Icon, label, tint }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-2 rounded-2xl bg-card p-3 ring-1 ring-border"
            >
              <span
                className="grid size-10 place-items-center rounded-full"
                style={{ backgroundColor: `color-mix(in oklab, ${tint} 15%, transparent)`, color: tint }}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-[11px] font-semibold text-foreground text-center leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 pt-7">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-sm font-bold text-foreground">Serviços de hoje</h2>
          <span className="text-xs font-semibold text-primary">Ver agenda</span>
        </div>
        <ul className="space-y-3">
          {todayJobs.map((job) => {
            const meta = STATUS_META[job.status];
            return (
              <li key={job.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
                      #{job.id} · {job.time}
                    </p>
                    <h3 className="mt-0.5 truncate text-base font-semibold text-foreground">
                      {job.service}
                    </h3>
                    <p className="truncate text-sm text-muted-foreground">{job.client}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${meta.bg} ${meta.fg}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {job.address}
                  </span>
                  <span className="font-semibold text-foreground">{brl(job.price)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="px-5 pt-7">
        <div className="flex items-start gap-3 rounded-2xl bg-accent p-4 text-accent-foreground">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-sm font-bold">Sugestão da IA</p>
            <p className="mt-0.5 text-xs leading-relaxed">
              Marina Oliveira não agenda há 14 dias. Enviar cupom de retenção de 15%?
            </p>
          </div>
        </div>
      </section>
    </MobileShell>
  );
}
