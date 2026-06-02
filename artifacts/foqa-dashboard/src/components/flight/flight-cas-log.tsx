import { useMemo } from "react";
import { FlightPoint } from "@workspace/api-client-react";

interface Props { points: FlightPoint[] }

interface CASEvent {
  message: string;
  firstTime: string;
  lastTime: string;
  count: number;
  durationSec: number | null;
}

function parseSeconds(t: string): number | null {
  const parts = t.split(":");
  if (parts.length < 3) return null;
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
}

function buildCASLog(points: FlightPoint[]): CASEvent[] {
  const map = new Map<string, { firstTime: string; lastTime: string; count: number }>();

  for (const p of points) {
    if (!p.alerts) continue;
    const time = p.lclTime?.split(" ")[1] ?? "--:--:--";
    for (const raw of p.alerts.split("/")) {
      const msg = raw.trim();
      if (!msg) continue;
      const existing = map.get(msg);
      if (existing) {
        existing.count++;
        existing.lastTime = time;
      } else {
        map.set(msg, { firstTime: time, lastTime: time, count: 1 });
      }
    }
  }

  return Array.from(map.entries())
    .map(([message, ev]) => {
      const s1 = parseSeconds(ev.firstTime);
      const s2 = parseSeconds(ev.lastTime);
      const durationSec = s1 !== null && s2 !== null ? Math.abs(s2 - s1) : null;
      return { message, ...ev, durationSec };
    })
    .sort((a, b) => a.firstTime.localeCompare(b.firstTime));
}

function fmtDuration(sec: number | null): string {
  if (sec === null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}m ${s}s`;
}

export function FlightCASLog({ points }: Props) {
  const events = useMemo(() => buildCASLog(points), [points]);

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground font-mono text-sm">
        ✓ No se registraron mensajes CAS en este vuelo.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          Registro CAS del Vuelo
        </h3>
        <span className="text-xs font-mono text-muted-foreground bg-card border border-border px-3 py-1 rounded">
          {events.length} mensaje{events.length !== 1 ? "s" : ""} únicos
        </span>
      </div>

      <div className="bg-card rounded-md border border-border overflow-hidden">
        {/* Table header */}
        <div className="grid text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border bg-muted/30 px-4 py-2"
          style={{ gridTemplateColumns: "90px 90px 90px 1fr 60px 80px" }}>
          <span>Primera vez</span>
          <span>Última vez</span>
          <span>Duración</span>
          <span>Mensaje</span>
          <span className="text-right">Ocurr.</span>
          <span className="text-right">Estado</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {events.map((ev, i) => {
            const isActive = points.length > 0 &&
              points[points.length - 1].alerts?.includes(ev.message);
            return (
              <div
                key={i}
                className="grid px-4 py-3 hover:bg-muted/20 transition-colors"
                style={{ gridTemplateColumns: "90px 90px 90px 1fr 60px 80px", alignItems: "center" }}
              >
                <span className="font-mono text-xs text-amber-400">{ev.firstTime}</span>
                <span className="font-mono text-xs text-muted-foreground">{ev.lastTime}</span>
                <span className="font-mono text-xs text-muted-foreground">{fmtDuration(ev.durationSec)}</span>
                <span className="font-mono text-xs text-foreground pr-2">{ev.message}</span>
                <span className="font-mono text-xs text-right text-muted-foreground">×{ev.count}</span>
                <span className="text-right">
                  {isActive ? (
                    <span className="text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">
                      ACTIVO
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-muted-foreground/50">resuelto</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 pt-2">
        {events.map((ev, i) => (
          <span key={i} className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded">
            {ev.firstTime} · {ev.message}
          </span>
        ))}
      </div>
    </div>
  );
}
