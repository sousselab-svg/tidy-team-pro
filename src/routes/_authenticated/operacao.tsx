import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPin, Route as RouteIcon, Sparkles, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { listTeams } from "@/lib/teams.functions";
import {
  optimizeRoute,
  applyOptimizedOrder,
  type OptimizeResult,
} from "@/lib/route-optimization.functions";

export const Route = createFileRoute("/_authenticated/operacao")({
  head: () => ({
    meta: [
      { title: "Field operations — CleanOps" },
      { name: "description", content: "Optimize today's route for each team." },
    ],
  }),
  component: Page,
});

function fmtKm(m: number) {
  return `${(m / 1000).toFixed(1)} km`;
}
function fmtMin(sec: number) {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
}
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function defaultStartAt(date: string) {
  return `${date}T08:00`;
}

function Page() {
  const qc = useQueryClient();
  const teamsFn = useServerFn(listTeams);
  const optFn = useServerFn(optimizeRoute);
  const applyFn = useServerFn(applyOptimizedOrder);

  const [date, setDate] = useState<string>(todayISO());
  const [teamId, setTeamId] = useState<string>("");
  const [startAt, setStartAt] = useState<string>(defaultStartAt(todayISO()));
  const [buffer, setBuffer] = useState<number>(15);
  const [result, setResult] = useState<OptimizeResult | null>(null);

  const { data: teams = [] } = useQuery({ queryKey: ["teams"], queryFn: () => teamsFn() });

  const mOpt = useMutation({
    mutationFn: () => optFn({ data: { date, team_id: teamId ? teamId : null } }),
    onSuccess: (r) => {
      setResult(r);
      if (r.error) toast.error(r.error);
      else if (r.stops.length < 2) toast.info("Need at least 2 geocoded jobs to optimize");
      else toast.success("Route computed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const mApply = useMutation({
    mutationFn: () => {
      if (!result || result.stops.length === 0) throw new Error("Nothing to apply");
      return applyFn({
        data: {
          start_at: new Date(startAt).toISOString(),
          buffer_minutes: buffer,
          stops: result.stops.map((s) => ({
            job_id: s.job_id,
            duration_minutes: s.duration_minutes,
            leg_duration_sec: s.leg_duration_sec,
          })),
        },
      });
    },
    onSuccess: (r) => {
      toast.success(`Rescheduled ${r.updated} jobs`);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const saved = useMemo(() => {
    if (!result || !result.optimized) return 0;
    return Math.max(0, result.original_total_drive_sec - result.total_drive_sec);
  }, [result]);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Field ops"
        title="Route optimization"
        subtitle="Reorder today's jobs to cut drive time"
      />

      <section className="space-y-3 px-5 pt-2">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStartAt(defaultStartAt(e.target.value));
                  setResult(null);
                }}
                className="rounded-xl bg-background px-3 py-2 text-sm ring-1 ring-border"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Team
              </span>
              <select
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setResult(null);
                }}
                className="rounded-xl bg-background px-3 py-2 text-sm ring-1 ring-border"
              >
                <option value="">All teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => mOpt.mutate()}
            disabled={mOpt.isPending}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            <Sparkles className="size-4" />
            {mOpt.isPending ? "Computing…" : "Optimize route"}
          </button>
        </div>

        {result && result.optimized && (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Stops" value={String(result.stops.length)} />
            <Stat label="Drive" value={fmtMin(result.total_drive_sec)} />
            <Stat label="Distance" value={fmtKm(result.total_distance_m)} />
          </div>
        )}

        {result && result.optimized && saved > 0 && (
          <div className="flex items-center gap-2 rounded-2xl bg-[color:var(--success)]/10 p-3 text-sm text-[color:var(--success)] ring-1 ring-[color:var(--success)]/30">
            <CheckCircle2 className="size-4" />
            <span className="font-semibold">
              Saves ~{fmtMin(saved)} vs the current schedule order.
            </span>
          </div>
        )}

        {result && result.skipped.length > 0 && (
          <div className="rounded-2xl bg-[color:var(--warning)]/10 p-3 text-xs text-[color:var(--warning)] ring-1 ring-[color:var(--warning)]/30">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" />
              {result.skipped.length} job{result.skipped.length === 1 ? "" : "s"} skipped (no coordinates)
            </div>
            <ul className="mt-1 list-disc pl-5">
              {result.skipped.map((s) => (
                <li key={s.job_id}>{s.title}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {result && result.stops.length > 0 && (
        <section className="px-5 pt-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Optimized order
          </h2>
          <ol className="space-y-2">
            {result.stops.map((s, i) => (
              <li
                key={s.job_id}
                className="rounded-2xl bg-card p-3 ring-1 ring-border"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/agenda/$jobId"
                      params={{ jobId: s.job_id }}
                      className="block truncate text-sm font-bold"
                    >
                      {s.title}
                    </Link>
                    {s.address && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" />
                        {s.address}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> {s.duration_minutes} min
                      </span>
                      {i > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <RouteIcon className="size-3" />
                          {fmtMin(s.leg_duration_sec)} · {fmtKm(s.leg_distance_m)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border">
            <h3 className="text-sm font-bold">Apply order</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reschedules jobs starting at the time below, adding drive time and a buffer between stops.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Start at
                </span>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="rounded-xl bg-background px-3 py-2 text-sm ring-1 ring-border"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Buffer (min)
                </span>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={buffer}
                  onChange={(e) => setBuffer(Math.max(0, Number(e.target.value) || 0))}
                  className="rounded-xl bg-background px-3 py-2 text-sm ring-1 ring-border"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => mApply.mutate()}
              disabled={mApply.isPending || !result.optimized}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-2.5 text-sm font-bold text-background disabled:opacity-50"
            >
              {mApply.isPending ? "Applying…" : "Apply new schedule"}
            </button>
          </div>
        </section>
      )}
    </MobileShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-base font-bold">{value}</p>
    </div>
  );
}
