import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Brush, ReferenceLine, Legend } from "recharts";
import { FlightPoint } from "@workspace/api-client-react";

interface Props { points: FlightPoint[] }

const tooltipStyle = {
  backgroundColor: "#0b111a",
  border: "1px solid #1e293b",
  color: "#f8fafc",
  fontSize: "11px",
  fontFamily: "monospace",
};

const axisStyle = { fontSize: 11, fill: "#64748b", fontFamily: "monospace" };
const grid = <CartesianGrid strokeDasharray="3 3" stroke="#1a2535" />;

function ChartCard({ title, sub, height = 280, children }: {
  title: string; sub?: string; height?: number; children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-md border border-border p-4">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{title}</h3>
      {sub && <p className="text-xs text-muted-foreground font-mono mb-3">{sub}</p>}
      {!sub && <div className="mb-3" />}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function FlightTelemetryCharts({ points }: Props) {
  const step = Math.max(1, Math.floor(points.length / 1000));
  const data = points.filter((_, i) => i % step === 0);

  return (
    <div className="space-y-5 p-4">

      {/* ── Altitude ── */}
      <ChartCard title="Altitud (ft)">
        <LineChart data={data}>
          {grid}
          <XAxis dataKey="lclTime" hide />
          <YAxis stroke="#64748b" tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="altP" stroke="#0ea5e9" dot={false} strokeWidth={2} isAnimationActive={false} name="Baro Alt" />
          <Brush dataKey="lclTime" height={24} stroke="#1e293b" fill="#0b111a" tickFormatter={() => ""} />
        </LineChart>
      </ChartCard>

      {/* ── Airspeed ── */}
      <ChartCard title="Velocidad (kt)">
        <LineChart data={data}>
          {grid}
          <XAxis dataKey="lclTime" hide />
          <YAxis stroke="#64748b" tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
          <Line type="monotone" dataKey="ias" stroke="#22c55e" dot={false} strokeWidth={2} isAnimationActive={false} name="IAS" />
          <Line type="monotone" dataKey="tas" stroke="#a855f7" dot={false} strokeWidth={2} isAnimationActive={false} name="TAS" />
          <Brush dataKey="lclTime" height={24} stroke="#1e293b" fill="#0b111a" tickFormatter={() => ""} />
        </LineChart>
      </ChartCard>

      {/* ── Pitch & Roll ── */}
      <ChartCard title="Pitch & Roll (°)">
        <LineChart data={data}>
          {grid}
          <XAxis dataKey="lclTime" hide />
          <YAxis domain={[-90, 90]} stroke="#64748b" tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
          <Line type="monotone" dataKey="pitch" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} name="Pitch" />
          <Line type="monotone" dataKey="roll" stroke="#0ea5e9" dot={false} strokeWidth={2} isAnimationActive={false} name="Roll" />
          <Brush dataKey="lclTime" height={24} stroke="#1e293b" fill="#0b111a" tickFormatter={() => ""} />
        </LineChart>
      </ChartCard>

      {/* ── Fuel Tanks ── */}
      <ChartCard title="Fuel Tanks (gal)"
        sub="Caution below 7 gal per wing tank (POH)">
        <LineChart data={data}>
          {grid}
          <XAxis dataKey="lclTime" hide />
          <YAxis stroke="#64748b" tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v?.toFixed(1)} gal`]} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
          <ReferenceLine y={7} stroke="#ffaa00" strokeDasharray="6 3"
            label={{ value: "7 gal ⚠", fill: "#ffaa00", fontSize: 10, position: "insideTopRight" }} />
          <Line type="monotone" dataKey="fqty1" stroke="#06b6d4" dot={false} strokeWidth={2} isAnimationActive={false} name="Wing L" />
          <Line type="monotone" dataKey="fqty2" stroke="#22d3ee" dot={false} strokeWidth={2} isAnimationActive={false} name="Wing R" />
          {data.some(p => p.fqtyAcro != null) && (
            <Line type="monotone" dataKey="fqtyAcro" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} name="Acro Tank" />
          )}
          <Brush dataKey="lclTime" height={24} stroke="#1e293b" fill="#0b111a" tickFormatter={() => ""} />
        </LineChart>
      </ChartCard>

      {/* ── CHT ── */}
      <ChartCard title="CHT (°F)"
        sub="Verde 200–465°F · Amarillo 100–200°F · Rojo >465°F (según POH)">
        <LineChart data={data}>
          {grid}
          <XAxis dataKey="lclTime" hide />
          <YAxis stroke="#64748b" tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v?.toFixed(0)}°F`]} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
          <ReferenceLine y={465} stroke="#ff3333" strokeDasharray="5 3"
            label={{ value: "465°F 🔴", fill: "#ff3333", fontSize: 10, position: "insideTopRight" }} />
          <ReferenceLine y={200} stroke="#ffaa00" strokeDasharray="5 3"
            label={{ value: "200°F ⚠", fill: "#ffaa00", fontSize: 10, position: "insideBottomRight" }} />
          <Line type="monotone" dataKey="e1Cht1" stroke="#ef4444" dot={false} strokeWidth={1.5} isAnimationActive={false} name="CHT 1" />
          <Line type="monotone" dataKey="e1Cht2" stroke="#f97316" dot={false} strokeWidth={1.5} isAnimationActive={false} name="CHT 2" />
          <Line type="monotone" dataKey="e1Cht3" stroke="#eab308" dot={false} strokeWidth={1.5} isAnimationActive={false} name="CHT 3" />
          <Line type="monotone" dataKey="e1Cht4" stroke="#22c55e" dot={false} strokeWidth={1.5} isAnimationActive={false} name="CHT 4" />
          <Line type="monotone" dataKey="e1Cht5" stroke="#06b6d4" dot={false} strokeWidth={1.5} isAnimationActive={false} name="CHT 5" />
          <Line type="monotone" dataKey="e1Cht6" stroke="#a855f7" dot={false} strokeWidth={1.5} isAnimationActive={false} name="CHT 6" />
          <Brush dataKey="lclTime" height={24} stroke="#1e293b" fill="#0b111a" tickFormatter={() => ""} />
        </LineChart>
      </ChartCard>

      {/* ── EGT ── */}
      <ChartCard title="EGT (°F)"
        sub="Verde 1100–1550°F · Rojo >1550°F (según POH)">
        <LineChart data={data}>
          {grid}
          <XAxis dataKey="lclTime" hide />
          <YAxis stroke="#64748b" tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v?.toFixed(0)}°F`]} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
          <ReferenceLine y={1550} stroke="#ff3333" strokeDasharray="5 3"
            label={{ value: "1550°F 🔴", fill: "#ff3333", fontSize: 10, position: "insideTopRight" }} />
          <Line type="monotone" dataKey="e1Egt1" stroke="#ef4444" dot={false} strokeWidth={1.5} isAnimationActive={false} name="EGT 1" />
          <Line type="monotone" dataKey="e1Egt2" stroke="#f97316" dot={false} strokeWidth={1.5} isAnimationActive={false} name="EGT 2" />
          <Line type="monotone" dataKey="e1Egt3" stroke="#eab308" dot={false} strokeWidth={1.5} isAnimationActive={false} name="EGT 3" />
          <Line type="monotone" dataKey="e1Egt4" stroke="#22c55e" dot={false} strokeWidth={1.5} isAnimationActive={false} name="EGT 4" />
          <Line type="monotone" dataKey="e1Egt5" stroke="#06b6d4" dot={false} strokeWidth={1.5} isAnimationActive={false} name="EGT 5" />
          <Line type="monotone" dataKey="e1Egt6" stroke="#a855f7" dot={false} strokeWidth={1.5} isAnimationActive={false} name="EGT 6" />
          <Brush dataKey="lclTime" height={24} stroke="#1e293b" fill="#0b111a" tickFormatter={() => ""} />
        </LineChart>
      </ChartCard>

    </div>
  );
}
