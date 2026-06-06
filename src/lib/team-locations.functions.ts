import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TeamLocation = {
  team_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  heading: number | null;
  speed: number | null;
  recorded_at: string;
};

const PingInput = z.object({
  team_id: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_m: z.number().min(0).max(100000).nullable().optional(),
  heading: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
});

export const recordTeamLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => PingInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("team_locations")
      .upsert(
        {
          owner_id: context.userId,
          team_id: data.team_id,
          lat: data.lat,
          lng: data.lng,
          accuracy_m: data.accuracy_m ?? null,
          heading: data.heading ?? null,
          speed: data.speed ?? null,
          recorded_at: new Date().toISOString(),
        },
        { onConflict: "team_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTeamLocations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamLocation[]> => {
    const { data, error } = await context.supabase
      .from("team_locations")
      .select("team_id, lat, lng, accuracy_m, heading, speed, recorded_at");
    if (error) throw new Error(error.message);
    return (data ?? []) as TeamLocation[];
  });

export const getTeamLocation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ team_id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }): Promise<TeamLocation | null> => {
    const { data: row, error } = await context.supabase
      .from("team_locations")
      .select("team_id, lat, lng, accuracy_m, heading, speed, recorded_at")
      .eq("team_id", data.team_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as TeamLocation | null;
  });