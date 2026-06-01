import { useState, useEffect } from "react";
import { Map, Marker } from "pigeon-maps";
import { FlightPoint } from "@workspace/api-client-react";
import { Play, Pause, SkipBack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Props {
  points: FlightPoint[];
}

function osm(x: number, y: number, z: number) {
  return `https://basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
}

export function FlightReplay({ points }: Props) {
  const validPoints = points.filter(
    (p) => p.lat != null && p.lon != null
  ) as (FlightPoint & { lat: number; lon: number })[];

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setIndex((i) => {
        if (i >= validPoints.length - 1) {
          setIsPlaying(false);
          return i;
        }
        return Math.min(i + Math.max(1, Math.floor(speed)), validPoints.length - 1);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, speed, validPoints.length]);

  if (validPoints.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-card text-muted-foreground border border-border rounded-md font-mono text-sm uppercase">
        No GPS data for replay
      </div>
    );
  }

  const currentPoint = validPoints[index];
  const progress =
    validPoints.length > 1 ? (index / (validPoints.length - 1)) * 100 : 0;

  const lats = validPoints.map((p) => p.lat);
  const lons = validPoints.map((p) => p.lon);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const span = Math.max(
    Math.max(...lats) - Math.min(...lats),
    Math.max(...lons) - Math.min(...lons)
  );
  const zoom = span < 0.05 ? 13 : span < 0.2 ? 11 : span < 1 ? 9 : 7;

  const chtMax = Math.max(
    currentPoint.e1Cht1 ?? 0,
    currentPoint.e1Cht2 ?? 0,
    currentPoint.e1Cht3 ?? 0,
    currentPoint.e1Cht4 ?? 0,
    currentPoint.e1Cht5 ?? 0,
    currentPoint.e1Cht6 ?? 0
  );

  const tracePoints = validPoints.slice(0, index + 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="h-[450px] w-full rounded-md overflow-hidden border border-border">
          <Map
            provider={osm}
            center={[centerLat, centerLon]}
            zoom={zoom}
            attribution={false}
          >
            {/* Ghost full path */}
            <ReplayPath points={validPoints} color="#1e3a5f" opacity={0.5} />
            {/* Active trace */}
            <ReplayPath points={tracePoints} color="#0ea5e9" opacity={1} />
            {/* Current position */}
            <Marker
              anchor={[currentPoint.lat, currentPoint.lon]}
              width={16}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#0ea5e9",
                  border: "2px solid #fff",
                  boxShadow: "0 0 6px #0ea5e9",
                }}
              />
            </Marker>
          </Map>
        </div>

        <div className="bg-card p-4 rounded-md border border-border">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                setIndex(0);
                setIsPlaying(false);
              }}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={isPlaying ? "default" : "outline"}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-1">
              {[1, 2, 5, 10].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={speed === s ? "secondary" : "ghost"}
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </Button>
              ))}
            </div>
            <div className="flex-1 min-w-[100px]">
              <Slider
                value={[progress]}
                max={100}
                step={0.1}
                onValueChange={(val) =>
                  setIndex(
                    Math.floor((val[0] / 100) * (validPoints.length - 1))
                  )
                }
              />
            </div>
            <div className="font-mono text-sm tracking-wider text-cyan-400">
              {currentPoint.lclTime?.split(" ")[1] ?? "--"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 content-start">
        <InstrumentBox label="ALT" value={currentPoint.altGps?.toFixed(0)} unit="FT" />
        <InstrumentBox label="IAS" value={currentPoint.ias?.toFixed(0)} unit="KT" />
        <InstrumentBox label="HDG" value={currentPoint.hdg?.toFixed(0)} unit="DEG" />
        <InstrumentBox label="VSPD" value={currentPoint.vspd?.toFixed(0)} unit="FPM" />
        <InstrumentBox label="RPM" value={currentPoint.e1Rpm?.toFixed(0)} unit="RPM" />
        <InstrumentBox label="MAP" value={currentPoint.e1Map?.toFixed(1)} unit="IN" />
        <InstrumentBox
          label="CHT MAX"
          value={chtMax > 0 ? chtMax.toFixed(0) : "--"}
          unit="°F"
          alert={chtMax > 400}
        />
        <InstrumentBox label="OAT" value={currentPoint.oat?.toFixed(1)} unit="°C" />
      </div>
    </div>
  );
}

function ReplayPath({
  points,
  color,
  opacity,
  latLngToPixel,
}: {
  points: { lat: number; lon: number }[];
  color: string;
  opacity: number;
  latLngToPixel?: (ll: [number, number]) => [number, number];
}) {
  if (!latLngToPixel || points.length < 2) return null;

  const coords = points.map((p) => latLngToPixel([p.lat, p.lon]));
  const d = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c[0].toFixed(1)},${c[1].toFixed(1)}`)
    .join(" ");

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <path d={d} stroke={color} strokeWidth={2.5} fill="none" opacity={opacity} />
    </svg>
  );
}

function InstrumentBox({
  label,
  value,
  unit,
  alert = false,
}: {
  label: string;
  value: any;
  unit: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-card p-4 rounded-md border flex flex-col justify-center ${
        alert ? "border-destructive bg-destructive/10" : "border-border"
      }`}
    >
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {label}
      </span>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`text-2xl font-mono font-bold tracking-tight ${
            alert ? "text-destructive" : "text-foreground"
          }`}
        >
          {value ?? "--"}
        </span>
        <span className="text-xs font-mono text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
