/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import type { DispatchTeam } from "@/lib/dispatch-data";
import { MAP_METERS_PER_PERCENT, TEAM_STATUS } from "@/lib/dispatch-data";
import { loadGoogleMaps, MAP_CENTER, percentToLatLng } from "@/lib/google-maps-loader";

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1f2421" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa39d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1f2421" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a322d" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#343d37" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a5750" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7d8a83" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#10302a" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#1f2421" }] },
];

function teamPinSvg(color: string, label: string): string {
  const safe = label.replace(/[<>&"']/g, "");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="56" height="68" viewBox="0 0 56 68">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.35"/>
    </filter>
  </defs>
  <g filter="url(#s)">
    <path d="M28 66 L18 46 A18 18 0 1 1 38 46 Z" fill="${color}"/>
    <circle cx="28" cy="28" r="14" fill="white"/>
    <text x="28" y="33" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="14" font-weight="800" fill="${color}">${safe}</text>
  </g>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function hqPinSvg(): string {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <rect x="6" y="6" width="32" height="32" rx="8" fill="#0f1311" stroke="white" stroke-width="2"/>
  <text x="22" y="27" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="12" font-weight="800" fill="white">HQ</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * Real-time Google Maps canvas. Teams are plotted from their mock %
 * coordinates, and "on_way" teams drift slightly every tick to simulate live
 * GPS movement until backend GPS feeds are wired up.
 */
export function DispatchMap({
  teams,
  selectedId,
  onSelect,
}: {
  teams: DispatchTeam[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const hqRef = useRef<google.maps.Marker | null>(null);
  const fenceRef = useRef<google.maps.Circle | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  // Init map once
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new g.maps.Map(containerRef.current, {
          center: MAP_CENTER,
          zoom: 15,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          clickableIcons: false,
          backgroundColor: "#1f2421",
          styles: DARK_STYLE,
        });
        hqRef.current = new g.maps.Marker({
          position: MAP_CENTER,
          map: mapRef.current,
          icon: {
            url: hqPinSvg(),
            scaledSize: new g.maps.Size(36, 36),
            anchor: new g.maps.Point(18, 18),
          },
          zIndex: 50,
        });
        setReady(true);
      })
      .catch((err: Error) => setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => teams.find((t) => t.id === selectedId),
    [teams, selectedId],
  );

  // Sync team markers
  useEffect(() => {
    if (!ready || !mapRef.current || !window.google) return;
    const g = window.google;
    const map = mapRef.current;
    const seen = new Set<string>();

    teams.forEach((team, i) => {
      seen.add(team.id);
      const meta = TEAM_STATUS[team.status];
      // Drift only for moving teams to simulate live GPS
      const drift =
        team.status === "on_way"
          ? { x: Math.sin(tick / 2 + i) * 1.2, y: Math.cos(tick / 2 + i) * 1.2 }
          : { x: 0, y: 0 };
      const pos = percentToLatLng({
        x: team.position.x + drift.x,
        y: team.position.y + drift.y,
      });
      const label = team.name.replace("Equipe ", "").slice(0, 1).toUpperCase();
      const color =
        team.status === "on_way"
          ? "#f59e0b"
          : team.status === "in_progress"
            ? "#3b82f6"
            : team.status === "completed"
              ? "#16a34a"
              : team.status === "cancelled"
                ? "#dc2626"
                : "#64748b";
      void meta;

      let marker = markersRef.current.get(team.id);
      if (!marker) {
        marker = new g.maps.Marker({
          map,
          position: pos,
          icon: {
            url: teamPinSvg(color, label),
            scaledSize: new g.maps.Size(44, 54),
            anchor: new g.maps.Point(22, 54),
          },
          zIndex: team.id === selectedId ? 100 : 10,
        });
        marker.addListener("click", () => onSelect?.(team.id));
        markersRef.current.set(team.id, marker);
      } else {
        marker.setPosition(pos);
        marker.setIcon({
          url: teamPinSvg(color, label),
          scaledSize: new g.maps.Size(44, 54),
          anchor: new g.maps.Point(22, 54),
        });
        marker.setZIndex(team.id === selectedId ? 100 : 10);
        marker.setAnimation(
          team.status === "on_way" ? g.maps.Animation.BOUNCE : null,
        );
      }
    });

    // Remove markers that disappeared
    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    }
  }, [teams, tick, ready, selectedId, onSelect]);

  // Geofence circle for selected team
  useEffect(() => {
    if (!ready || !mapRef.current || !window.google) return;
    const g = window.google;
    const map = mapRef.current;

    const job = selected?.job;
    if (!job?.location || !job.geofenceM) {
      fenceRef.current?.setMap(null);
      fenceRef.current = null;
      return;
    }

    const center = percentToLatLng(job.location);
    if (!fenceRef.current) {
      fenceRef.current = new g.maps.Circle({
        map,
        center,
        radius: job.geofenceM,
        strokeColor: "#16a34a",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: "#16a34a",
        fillOpacity: 0.15,
        clickable: false,
      });
    } else {
      fenceRef.current.setMap(map);
      fenceRef.current.setCenter(center);
      fenceRef.current.setRadius(job.geofenceM);
    }
    map.panTo(center);
  }, [selected, ready]);

  // Avoid unused-var warning for shared constant
  void MAP_METERS_PER_PERCENT;

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-3xl bg-[color:var(--accent)] ring-1 ring-border">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {!ready && !error && (
        <div className="absolute inset-0 grid place-items-center bg-[color:var(--accent)]">
          <p className="text-xs font-semibold text-muted-foreground">Carregando mapa…</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-[color:var(--accent)] p-4 text-center">
          <p className="text-xs font-semibold text-destructive">Mapa indisponível: {error}</p>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-semibold text-foreground backdrop-blur ring-1 ring-border">
        <span className="relative grid size-2 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--success)] opacity-75" />
          <span className="relative size-2 rounded-full bg-[color:var(--success)]" />
        </span>
        Ao vivo · Google Maps
      </div>
    </div>
  );
}