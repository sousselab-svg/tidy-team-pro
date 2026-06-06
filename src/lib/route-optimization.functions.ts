import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export type OptimizedStop = {
  job_id: string;
  title: string;
  address: string | null;
  scheduled_at: string;
  duration_minutes: number;
  lat: number;
  lng: number;
  leg_distance_m: number; // drive distance from previous stop (0 for first)
  leg_duration_sec: number; // drive time from previous stop (0 for first)
};

export type OptimizeResult = {
  stops: OptimizedStop[];
  skipped: { job_id: string; title: string; reason: string }[];
  total_distance_m: number;
  total_drive_sec: number;
  original_total_drive_sec: number;
  optimized: boolean;
  error?: string;
};

type JobLite = {
  id: string;
  title: string;
  address: string | null;
  scheduled_at: string;
  duration_minutes: number;
  lat: number | null;
  lng: number | null;
  team_id: string | null;
};

async function computeMatrix(points: { lat: number; lng: number }[]) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !mapsKey) throw new Error("Google Maps connector not configured");

  const waypoints = points.map((p) => ({
    waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } },
  }));

  const res = await fetch(`${GATEWAY_URL}/routes/distanceMatrix/v2:computeRouteMatrix`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
      "Content-Type": "application/json",
      "X-Goog-FieldMask":
        "originIndex,destinationIndex,duration,distanceMeters,status,condition",
    },
    body: JSON.stringify({
      origins: waypoints,
      destinations: waypoints,
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Routes matrix failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const rows = (await res.json()) as Array<{
    originIndex: number;
    destinationIndex: number;
    duration?: string;
    distanceMeters?: number;
    condition?: string;
  }>;
  const n = points.length;
  const dur: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (const r of rows) {
    if (r.condition && r.condition !== "ROUTE_EXISTS") continue;
    dur[r.originIndex][r.destinationIndex] = r.duration ? Number(String(r.duration).replace("s", "")) : 0;
    dist[r.originIndex][r.destinationIndex] = r.distanceMeters ?? 0;
  }
  for (let i = 0; i < n; i++) {
    dur[i][i] = 0;
    dist[i][i] = 0;
  }
  return { dur, dist };
}

function nearestNeighborOrder(dur: number[][], startIdx = 0): number[] {
  const n = dur.length;
  const visited = new Set<number>([startIdx]);
  const order = [startIdx];
  let cur = startIdx;
  while (visited.size < n) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (visited.has(j)) continue;
      if (dur[cur][j] < bestD) {
        bestD = dur[cur][j];
        best = j;
      }
    }
    if (best === -1) break;
    visited.add(best);
    order.push(best);
    cur = best;
  }
  return order;
}

const OptimizeInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  team_id: z.string().uuid().nullable().optional(),
});

export const optimizeRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => OptimizeInput.parse(raw))
  .handler(async ({ context, data }): Promise<OptimizeResult> => {
    const dayStart = new Date(`${data.date}T00:00:00`);
    const dayEnd = new Date(`${data.date}T23:59:59`);
    let q = context.supabase
      .from("jobs")
      .select("id,title,address,scheduled_at,duration_minutes,lat,lng,team_id,status")
      .gte("scheduled_at", dayStart.toISOString())
      .lte("scheduled_at", dayEnd.toISOString())
      .neq("status", "cancelled")
      .order("scheduled_at", { ascending: true });
    if (data.team_id) q = q.eq("team_id", data.team_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const all = (rows ?? []) as JobLite[];
    const geocoded = all.filter((j) => j.lat != null && j.lng != null);
    const skipped = all
      .filter((j) => j.lat == null || j.lng == null)
      .map((j) => ({ job_id: j.id, title: j.title, reason: "missing coordinates" }));

    if (geocoded.length < 2) {
      return {
        stops: geocoded.map((j) => ({
          job_id: j.id,
          title: j.title,
          address: j.address,
          scheduled_at: j.scheduled_at,
          duration_minutes: j.duration_minutes,
          lat: j.lat as number,
          lng: j.lng as number,
          leg_distance_m: 0,
          leg_duration_sec: 0,
        })),
        skipped,
        total_distance_m: 0,
        total_drive_sec: 0,
        original_total_drive_sec: 0,
        optimized: false,
      };
    }

    const pts = geocoded.map((j) => ({ lat: j.lat as number, lng: j.lng as number }));
    let matrix: { dur: number[][]; dist: number[][] };
    try {
      matrix = await computeMatrix(pts);
    } catch (e) {
      return {
        stops: [],
        skipped,
        total_distance_m: 0,
        total_drive_sec: 0,
        original_total_drive_sec: 0,
        optimized: false,
        error: e instanceof Error ? e.message : "Routes API error",
      };
    }

    // Baseline (original chronological order) totals
    let origDrive = 0;
    for (let i = 1; i < geocoded.length; i++) {
      origDrive += matrix.dur[i - 1][i] || 0;
    }

    // Optimize starting from the first chronological job (anchor)
    const order = nearestNeighborOrder(matrix.dur, 0);
    const stops: OptimizedStop[] = order.map((idx, pos) => {
      const j = geocoded[idx];
      const prev = pos === 0 ? null : order[pos - 1];
      return {
        job_id: j.id,
        title: j.title,
        address: j.address,
        scheduled_at: j.scheduled_at,
        duration_minutes: j.duration_minutes,
        lat: j.lat as number,
        lng: j.lng as number,
        leg_distance_m: prev === null ? 0 : matrix.dist[prev][idx] || 0,
        leg_duration_sec: prev === null ? 0 : matrix.dur[prev][idx] || 0,
      };
    });
    const total_distance_m = stops.reduce((s, x) => s + x.leg_distance_m, 0);
    const total_drive_sec = stops.reduce((s, x) => s + x.leg_duration_sec, 0);
    return {
      stops,
      skipped,
      total_distance_m,
      total_drive_sec,
      original_total_drive_sec: origDrive,
      optimized: true,
    };
  });

const ApplyInput = z.object({
  start_at: z.string().datetime(),
  buffer_minutes: z.number().int().min(0).max(120).default(15),
  stops: z
    .array(
      z.object({
        job_id: z.string().uuid(),
        duration_minutes: z.number().int().min(15).max(8 * 60),
        leg_duration_sec: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(50),
});

export const applyOptimizedOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ApplyInput.parse(raw))
  .handler(async ({ context, data }): Promise<{ updated: number }> => {
    let cursor = new Date(data.start_at).getTime();
    let updated = 0;
    for (let i = 0; i < data.stops.length; i++) {
      const s = data.stops[i];
      if (i > 0) cursor += (s.leg_duration_sec + data.buffer_minutes * 60) * 1000;
      const iso = new Date(cursor).toISOString();
      const { error } = await context.supabase
        .from("jobs")
        .update({ scheduled_at: iso })
        .eq("id", s.job_id);
      if (error) throw new Error(error.message);
      cursor += s.duration_minutes * 60 * 1000;
      updated++;
    }
    return { updated };
  });
