import { useParams, Link } from "wouter";
import { useGetFlight, getGetFlightQueryKey, useGetFlightPoints, getGetFlightPointsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlightMap } from "@/components/flight/flight-map";
import { FlightTelemetryCharts } from "@/components/flight/flight-telemetry-charts";
import { FlightEngineCharts } from "@/components/flight/flight-engine-charts";
import { FlightReplay } from "@/components/flight/flight-replay";
import { AlertTriangle, ArrowLeft, Loader2, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function FlightDetail() {
  const { id } = useParams();
  const flightId = parseInt(id || "0", 10);
  
  const { data: flight, isLoading: loadingFlight } = useGetFlight(flightId, { 
    query: { enabled: !!flightId, queryKey: getGetFlightQueryKey(flightId) } 
  });
  
  const { data: points, isLoading: loadingPoints } = useGetFlightPoints(flightId, {
    query: { enabled: !!flightId, queryKey: getGetFlightPointsQueryKey(flightId) }
  });

  if (loadingFlight) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-primary">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="font-mono text-sm tracking-widest">LOADING TELEMETRY...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (!flight) {
    return (
      <Layout>
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="bg-card p-8 rounded-md border border-border max-w-md w-full">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Flight Not Found</h3>
            <p className="text-muted-foreground text-sm mb-6">The requested flight log could not be located in the database.</p>
            <Link href="/">
              <span className="text-primary hover:underline font-mono text-sm tracking-wider uppercase">Return to logbook</span>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Find unique alerts
  const alerts = points ? Array.from(new Set(points.filter(p => p.alerts).map(p => p.alerts!))) : [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto w-full p-6 space-y-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            <Link href="/">
              <div className="w-10 h-10 rounded-md bg-card border border-border flex items-center justify-center hover:bg-muted hover:text-primary cursor-pointer transition-colors group">
                <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </Link>
            <div>
              <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                {flight.aircraftIdent || 'Unknown Tail'} 
                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 tracking-wider">
                  {flight.product || 'G3X'}
                </span>
              </h2>
              <div className="text-sm font-mono text-muted-foreground mt-2 flex items-center gap-6">
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4"/>{flight.startTime ? format(parseISO(flight.startTime), 'MMMM d, yyyy HH:mm') : 'Unknown Date'}</span>
                <span className="opacity-50">/</span>
                <span>DURATION: {flight.endTime ? formatDuration(flight.startTime, flight.endTime) : '--'}</span>
                <span className="opacity-50">/</span>
                <span>POINTS: {flight.totalPoints}</span>
              </div>
            </div>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm uppercase tracking-widest">
              <AlertTriangle className="w-4 h-4" /> System Alerts Logged
            </div>
            <div className="flex flex-wrap gap-2">
              {alerts.map((a, i) => (
                <span key={i} className="text-xs font-mono bg-amber-500/20 text-amber-400 px-3 py-1 rounded border border-amber-500/30 tracking-wider">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatBox label="MAX ALT" value={flight.maxAltGps?.toFixed(0)} unit="FT" />
          <StatBox label="MAX IAS" value={flight.maxIas?.toFixed(0)} unit="KT" />
          <StatBox label="MAX RPM" value={flight.maxRpm?.toFixed(0)} unit="RPM" />
          <StatBox label="MAX EGT" value={flight.maxEgt?.toFixed(0)} unit="°F" alert={(flight.maxEgt || 0) > 1500} />
          <StatBox label="FUEL USED" value={flight.fuelUsed?.toFixed(1)} unit="GAL" />
        </div>

        <Tabs defaultValue="map" className="w-full">
          <TabsList className="w-full justify-start bg-card border-b border-border rounded-none p-0 h-auto">
            <TabsTrigger value="map" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-8 py-4 font-mono uppercase text-sm tracking-wider">Flight Path</TabsTrigger>
            <TabsTrigger value="telemetry" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-8 py-4 font-mono uppercase text-sm tracking-wider">Telemetry</TabsTrigger>
            <TabsTrigger value="engine" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-8 py-4 font-mono uppercase text-sm tracking-wider">Engine</TabsTrigger>
            <TabsTrigger value="replay" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-8 py-4 font-mono uppercase text-sm tracking-wider">Replay</TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            {loadingPoints ? (
              <div className="h-64 flex flex-col gap-4 items-center justify-center text-primary">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="font-mono text-sm tracking-widest uppercase">Fetching data blocks...</span>
              </div>
            ) : points ? (
              <>
                <TabsContent value="map" className="m-0 focus-visible:outline-none">
                  <FlightMap points={points} />
                </TabsContent>
                <TabsContent value="telemetry" className="m-0 focus-visible:outline-none">
                  <FlightTelemetryCharts points={points} />
                </TabsContent>
                <TabsContent value="engine" className="m-0 focus-visible:outline-none">
                  <FlightEngineCharts points={points} />
                </TabsContent>
                <TabsContent value="replay" className="m-0 focus-visible:outline-none">
                  <FlightReplay points={points} />
                </TabsContent>
              </>
            ) : null}
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}

function StatBox({ label, value, unit, alert = false }: { label: string, value: any, unit: string, alert?: boolean }) {
  return (
    <div className={`bg-card p-5 rounded-md border ${alert ? 'border-destructive bg-destructive/10' : 'border-border'} flex flex-col`}>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`text-3xl font-mono font-bold tracking-tight ${alert ? 'text-destructive' : 'text-foreground'}`}>{value ?? '--'}</span>
        <span className="text-xs font-mono text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function formatDuration(start?: string | null, end?: string | null) {
  if (!start || !end) return "--";
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const diffMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hrs}h ${mins}m`;
}
