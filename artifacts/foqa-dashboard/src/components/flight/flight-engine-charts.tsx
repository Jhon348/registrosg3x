import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { FlightPoint } from "@workspace/api-client-react";

interface Props {
  points: FlightPoint[];
}

export function FlightEngineCharts({ points }: Props) {
  const data = points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 1000)) === 0);

  return (
    <div className="space-y-6">
      <div className="h-[300px] bg-card p-4 rounded-md border border-border">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 tracking-wider">Engine RPM & MAP</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="lclTime" hide />
            <YAxis yAxisId="left" stroke="#0ea5e9" domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#0ea5e9' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#22c55e" domain={['auto', 'auto']} tick={{ fontSize: 12, fill: '#22c55e' }} />
            <Tooltip contentStyle={{ backgroundColor: '#0b111a', border: '1px solid #1e293b', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }} />
            <Line yAxisId="left" type="monotone" dataKey="e1Rpm" stroke="#0ea5e9" dot={false} isAnimationActive={false} name="RPM" />
            <Line yAxisId="right" type="monotone" dataKey="e1Map" stroke="#22c55e" dot={false} isAnimationActive={false} name="MAP" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-[300px] bg-card p-4 rounded-md border border-border">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 tracking-wider">CHT (°F)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="lclTime" hide />
            <YAxis domain={[200, 500]} stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#0b111a', border: '1px solid #1e293b', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }} />
            <ReferenceLine y={400} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '400 Limit', fill: '#ef4444', fontSize: 12 }} />
            <Line type="monotone" dataKey="e1Cht1" stroke="#0ea5e9" dot={false} isAnimationActive={false} name="CHT 1" />
            <Line type="monotone" dataKey="e1Cht2" stroke="#22c55e" dot={false} isAnimationActive={false} name="CHT 2" />
            <Line type="monotone" dataKey="e1Cht3" stroke="#f59e0b" dot={false} isAnimationActive={false} name="CHT 3" />
            <Line type="monotone" dataKey="e1Cht4" stroke="#a855f7" dot={false} isAnimationActive={false} name="CHT 4" />
            <Line type="monotone" dataKey="e1Cht5" stroke="#ec4899" dot={false} isAnimationActive={false} name="CHT 5" />
            <Line type="monotone" dataKey="e1Cht6" stroke="#eab308" dot={false} isAnimationActive={false} name="CHT 6" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="h-[300px] bg-card p-4 rounded-md border border-border">
        <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 tracking-wider">EGT (°F)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="lclTime" hide />
            <YAxis domain={[1000, 1600]} stroke="#64748b" tick={{ fontSize: 12, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#0b111a', border: '1px solid #1e293b', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }} />
            <ReferenceLine y={1500} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '1500 Limit', fill: '#ef4444', fontSize: 12 }} />
            <Line type="monotone" dataKey="e1Egt1" stroke="#0ea5e9" dot={false} isAnimationActive={false} name="EGT 1" />
            <Line type="monotone" dataKey="e1Egt2" stroke="#22c55e" dot={false} isAnimationActive={false} name="EGT 2" />
            <Line type="monotone" dataKey="e1Egt3" stroke="#f59e0b" dot={false} isAnimationActive={false} name="EGT 3" />
            <Line type="monotone" dataKey="e1Egt4" stroke="#a855f7" dot={false} isAnimationActive={false} name="EGT 4" />
            <Line type="monotone" dataKey="e1Egt5" stroke="#ec4899" dot={false} isAnimationActive={false} name="EGT 5" />
            <Line type="monotone" dataKey="e1Egt6" stroke="#eab308" dot={false} isAnimationActive={false} name="EGT 6" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
