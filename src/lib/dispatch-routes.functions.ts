import { createServerFn } from "@tanstack/react-start";
import { dispatchTeams, MAP_METERS_PER_PERCENT } from "@/lib/dispatch-data";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
/** Must match MAP_CENTER in google-maps-loader.ts */
const MAP_CENTER = { lat: -23.5613, lng: -46.6566 };
const SPAN_DEG = 0.018;

function percentToLatLng(p: { x: number; y: number }) {
  return {
    latitude: MAP_CENTER.lat + (50 - p.y) * (SPAN_DEG / 100),
    longitude: MAP_CENTER.lng + (p.x - 50) * (SPAN_DEG / 100),
  };
}

export type TeamRoute = {
  teamId: string;
  encodedPolyline: string;
  distanceMeters: number;
  durationSec: number;
};

/**
 * Calls Google Routes API (computeRoutes) through the Lovable connector
 * gateway for every team currently driving toward a job. Returns encoded
 * polylines that the client decodes and animates along.
 */
export const getTeamRoutes = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ routes: TeamRoute[]; error?: string }> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) {
      return { routes: [], error: "Google Maps connector not configured" };
    }

    const onWay = dispatchTeams.filter(
      (t) => t.status === "on_way" && t.job?.location,
    );

    const results = await Promise.all(
      onWay.map(async (team): Promise<TeamRoute | null> => {
        const origin = percentToLatLng(team.position);
        const destination = percentToLatLng(team.job!.location!);
        try {
          const res = await fetch(
            `${GATEWAY_URL}/routes/directions/v2:computeRoutes`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "X-Connection-Api-Key": mapsKey,
                "Content-Type": "application/json",
                "X-Goog-FieldMask":
                  "routes.polyline.encodedPolyline,routes.duration,routes.distanceMeters",
              },
              body: JSON.stringify({
                origin: { location: { latLng: origin } },
                destination: { location: { latLng: destination } },
                travelMode: "DRIVE",
                routingPreference: "TRAFFIC_AWARE",
              }),
            },
          );
          if (!res.ok) {
            console.error("Routes API failed", team.id, res.status, await res.text());
            return null;
          }
          const data = (await res.json()) as {
            routes?: {
              polyline?: { encodedPolyline?: string };
              duration?: string;
              distanceMeters?: number;
            }[];
          };
          const route = data.routes?.[0];
          const encoded = route?.polyline?.encodedPolyline;
          if (!encoded) return null;
          const durationSec = route?.duration
            ? Number(route.duration.replace("s", ""))
            : 0;
          return {
            teamId: team.id,
            encodedPolyline: encoded,
            distanceMeters: route?.distanceMeters ?? 0,
            durationSec,
          };
        } catch (err) {
          console.error("Routes API error", team.id, err);
          return null;
        }
      }),
    );

    return { routes: results.filter((r): r is TeamRoute => r !== null) };
  },
);

// Reference to keep the constant import live for downstream changes.
void MAP_METERS_PER_PERCENT;