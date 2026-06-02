import { useListFlights, getListFlightsQueryKey, useDeleteFlight } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/layout";
import { UploadButton } from "@/components/flight/upload-button";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { Activity, Plane, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { data: flights, isLoading } = useListFlights();
  const deleteFlight = useDeleteFlight();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("¿Eliminar este registro de vuelo?")) {
      deleteFlight.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Flight deleted" });
            queryClient.invalidateQueries({ queryKey: getListFlightsQueryKey() });
          }
        }
      );
    }
  };

  const formatDuration = (start?: string | null, end?: string | null) => {
    if (!start || !end) return "--";
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    const diffMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto w-full p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Registros de vuelo</h2>
            <p className="text-muted-foreground font-mono text-sm mt-1">Revisar el rendimiento y los datos de telemetría</p>
          </div>
          {/* Solo mostrar el botón del header cuando ya hay vuelos; si no hay, el botón va en el estado vacío */}
          {flights && flights.length > 0 && <UploadButton />}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-card rounded-md border border-border animate-pulse" />
            ))}
          </div>
        ) : !flights || flights.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent text-center p-12">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
              <Activity className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground mb-2">No hay datos de vuelo disponibles</h3>
              <p className="max-w-sm mb-6 text-sm">Para comenzar el análisis, suba un archivo de registro CSV de Garmin G3X.</p>
              <UploadButton />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {flights.map((flight) => (
              <Link key={flight.id} href={`/flights/${flight.id}`} className="block group">
                <Card className="hover:border-primary/50 transition-colors bg-card/50 hover:bg-card">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted p-3 rounded-md group-hover:bg-primary/10 transition-colors">
                        <Plane className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold text-lg">{flight.aircraftIdent || 'Aeronave desconocida'}</div>
                        <div className="text-sm font-mono text-muted-foreground mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {flight.startTime ? format(parseISO(flight.startTime), 'd MMM yyyy HH:mm') : 'Fecha desconocida'}
                          </span>
                          <span>•</span>
                          <span>{formatDuration(flight.startTime, flight.endTime)}</span>
                          <span>•</span>
                          <span>{flight.totalPoints} pts</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex gap-4 font-mono text-sm text-right">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs uppercase">Alt Máx</span>
                          <span className="text-cyan-400">{flight.maxAltGps ? `${flight.maxAltGps.toFixed(0)} ft` : '--'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground text-xs uppercase">Vel Máx</span>
                          <span className="text-cyan-400">{flight.maxIas ? `${flight.maxIas.toFixed(0)} kt` : '--'}</span>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDelete(e, flight.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
