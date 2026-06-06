import { useEffect, useState } from "react";
import type { DispatchTeam } from "@/lib/dispatch-data";
import { MAP_METERS_PER_PERCENT, TEAM_STATUS } from "@/lib/dispatch-data";

/**
 * Visual GPS canvas. Streets are drawn in SVG and team markers drift slightly
 * to simulate real-time movement until the real Google Maps connector is wired.
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
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const selectedTeam = teams.find((t) => t.id === selectedId);
  const fenceLoc = selectedTeam?.job?.location;
  const fenceM = selectedTeam?.job?.geofenceM;
  const fenceR = fenceLoc && fenceM ? fenceM / MAP_METERS_PER_PERCENT : null;

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-3xl bg-[color:var(--accent)] ring-1 ring-border">
      {/* Street grid */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="grid" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M 14 0 L 0 0 0 14" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        {/* Main roads */}
        <path d="M0 50 L100 50" stroke="white" strokeWidth="2.2" strokeOpacity="0.9" />
        <path d="M55 0 L55 100" stroke="white" strokeWidth="2.2" strokeOpacity="0.9" />
        <path d="M0 22 L100 22" stroke="white" strokeWidth="1.2" strokeOpacity="0.7" />
        <path d="M20 0 L20 100" stroke="white" strokeWidth="1.2" strokeOpacity="0.7" />
        {/* River */}
        <path
          d="M0 85 Q30 75 50 88 T100 80 L100 100 L0 100 Z"
          fill="var(--info)"
          fillOpacity="0.18"
        />
        {/* Park */}
        <rect x="70" y="38" width="22" height="18" rx="2" fill="var(--primary)" fillOpacity="0.18" />
        <text x="81" y="49" textAnchor="middle" fontSize="2.4" fill="var(--primary-dark)" fontWeight="700">
          PARQUE
        </text>

        {/* Geofence ring for selected team's job */}
        {fenceLoc && fenceR && (
          <g>
            <circle
              cx={fenceLoc.x}
              cy={fenceLoc.y}
              r={fenceR}
              fill="var(--success)"
              fillOpacity="0.15"
              stroke="var(--success)"
              strokeWidth="0.5"
              strokeDasharray="1.5 1"
            />
            <circle
              cx={fenceLoc.x}
              cy={fenceLoc.y}
              r="0.8"
              fill="var(--success)"
            />
          </g>
        )}
      </svg>

      {/* HQ */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: "50%", top: "50%" }}
        aria-label="Sede"
      >
        <div className="flex flex-col items-center gap-1">
          <span className="grid size-7 place-items-center rounded-md bg-foreground text-[10px] font-bold text-background ring-2 ring-background">
            HQ
          </span>
        </div>
      </div>

      {/* Team markers */}
      {teams.map((team, i) => {
        const meta = TEAM_STATUS[team.status];
        const drift = team.status === "on_way" ? Math.sin(tick / 2 + i) * 1.5 : 0;
        const selected = team.id === selectedId;
        return (
          <button
            key={team.id}
            type="button"
            onClick={() => onSelect?.(team.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear focus:outline-none"
            style={{
              left: `${team.position.x + drift}%`,
              top: `${team.position.y + drift / 2}%`,
              zIndex: selected ? 20 : 10,
            }}
          >
            {team.status === "on_way" && (
              <span
                className="absolute inset-0 -z-10 animate-ping rounded-full"
                style={{ backgroundColor: meta.color, opacity: 0.35 }}
              />
            )}
            <span
              className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold text-background shadow-lg ring-2 ring-background"
              style={{ backgroundColor: meta.color }}
            >
              <span className="grid size-4 place-items-center rounded-full bg-background/25 text-[9px]">
                {team.name.split(" ")[1]?.[0] ?? "?"}
              </span>
              {team.name.replace("Equipe ", "")}
            </span>
          </button>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-semibold text-foreground backdrop-blur ring-1 ring-border">
        <span className="relative grid size-2 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--success)] opacity-75" />
          <span className="relative size-2 rounded-full bg-[color:var(--success)]" />
        </span>
        Ao vivo
      </div>
      <div className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-mono font-semibold text-muted-foreground backdrop-blur ring-1 ring-border">
        São Paulo · Centro
      </div>
    </div>
  );
}