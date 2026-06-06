import { formatDate, formatDateTime, formatTime } from "@/lib/format";
/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Wifi, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { getTeamLocation, type TeamLocation } from "@/lib/team-locations.functions";

function relativeTime(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return formatDateTime(iso);
}

/**
 * Realtime map of one team's GPS position. Subscribes to Supabase realtime
 * changes on `team_locations` filtered to the given team_id.
 */
export function TeamLiveMap({
  teamId,
  teamName,
  teamColor,
}: {
  teamId: string;
  teamName: string;
  teamColor: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const accuracyRef = useRef<google.maps.Circle | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const qc = useQueryClient();
  const get = useServerFn(getTeamLocation);
  const locQ = useQuery({
    queryKey: ["team-location", teamId],
    queryFn: () => get({ data: { team_id: teamId } }),
    refetchInterval: 30_000,
  });

  // Tick for "há Xs" label
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`team_loc:${teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_locations", filter: `team_id=eq.${teamId}` },
        (payload) => {
          const row = payload.new as TeamLocation | null;
          if (row && row.team_id === teamId) {
            qc.setQueryData(["team-location", teamId], row);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, qc]);

  // Init map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: { lat: -23.5613, lng: -46.6566 },
          zoom: 14,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync marker
  useEffect(() => {
    if (!ready || !window.google || !mapRef.current) return;
    const loc = locQ.data;
    if (!loc) return;
    const g = window.google;
    const pos = { lat: loc.lat, lng: loc.lng };
    const color = teamColor ?? "#3b82f6";
    const safe = teamName.replace(/[<>&"']/g, "").slice(0, 1).toUpperCase();
    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="56" height="68" viewBox="0 0 56 68"><g><path d="M28 66 L18 46 A18 18 0 1 1 38 46 Z" fill="${color}"/><circle cx="28" cy="28" r="14" fill="white"/><text x="28" y="33" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="800" fill="${color}">${safe}</text></g></svg>`;
    const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

    if (!markerRef.current) {
      markerRef.current = new g.maps.Marker({
        map: mapRef.current,
        position: pos,
        icon: { url, scaledSize: new g.maps.Size(40, 50), anchor: new g.maps.Point(20, 50) },
      });
    } else {
      markerRef.current.setPosition(pos);
      markerRef.current.setIcon({ url, scaledSize: new g.maps.Size(40, 50), anchor: new g.maps.Point(20, 50) });
    }
    if (loc.accuracy_m && loc.accuracy_m > 0) {
      if (!accuracyRef.current) {
        accuracyRef.current = new g.maps.Circle({
          map: mapRef.current,
          center: pos,
          radius: loc.accuracy_m,
          strokeColor: color,
          strokeOpacity: 0.5,
          strokeWeight: 1,
          fillColor: color,
          fillOpacity: 0.12,
          clickable: false,
        });
      } else {
        accuracyRef.current.setCenter(pos);
        accuracyRef.current.setRadius(loc.accuracy_m);
      }
    }
    mapRef.current.panTo(pos);
  }, [ready, locQ.data, teamColor, teamName]);

  const loc = locQ.data;
  const stale = loc ? now - new Date(loc.recorded_at).getTime() > 90_000 : false;

  return (
    <section className="mt-5 overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-muted-foreground" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Localização ao vivo</p>
        </div>
        {loc ? (
          <span className={`flex items-center gap-1 text-[10px] font-semibold ${stale ? "text-muted-foreground" : "text-[color:var(--success)]"}`}>
            {stale ? <WifiOff className="size-3" /> : <Wifi className="size-3" />}
            {relativeTime(loc.recorded_at)}
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-muted-foreground">Sem sinal</span>
        )}
      </div>
      <div className="relative h-56 w-full bg-[color:var(--accent)]">
        <div ref={containerRef} className="absolute inset-0 h-full w-full" />
        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="text-xs font-semibold text-muted-foreground">Carregando mapa…</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center p-4 text-center">
            <p className="text-xs font-semibold text-destructive">Mapa indisponível: {error}</p>
          </div>
        )}
        {ready && !loc && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 p-4 text-center backdrop-blur">
            <div>
              <p className="text-sm font-semibold">Aguardando primeira posição</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Peça à equipe para abrir <span className="font-mono">/equipe/rastrear</span> no celular.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}