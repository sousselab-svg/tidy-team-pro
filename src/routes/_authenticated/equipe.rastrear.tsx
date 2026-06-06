import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { MapPin, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { MobileShell, PageHeader } from "@/components/MobileShell";
import { listTeams } from "@/lib/teams.functions";
import { recordTeamLocation } from "@/lib/team-locations.functions";

export const Route = createFileRoute("/_authenticated/equipe/rastrear")({
  head: () => ({ meta: [{ title: "Rastrear equipe — CleanOps" }] }),
  component: TrackerPage,
});

function TrackerPage() {
  const list = useServerFn(listTeams);
  const ping = useServerFn(recordTeamLocation);
  const { data: teams = [] } = useQuery({ queryKey: ["teams"], queryFn: () => list() });

  const [teamId, setTeamId] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("trackerTeamId") ?? "" : "",
  );
  const [active, setActive] = useState(false);
  const [lastPos, setLastPos] = useState<{ lat: number; lng: number; acc: number | null; at: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (teamId) localStorage.setItem("trackerTeamId", teamId);
  }, [teamId]);

  useEffect(() => {
    if (!active || !teamId) return;
    if (!("geolocation" in navigator)) {
      setError("Geolocalização não suportada neste dispositivo.");
      setActive(false);
      return;
    }
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        setError(null);
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        setLastPos({ lat: latitude, lng: longitude, acc: accuracy ?? null, at: Date.now() });
        try {
          await ping({
            data: {
              team_id: teamId,
              lat: latitude,
              lng: longitude,
              accuracy_m: accuracy ?? null,
              heading: Number.isFinite(heading as number) ? (heading as number) : null,
              speed: Number.isFinite(speed as number) ? (speed as number) : null,
            },
          });
        } catch (e) {
          // Don't toast on every error to avoid spam
          console.error("location ping failed", e);
        }
      },
      (err) => {
        setError(err.message);
        toast.error("Erro de GPS", { description: err.message });
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    watchRef.current = id;
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    };
  }, [active, teamId, ping]);

  const team = teams.find((t) => t.id === teamId);

  return (
    <MobileShell>
      <PageHeader
        eyebrow="Equipe"
        title="Compartilhar localização"
        subtitle="Mantenha esta tela aberta no celular"
      />

      <section className="space-y-3 px-5">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sua equipe
          </label>
          <select
            value={teamId}
            onChange={(e) => {
              setActive(false);
              setTeamId(e.target.value);
            }}
            className="mt-1 w-full rounded-xl bg-secondary px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— selecione —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={!teamId}
          onClick={() => setActive((v) => !v)}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold disabled:opacity-50 ${
            active
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {active ? <Pause className="size-5" /> : <Play className="size-5" />}
          {active ? "Parar de compartilhar" : "Iniciar compartilhamento"}
        </button>

        <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${active ? "animate-pulse bg-[color:var(--success)]" : "bg-muted-foreground"}`}
            />
            <p className="text-sm font-semibold">
              {active ? `Transmitindo para ${team?.name ?? "equipe"}` : "Parado"}
            </p>
          </div>
          {lastPos && (
            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <div>
                <p className="font-mono">{lastPos.lat.toFixed(5)}, {lastPos.lng.toFixed(5)}</p>
                {lastPos.acc != null && <p>± {Math.round(lastPos.acc)} m</p>}
                <p>{new Date(lastPos.at).toLocaleTimeString("pt-BR")}</p>
              </div>
            </div>
          )}
          {error && (
            <p className="mt-3 text-xs font-semibold text-destructive">{error}</p>
          )}
        </div>

        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          O navegador pedirá permissão de localização. A posição é atualizada automaticamente
          enquanto esta página estiver aberta. Para máxima precisão, mantenha a tela ligada.
        </p>
      </section>
    </MobileShell>
  );
}