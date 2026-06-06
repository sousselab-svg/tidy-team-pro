import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.LOVABLE_API_KEY;
  const conn = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || !conn) return null;
  const res = await fetch(
    `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
    { headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": conn } },
  );
  if (!res.ok) return null;
  const data: any = await res.json();
  const loc = data?.results?.[0]?.geometry?.location;
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") return null;
  return { lat: loc.lat, lng: loc.lng };
}

export const geocodeJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { data: job, error } = await context.supabase
      .from("jobs")
      .select("id, address")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!job?.address) throw new Error("Serviço sem endereço");
    const coords = await geocode(job.address);
    if (!coords) throw new Error("Não foi possível localizar o endereço");
    const { error: upErr } = await context.supabase
      .from("jobs")
      .update({ lat: coords.lat, lng: coords.lng })
      .eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    return coords;
  });

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type AutoCheckInResult = {
  transitions: Array<{
    job_id: string;
    title: string;
    from: string;
    to: string;
    distance_m: number;
  }>;
};

export const autoCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        team_id: z.string().uuid(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }): Promise<AutoCheckInResult> => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const { data: jobs, error } = await context.supabase
      .from("jobs")
      .select("id, title, status, lat, lng, geofence_radius_m, auto_check_in_enabled, arrived_at, scheduled_at")
      .eq("team_id", data.team_id)
      .eq("auto_check_in_enabled", true)
      .in("status", ["scheduled", "on_way"])
      .not("lat", "is", null)
      .not("lng", "is", null)
      .gte("scheduled_at", start.toISOString())
      .lte("scheduled_at", end.toISOString());
    if (error) throw new Error(error.message);

    const transitions: AutoCheckInResult["transitions"] = [];
    for (const j of jobs ?? []) {
      if (j.lat == null || j.lng == null) continue;
      const dist = haversineM({ lat: data.lat, lng: data.lng }, { lat: j.lat, lng: j.lng });
      const radius = j.geofence_radius_m ?? 150;
      if (dist <= radius) {
        const patch: Record<string, unknown> = {
          status: "in_progress",
          arrived_at: j.arrived_at ?? now.toISOString(),
        };
        const { error: uErr } = await context.supabase
          .from("jobs")
          .update(patch)
          .eq("id", j.id);
        if (!uErr) {
          transitions.push({
            job_id: j.id,
            title: j.title,
            from: j.status as string,
            to: "in_progress",
            distance_m: Math.round(dist),
          });
        }
      } else if (dist <= radius * 5 && j.status === "scheduled") {
        const { error: uErr } = await context.supabase
          .from("jobs")
          .update({ status: "on_way" })
          .eq("id", j.id);
        if (!uErr) {
          transitions.push({
            job_id: j.id,
            title: j.title,
            from: "scheduled",
            to: "on_way",
            distance_m: Math.round(dist),
          });
        }
      }
    }
    return { transitions };
  });