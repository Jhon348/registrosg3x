import { useState, useEffect } from "react";
import { FlightPoint } from "@workspace/api-client-react";
import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Props {
  points: FlightPoint[];
}

export function FlightReplay({ points }: Props) {
  const validPoints = points.filter(p => p.lat != null && p.lon != null) as (FlightPoint & { lat: number, lon: number })[];
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setIndex(i => {
        if (i >= validPoints.length - 1) {
          setIsPlaying(false);
          return i;
        }
        return i + Math.floor(speed);
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying, speed, validPoints.length]);

  if (validPoints.length === 0) return <div className="h-[400px] flex items-center justify-center bg-card text-muted-foreground border border-border rounded-md font-mono text-sm uppercase">No GPS data for replay</div>;

  const currentPoint = validPoints[index];
  const positions: [number, number][] = validPoints.map(p => [p.lat, p.lon]);
  const progress = (index / (validPoints.length - 1)) * 100;
  
  const chtMax = Math.max(
    currentPoint.e1Cht1 || 0,
    currentPoint.e1Cht2 || 0,
    currentPoint.e1Cht3 || 0,
    currentPoint.e1Cht4 || 0,
    currentPoint.e1Cht5 || 0,
    currentPoint.e1Cht6 || 0
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="h-[450px] w-full rounded-md overflow-hidden border border-border relative">
          <MapContainer center={[currentPoint.lat, currentPoint.lon]} zoom={11} style={{ height: "100%", width: "100%" }}>
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <Polyline positions={positions} color="#1e293b" weight={3} opacity={0.5} />
            <Polyline positions={positions.slice(0, index + 1)} color="#0ea5e9" weight={3} />
            <Marker position={[currentPoint.lat, currentPoint.lon]} />
          </MapContainer>
        </div>
        
        <div className="bg-card p-4 rounded-md border border-border flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Button size="icon" variant={isPlaying ? "default" : "outline"} onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={speed === 1 ? "secondary" : "ghost"} onClick={() => setSpeed(1)}>1x</Button>
              <Button size="sm" variant={speed === 2 ? "secondary" : "ghost"} onClick={() => setSpeed(2)}>2x</Button>
              <Button size="sm" variant={speed === 5 ? "secondary" : "ghost"} onClick={() => setSpeed(5)}>5x</Button>
              <Button size="sm" variant={speed === 10 ? "secondary" : "ghost"} onClick={() => setSpeed(10)}>10x</Button>
            </div>
            <div className="flex-1 px-4">
              <Slider 
                value={[progress]} 
                max={100} 
                step={0.1} 
                onValueChange={(val) => setIndex(Math.floor((val[0] / 100) * (validPoints.length - 1)))} 
              />
            </div>
            <div className="font-mono text-sm tracking-wider text-cyan-400">{currentPoint.lclTime.split(' ')[1]}</div>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InstrumentBox label="ALT" value={currentPoint.altGps?.toFixed(0)} unit="FT" />
          <InstrumentBox label="IAS" value={currentPoint.ias?.toFixed(0)} unit="KT" />
          <InstrumentBox label="HDG" value={currentPoint.hdg?.toFixed(0)} unit="DEG" />
          <InstrumentBox label="VSPD" value={currentPoint.vspd?.toFixed(0)} unit="FPM" />
          <InstrumentBox label="RPM" value={currentPoint.e1Rpm?.toFixed(0)} unit="RPM" />
          <InstrumentBox label="MAP" value={currentPoint.e1Map?.toFixed(1)} unit="IN" />
          <InstrumentBox label="CHT MAX" value={chtMax > 0 ? chtMax.toFixed(0) : '--'} unit="°F" alert={chtMax > 400} />
          <InstrumentBox label="OAT" value={currentPoint.oat?.toFixed(1)} unit="°C" />
        </div>
      </div>
    </div>
  );
}

function InstrumentBox({ label, value, unit, alert = false }: { label: string, value: any, unit: string, alert?: boolean }) {
  return (
    <div className={`bg-card p-5 rounded-md border ${alert ? 'border-destructive bg-destructive/10' : 'border-border'} flex flex-col justify-center`}>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-3xl font-mono font-bold tracking-tight ${alert ? 'text-destructive' : 'text-foreground'}`}>{value ?? '--'}</span>
        <span className="text-xs font-mono text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
