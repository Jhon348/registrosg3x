import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Brush, ReferenceLine, Legend } from "recharts";
import { FlightPoint } from "@workspace/api-client-react";

interface Props { points: FlightPoint[] }

const toTime = (t: string) => t?.split(" ")[1] ?? t;

export function FlightVoltageChart({ points }: Props) {
  const data = points
    .filter((_, i) => i % Math.max(1, Math.floor(points.length / 1000)) === 0)
    .map(p => ({ t: toTime(p.lclTime), volts: p.volts1, amps: p.amps1 }));

  const tooltipStyle = {
    backgroundColor: "#0b111a",
    border: "1px solid #1e293b",
    color: "#f8fafc",
    fontSize: "12px",
    fontFamily: "monospace",
  };

  return (
    <div className="space-y-6 p-4">
      {/* Voltage chart */}
      <div className="bg-card rounded-md border border-border p-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-1 tracking-wider">
          Voltaje del Bus (V)
        </h3>
        <p className="text-xs text-muted-foreground font-mono mb-4">
          Verde 12.4–15.5 V · Amarillo &lt;12.4 o &gt;15.5 V (según POH)
        </p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="t" hide />
              <YAxis domain={[10, 17]} stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "monospace" }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v?.toFixed(2)} V`, "Voltaje"]} />
              {/* POH green band limits */}
              <ReferenceLine y={15.5} stroke="#ffaa00" strokeDasharray="6 3" label={{ value: "15.5V ⚠", fill: "#ffaa00", fontSize: 10 }} />
              <ReferenceLine y={12.4} stroke="#ffaa00" strokeDasharray="6 3" label={{ value: "12.4V ⚠", fill: "#ffaa00", fontSize: 10, position: "insideBottomRight" }} />
              <Line type="monotone" dataKey="volts" stroke="#00c3ff" dot={false} strokeWidth={2} isAnimationActive={false} name="Volts" />
              <Brush dataKey="t" height={24} stroke="#1e293b" fill="#0b111a" tickFormatter={() => ""} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Amperes chart */}
      <div className="bg-card rounded-md border border-border p-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-1 tracking-wider">
          Amperios (A)
        </h3>
        <p className="text-xs text-muted-foreground font-mono mb-4">
          Verde 1–60 A · Amarillo &lt;0 A (según POH)
        </p>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="t" hide />
              <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "monospace" }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v?.toFixed(1)} A`, "Amps"]} />
              <ReferenceLine y={0} stroke="#ffaa00" strokeDasharray="6 3" label={{ value: "0A ⚠", fill: "#ffaa00", fontSize: 10 }} />
              <ReferenceLine y={60} stroke="#334155" strokeDasharray="4 4" label={{ value: "60A límite", fill: "#64748b", fontSize: 10 }} />
              <Line type="monotone" dataKey="amps" stroke="#a855f7" dot={false} strokeWidth={2} isAnimationActive={false} name="Amps" />
              <Brush dataKey="t" height={24} stroke="#1e293b" fill="#0b111a" tickFormatter={() => ""} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Combined for context */}
      <div className="bg-card rounded-md border border-border p-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-1 tracking-wider">
          Voltaje + Amperios
        </h3>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="t" hide />
              <YAxis yAxisId="v" domain={[10, 17]} stroke="#00c3ff" tick={{ fontSize: 10, fill: "#00c3ff", fontFamily: "monospace" }} />
              <YAxis yAxisId="a" orientation="right" stroke="#a855f7" tick={{ fontSize: 10, fill: "#a855f7", fontFamily: "monospace" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }} />
              <Line yAxisId="v" type="monotone" dataKey="volts" stroke="#00c3ff" dot={false} strokeWidth={2} isAnimationActive={false} name="Volts (V)" />
              <Line yAxisId="a" type="monotone" dataKey="amps" stroke="#a855f7" dot={false} strokeWidth={1.5} isAnimationActive={false} name="Amps (A)" />
              <Brush dataKey="t" height={24} stroke="#1e293b" fill="#0b111a" tickFormatter={() => ""} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
