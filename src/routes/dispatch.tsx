import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Battery,
  CheckCircle2,
  Gauge,
  LogIn,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { DispatchMap } from "@/components/DispatchMap";
import {
  dispatchTeams as initialTeams,
  TEAM_STATUS,
  distanceM,
  type DispatchTeam,
  type TeamStatus,
} from "@/lib/dispatch-data";
import { toast } from "sonner";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch — CleanOps" },
      { name: "description", content: "Rastreie equipes em tempo real, status de serviço e ETA." },
    ],
  }),
  component: DispatchPage,
});

const FILTERS: { id: TeamStatus | "all"; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "on_way", label: "A caminho" },
  { id: "in_progress", label: "Em andamento" },
  { id: "completed", label: "Finalizado" },
  { id: "idle", label: "Disponíveis" },
];

function DispatchPage() {
  const [teams, setTeams] = useState<DispatchTeam[]>(initialTeams);
  const [filter, setFilter] = useState<TeamStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | undefined>(initialTeams[1]?.id);

  const visibleTeams = useMemo(
    () => (filter === "all" ? teams : teams.filter((t) => t.status === filter)),
    [filter, teams],
  );
  const selected = teams.find((t) => t.id === selectedId);

  const counts = useMemo(() => {
    const c: Record<string, number> = { on_way: 0, in_progress: 0, completed: 0, idle: 0 };
    for (const t of teams) c[t.status] = (c[t.status] ?? 0) + 1;
    return c;
  }, [teams]);

  const checkIn = (id: string) => {
    const team = teams.find((t) => t.id === id);
    if (!team || team.status !== "on_way") return;
    const fence = getGeofence(team);
    if (!fence.ok) {
      toast.error("Fora do geofence", {
        description: `Equipe está a ${fence.distance} m do local (máx. ${fence.radius} m). Aproxime-se do endereço para fazer check-in.`,
      });
      return;
    }
    setTeams((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "in_progress",
              speedKmh: 0,
              job: t.job ? { ...t.job, etaMin: undefined, progress: 5 } : t.job,
            }
          : t,
      ),
    );
    toast.success(`Check-in confirmado: ${team.name}`, {
      description: `Localização validada a ${fence.distance} m do endereço.`,
    });
  };

  const checkOut = (id: string) => {
    const team = teams.find((t) => t.id === id);
    if (!team || team.status !== "in_progress") return;
    const fence = getGeofence(team);
    if (!fence.ok) {
      toast.error("Fora do geofence", {
        description: `Não é possível finalizar: equipe está a ${fence.distance} m do local (máx. ${fence.radius} m).`,
      });
      return;
    }
    setTeams((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "completed",
              speedKmh: 0,
              job: t.job ? { ...t.job, progress: 100 } : t.job,
            }
          : t,
      ),
    );
    toast.success(`Check-out confirmado: ${team.name}`, {
      description: `Serviço finalizado dentro do perímetro autorizado.`,
    });
  };

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Dispatch"
        title="Equipes em campo"
        subtitle={`${teams.length} equipes · rastreamento ao vivo`}
      />

      <section className="px-5">
        <div className="grid grid-cols-4 gap-2">
          {(
            [
              { key: "on_way", label: "A caminho" },
              { key: "in_progress", label: "Em curso" },
              { key: "completed", label: "Finalizado" },
              { key: "idle", label: "Livres" },
            ] as const
          ).map((s) => {
            const meta = TEAM_STATUS[s.key];
            return (
              <div key={s.key} className="rounded-2xl bg-card p-3 ring-1 ring-border">
                <span
                  className="block size-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
                  {counts[s.key] ?? 0}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 pt-5">
        <DispatchMap teams={teams} selectedId={selectedId} onSelect={setSelectedId} />
      </section>

      <section className="px-5 pt-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => {
            const active = f.id === filter;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground ring-1 ring-border"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-5 pt-4">
        <ul className="space-y-3">
          {visibleTeams.map((team) => {
            const meta = TEAM_STATUS[team.status];
            const active = team.id === selectedId;
            return (
              <li key={team.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(team.id)}
                  className={`w-full rounded-2xl bg-card p-4 text-left ring-1 transition ${
                    active ? "ring-2 ring-primary" : "ring-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold text-background"
                        style={{ backgroundColor: meta.color }}
                      >
                        {team.name.replace("Equipe ", "").slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{team.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {team.members.join(" · ")}
                        </p>
                      </div>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${meta.color} 15%, transparent)`,
                        color: meta.color,
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {team.job && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-sm font-semibold text-foreground">
                        #{team.job.id} · {team.job.client}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {team.job.address}
                      </p>

                      {team.status === "in_progress" && team.job.progress != null && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                            <span>Progresso</span>
                            <span className="tabular-nums">{team.job.progress}%</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${team.job.progress}%`,
                                backgroundColor: meta.color,
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {team.status === "on_way" && team.job.etaMin != null && (
                        <p
                          className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={{
                            backgroundColor: `color-mix(in oklab, ${meta.color} 15%, transparent)`,
                            color: meta.color,
                          }}
                        >
                          <Navigation className="size-3" /> Chega em {team.job.etaMin} min
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Gauge className="size-3" /> {team.speedKmh} km/h
                    </span>
                    <span className="flex items-center gap-1">
                      <Battery className="size-3" /> {team.batteryPct}%
                    </span>
                  </div>

                  {(team.status === "on_way" || team.status === "in_progress") && (
                    <div className="mt-3 border-t border-border pt-3">
                      {team.status === "on_way" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            checkIn(team.id);
                          }}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground"
                        >
                          <LogIn className="size-3.5" /> Fazer check-in
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            checkOut(team.id);
                          }}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-foreground py-2 text-xs font-bold text-background"
                        >
                          <CheckCircle2 className="size-3.5" /> Fazer check-out
                        </button>
                      )}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selected && (
        <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-[480px] px-4">
          <div className="rounded-2xl bg-foreground p-4 text-background shadow-2xl ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">
                  Selecionada
                </p>
                <p className="truncate text-sm font-bold">{selected.name}</p>
                {selected.job && (
                  <p className="truncate text-[11px] opacity-70">{selected.job.client}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedId(undefined)}
                className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10"
                aria-label="Fechar"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {selected.status === "on_way" ? (
                <button
                  onClick={() => checkIn(selected.id)}
                  className="col-span-1 flex items-center justify-center gap-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground"
                >
                  <LogIn className="size-3.5" /> Check-in
                </button>
              ) : selected.status === "in_progress" ? (
                <button
                  onClick={() => checkOut(selected.id)}
                  className="col-span-1 flex items-center justify-center gap-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground"
                >
                  <CheckCircle2 className="size-3.5" /> Check-out
                </button>
              ) : (
                <button className="col-span-1 flex items-center justify-center gap-1 rounded-xl bg-white/10 py-2 text-xs font-bold">
                  <Navigation className="size-3.5" /> Rota
                </button>
              )}
              <button className="flex items-center justify-center gap-1 rounded-xl bg-white/10 py-2 text-xs font-bold">
                <Phone className="size-3.5" /> Ligar
              </button>
              <button className="flex items-center justify-center gap-1 rounded-xl bg-white/10 py-2 text-xs font-bold">
                <MessageCircle className="size-3.5" /> Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
}