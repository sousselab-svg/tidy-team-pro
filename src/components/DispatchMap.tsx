/// <reference types="google.maps" />
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { DispatchTeam } from "@/lib/dispatch-data";
import { TEAM_STATUS } from "@/lib/dispatch-data";
import {
  latLngToPercent,
  loadGoogleMaps,
  MAP_CENTER,
  percentToLatLng,
} from "@/lib/google-maps-loader";
import { getTeamRoutes } from "@/lib/dispatch-routes.functions";

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
  onPing,
}: {
  teams: DispatchTeam[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Emitted with the team's current GPS position on every animation tick. */
  onPing?: (teamId: string, position: { x: number; y: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const hqRef = useRef<google.maps.Marker | null>(null);
  const fenceRef = useRef<google.maps.Circle | null>(null);
  const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
  /** Decoded route path per team (in road-following order). */
  const routePathsRef = useRef<Map<string, google.maps.LatLng[]>>(new Map());
  /** Cumulative segment distances for fast interpolation. */
  const routeDistRef = useRef<Map<string, { cum: number[]; total: number }>>(
    new Map(),
  );
  /** Progress 0..1 along each team's route. */
  const progressRef = useRef<Map<string, number>>(new Map());
  const fetchRoutes = useServerFn(getTeamRoutes);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [routesLoaded, setRoutesLoaded] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1200);
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

  // Fetch real driving routes from Google Routes API once the map is ready.
  useEffect(() => {
    if (!ready || !window.google) return;
    let cancelled = false;
    fetchRoutes()
      .then((res) => {
        if (cancelled || !window.google) return;
        const decode = window.google.maps.geometry?.encoding?.decodePath;
        const spherical = window.google.maps.geometry?.spherical;
        if (!decode || !spherical) return;
        for (const r of res.routes) {
          const path = decode(r.encodedPolyline);
          if (path.length < 2) continue;
          routePathsRef.current.set(r.teamId, path);
          // Pre-compute cumulative segment distances for smooth interpolation.
          const cum: number[] = [0];
          for (let i = 1; i < path.length; i++) {
            cum.push(
              cum[i - 1] +
                spherical.computeDistanceBetween(path[i - 1], path[i]),
            );
          }
          routeDistRef.current.set(r.teamId, {
            cum,
            total: cum[cum.length - 1] || 1,
          });
          progressRef.current.set(r.teamId, 0);

          // Visualize the route faintly on the map.
          const existing = polylinesRef.current.get(r.teamId);
          existing?.setMap(null);
          const poly = new window.google.maps.Polyline({
            map: mapRef.current,
            path,
            geodesic: false,
            strokeColor: "#f59e0b",
            strokeOpacity: 0.55,
            strokeWeight: 3,
          });
          polylinesRef.current.set(r.teamId, poly);
        }
        setRoutesLoaded((n) => n + 1);
      })
      .catch((err) => console.error("Failed to load team routes", err));
    return () => {
      cancelled = true;
    };
  }, [ready, fetchRoutes]);

  const selected = useMemo(
    () => teams.find((t) => t.id === selectedId),
    [teams, selectedId],
  );

  /** Returns interpolated lat/lng at a given progress (0..1) on a route. */
  function pointAlong(
    teamId: string,
    progress: number,
  ): google.maps.LatLng | null {
    const path = routePathsRef.current.get(teamId);
    const meta = routeDistRef.current.get(teamId);
    if (!path || !meta || !window.google) return null;
    const spherical = window.google.maps.geometry.spherical;
    const target = meta.total * Math.min(Math.max(progress, 0), 1);
    // Binary-search segment that contains `target`.
    let lo = 0;
    let hi = meta.cum.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (meta.cum[mid] <= target) lo = mid;
      else hi = mid;
    }
    const segLen = meta.cum[hi] - meta.cum[lo] || 1;
    const t = (target - meta.cum[lo]) / segLen;
    return spherical.interpolate(path[lo], path[hi], t);
  }

  // Sync team markers
  useEffect(() => {
    if (!ready || !mapRef.current || !window.google) return;
    const g = window.google;
    const map = mapRef.current;
    const seen = new Set<string>();

    teams.forEach((team) => {
      seen.add(team.id);
      const meta = TEAM_STATUS[team.status];

      // Advance real route progress for moving teams (≈ 4% of route per tick
      // ≈ a couple of street blocks). For other states, hold position.
      let pos: google.maps.LatLng | google.maps.LatLngLiteral;
      if (team.status === "on_way" && routePathsRef.current.has(team.id)) {
        const prev = progressRef.current.get(team.id) ?? 0;
        const next = Math.min(prev + 0.04, 1);
        progressRef.current.set(team.id, next);
        const interp = pointAlong(team.id, next);
        if (interp) {
          pos = interp;
          // Report the live GPS ping upstream so geofence + cards react.
          onPing?.(team.id, latLngToPercent(interp.toJSON()));
        } else {
          pos = percentToLatLng(team.position);
        }
      } else {
        pos = percentToLatLng(team.position);
      }

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
        marker.setAnimation(null);
      }
    });

    // Remove markers that disappeared
    for (const [id, marker] of markersRef.current) {
      if (!seen.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
        polylinesRef.current.get(id)?.setMap(null);
        polylinesRef.current.delete(id);
        routePathsRef.current.delete(id);
        routeDistRef.current.delete(id);
        progressRef.current.delete(id);
      }
    }
  }, [teams, tick, ready, selectedId, onSelect, onPing, routesLoaded]);

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