import { createFileRoute } from "@tanstack/react-router";
import { Plus, ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { brl, todayJobs, STATUS_META } from "@/lib/mock-data";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda — CleanOps" },
      { name: "description", content: "Agenda diária da sua equipe de limpeza com status em tempo real." },
    ],
  }),
  component: AgendaPage,
});

const days = [
  { d: "SEG", n: 3 },
  { d: "TER", n: 4 },
  { d: "QUA", n: 5 },
  { d: "QUI", n: 6, active: true },
  { d: "SEX", n: 7 },
  { d: "SÁB", n: 8 },
  { d: "DOM", n: 9 },
];

function AgendaPage() {
  return (
    <MobileShell>
      <PageHeader
        eyebrow="Agenda"
        title="Hoje, 6 de Jun"
        subtitle={`${todayJobs.length} serviços programados`}
        right={
          <button className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow">
            <Plus className="size-5" />
          </button>
        }
      />

      <section className="px-5">
        <div className="flex items-center justify-between">
          <button className="grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground">
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex flex-1 justify-between px-2">
            {days.map((d) => (
              <button
                key={d.n}
                className={`flex flex-col items-center rounded-xl px-2 py-2 transition ${
                  d.active ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider">{d.d}</span>
                <span className="text-base font-bold">{d.n}</span>
              </button>
            ))}
          </div>
          <button className="grid size-8 place-items-center rounded-full bg-secondary text-muted-foreground">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </section>

      <section className="px-5 pt-6">
        <ol className="relative space-y-4 border-l-2 border-border pl-5">
          {todayJobs.map((job) => {
            const meta = STATUS_META[job.status];
            const dotColor =
              job.status === "completed"
                ? "var(--success)"
                : job.status === "in_progress"
                  ? "var(--info)"
                  : job.status === "on_way"
                    ? "var(--warning)"
                    : "var(--muted-foreground)";
            return (
              <li key={job.id} className="relative">
                <span
                  className="absolute -left-[27px] top-3 grid size-4 place-items-center rounded-full ring-4 ring-background"
                  style={{ backgroundColor: dotColor }}
                />
                <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-sm font-bold text-foreground">{job.time}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.bg} ${meta.fg}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-semibold text-foreground">{job.service}</h3>
                  <p className="text-sm text-muted-foreground">{job.client}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" /> {job.address}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5" /> Equipe {job.team}
                    </span>
                    <span className="ml-auto font-semibold text-foreground">{brl(job.price)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </MobileShell>
  );
}