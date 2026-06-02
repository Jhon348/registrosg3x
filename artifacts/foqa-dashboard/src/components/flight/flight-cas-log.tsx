import { useMemo } from "react";
import { FlightPoint } from "@workspace/api-client-react";

interface Props { points: FlightPoint[] }

interface CASEntry {
  time: string;
  message: string;
  type: "appeared" | "changed" | "cleared";
}

function buildTimeline(points: FlightPoint[]): CASEntry[] {
  const entries: CASEntry[] = [];
  let prev: string | null = null;

  for (const p of points) {
    const msg = p.alerts?.trim() || null;
    if (msg === prev) continue; // no change

    const time = p.lclTime?.split(" ")[1] ?? p.lclTime ?? "--:--:--";

    if (msg === null || msg === "") {
      if (prev !== null) {
        entries.push({ time, message: "", type: "cleared" });
      }
    } else if (prev === null || prev === "") {
      entries.push({ time, message: msg, type: "appeared" });
    } else {
      entries.push({ time, message: msg, type: "changed" });
    }

    prev = msg;
  }

  return entries;
}

export function FlightCASLog({ points }: Props) {
  const timeline = useMemo(() => buildTimeline(points), [points]);

  if (timeline.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground font-mono text-sm">
        ✓ No se registraron mensajes CAS en este vuelo.
      </div>
    );
  }

  const activeCount  = timeline.filter(e => e.type !== "cleared").length;
  const clearCount   = timeline.filter(e => e.type === "cleared").length;

  return (
    <div className="p-4 space-y-4" translate="no">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          Registro CAS — cronológico
        </h3>
        <div className="flex gap-2 text-xs font-mono">
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded">
            {activeCount} eventos
          </span>
          <span className="bg-card text-muted-foreground border border-border px-3 py-1 rounded">
            {clearCount} despejes
          </span>
        </div>
      </div>

      <div className="bg-card rounded-md border border-border overflow-hidden">
        {/* Header */}
        <div
          className="grid text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border bg-muted/30 px-4 py-2"
          style={{ gridTemplateColumns: "90px 16px 1fr" }}
        >
          <span>Hora</span>
          <span />
          <span>Mensaje CAS</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {timeline.map((entry, i) => {
            const isCleared = entry.type === "cleared";
            return (
              <div
                key={i}
                className={`grid px-4 py-2.5 items-center ${
                  isCleared ? "opacity-50" : "hover:bg-muted/20"
                } transition-colors`}
                style={{ gridTemplateColumns: "90px 16px 1fr" }}
              >
                {/* Time */}
                <span className="font-mono text-xs text-amber-400">
                  {entry.time}
                </span>

                {/* Indicator dot */}
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCleared
                      ? "bg-muted-foreground/30"
                      : entry.type === "appeared"
                      ? "bg-amber-400"
                      : "bg-orange-400"
                  }`}
                />

                {/* Message — verbatim from log */}
                {isCleared ? (
                  <span className="font-mono text-xs text-muted-foreground italic">
                    (despejado)
                  </span>
                ) : (
                  <span className="font-mono text-xs text-foreground">
                    {entry.message}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
