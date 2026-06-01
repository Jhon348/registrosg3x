import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Brush } from "recharts";
import { FlightPoint } from "@workspace/api-client-react";

interface Props {
  points: FlightPoint[];
}

export function FlightTelemetryCharts({ points }: Props) {
  // downsample for performance if too many points
  const data = points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 1000)) === 0);

  return (
    <div className="space-y-6">
      <div className="h-[300px] bg-card p-4 rounded-md border border-border">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 tracking-wider">Altitude (ft)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="lclTime" hide />
            <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#0b111a', border: '1px solid #1e293b', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }} />
            <Line type="monotone" dataKey="altGps" stroke="#0ea5e9" dot={false} strokeWidth={2} isAnimationActive={false} name="GPS Alt" />
            <Brush dataKey="lclTime" height={30} stroke="#1e293b" fill="#0b111a" tickFormatter={() => ''} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-[300px] bg-card p-4 rounded-md border border-border">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 tracking-wider">Airspeed (kt)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="lclTime" hide />
            <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#0b111a', border: '1px solid #1e293b', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }} />
            <Line type="monotone" dataKey="ias" stroke="#22c55e" dot={false} strokeWidth={2} name="IAS" isAnimationActive={false} />
            <Line type="monotone" dataKey="tas" stroke="#a855f7" dot={false} strokeWidth={2} name="TAS" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="h-[300px] bg-card p-4 rounded-md border border-border">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 tracking-wider">Pitch & Roll (deg)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="lclTime" hide />
            <YAxis domain={[-90, 90]} stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#0b111a', border: '1px solid #1e293b', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }} />
            <Line type="monotone" dataKey="pitch" stroke="#f59e0b" dot={false} strokeWidth={2} name="Pitch" isAnimationActive={false} />
            <Line type="monotone" dataKey="roll" stroke="#0ea5e9" dot={false} strokeWidth={2} name="Roll" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
