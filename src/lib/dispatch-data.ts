export type TeamStatus = "on_way" | "in_progress" | "completed" | "cancelled" | "idle";

export const TEAM_STATUS: Record<TeamStatus, { label: string; color: string }> = {
  on_way: { label: "A caminho", color: "var(--warning)" },
  in_progress: { label: "Em andamento", color: "var(--info)" },
  completed: { label: "Finalizado", color: "var(--success)" },
  cancelled: { label: "Cancelado", color: "var(--destructive)" },
  idle: { label: "Disponível", color: "var(--muted-foreground)" },
};

export type DispatchTeam = {
  id: string;
  name: string;
  members: string[];
  status: TeamStatus;
  job?: {
    id: string;
    client: string;
    address: string;
    etaMin?: number;
    progress?: number;
    /** Service location on the mock map in % (0–100) */
    location?: { x: number; y: number };
    /** Geofence radius in meters (validated on check-in/out) */
    geofenceM?: number;
  };
  /** Position on the mock map in % (0–100) */
  position: { x: number; y: number };
  /** Direction in degrees for the heading indicator */
  heading: number;
  speedKmh: number;
  batteryPct: number;
};

/** Mock scale: each 1% on the map ≈ 25 meters on the ground. */
export const MAP_METERS_PER_PERCENT = 25;

/** Distance in meters between two map points (% coordinates). */
export function distanceM(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.round(Math.sqrt(dx * dx + dy * dy) * MAP_METERS_PER_PERCENT);
}

/** True when the team is inside the job's geofence. */
export function isWithinGeofence(team: DispatchTeam): boolean {
  if (!team.job?.location || team.job.geofenceM == null) return false;
  return distanceM(team.position, team.job.location) <= team.job.geofenceM;
}

export const dispatchTeams: DispatchTeam[] = [
  {
    id: "alpha",
    name: "Equipe Alpha",
    members: ["Carlos M.", "Sofia R."],
    status: "in_progress",
    job: {
      id: "4402",
      client: "Família Santos",
      address: "R. Oscar Freire, 220",
      progress: 65,
      location: { x: 33, y: 43 },
      geofenceM: 120,
    },
    position: { x: 32, y: 42 },
    heading: 90,
    speedKmh: 0,
    batteryPct: 78,
  },
  {
    id: "bravo",
    name: "Equipe Bravo",
    members: ["Bruno A.", "Larissa N."],
    status: "on_way",
    job: {
      id: "4404",
      client: "Marina Oliveira",
      address: "Al. Santos, 45",
      etaMin: 12,
      location: { x: 78, y: 18 },
      geofenceM: 100,
    },
    position: { x: 58, y: 28 },
    heading: 220,
    speedKmh: 38,
    batteryPct: 92,
  },
  {
    id: "gamma",
    name: "Equipe Gamma",
    members: ["Maria L.", "Pedro V."],
    status: "on_way",
    job: {
      id: "4403",
      client: "Cond. Vila Real",
      address: "R. Haddock Lobo, 890",
      etaMin: 4,
      location: { x: 71, y: 61 },
      geofenceM: 100,
    },
    position: { x: 70, y: 60 },
    heading: 145,
    speedKmh: 22,
    batteryPct: 64,
  },
  {
    id: "delta",
    name: "Equipe Delta",
    members: ["Ana C.", "Júlio P."],
    status: "completed",
    job: {
      id: "4401",
      client: "Escritórios TechHub",
      address: "Av. Paulista, 1500",
      location: { x: 45, y: 72 },
      geofenceM: 100,
    },
    position: { x: 45, y: 72 },
    heading: 0,
    speedKmh: 0,
    batteryPct: 41,
  },
  {
    id: "echo",
    name: "Equipe Echo",
    members: ["Tiago F."],
    status: "idle",
    position: { x: 22, y: 78 },
    heading: 0,
    speedKmh: 0,
    batteryPct: 100,
  },
];