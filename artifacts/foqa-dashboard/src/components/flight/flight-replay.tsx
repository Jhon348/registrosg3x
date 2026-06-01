import { useState, useEffect, useRef } from "react";
import { FlightPoint } from "@workspace/api-client-react";
import { Play, Pause, SkipBack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import L from "leaflet";

interface Props {
  points: FlightPoint[];
}

export function FlightReplay({ points }: Props) {
  const validPoints = points.filter(
    (p) => p.lat != null && p.lon != null
  ) as (FlightPoint & { lat: number; lon: number })[];

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const outerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const traceRef = useRef<L.Polyline | null>(null);

  // Playback timer
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

  // Initialize map only when container has real dimensions (tab is visible)
  useEffect(() => {
    if (!outerRef.current || validPoints.length === 0) return;

    const positions: [number, number][] = validPoints.map((p) => [p.lat, p.lon]);

    function initMap(container: HTMLDivElement) {
      if (mapRef.current) return; // already initialized

      container.innerHTML = "";
      const inner = document.createElement("div");
      inner.style.cssText = "height:100%;width:100%;";
      container.appendChild(inner);

      const map = L.map(inner).setView(positions[0], 11);
      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

      L.polyline(positions, { color: "#1e3a5f", weight: 2, opacity: 0.5 }).addTo(map);
      traceRef.current = L.polyline([positions[0]], { color: "#0ea5e9", weight: 3 }).addTo(map);

      const planeIcon = L.divIcon({
        html: '<div style="width:12px;height:12px;border-radius:50%;background:#0ea5e9;border:2px solid #fff;box-shadow:0 0 6px #0ea5e9;"></div>',
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      markerRef.current = L.marker(positions[0], { icon: planeIcon }).addTo(map);

      map.invalidateSize();
      map.fitBounds(L.latLngBounds(positions), { padding: [20, 20] });
      setIndex(0);
    }

    const el = outerRef.current;

    // If already visible (non-zero size), init immediately
    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      initMap(el);
      return () => {
        mapRef.current?.off();
        mapRef.current?.remove();
        mapRef.current = null;
        markerRef.current = null;
        traceRef.current = null;
      };
    }

    // Otherwise wait for the tab to become visible
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) {
        ro.disconnect();
        initMap(el);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      mapRef.current?.off();
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      traceRef.current = null;
    };
  }, [validPoints.length]);

  // Update marker + trace on every index change
  useEffect(() => {
    if (!mapRef.current || validPoints.length === 0) return;
    const pos: [number, number] = [validPoints[index].lat, validPoints[index].lon];
    markerRef.current?.setLatLng(pos);
    const tracePath = validPoints
      .slice(0, index + 1)
      .map((p): [number, number] => [p.lat, p.lon]);
    traceRef.current?.setLatLngs(tracePath);
  }, [index, validPoints]);

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

  const chtMax = Math.max(
    currentPoint.e1Cht1 ?? 0,
    currentPoint.e1Cht2 ?? 0,
    currentPoint.e1Cht3 ?? 0,
    currentPoint.e1Cht4 ?? 0,
    currentPoint.e1Cht5 ?? 0,
    currentPoint.e1Cht6 ?? 0
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div
          ref={outerRef}
          className="h-[450px] w-full rounded-md overflow-hidden border border-border"
        />

        <div className="bg-card p-4 rounded-md border border-border">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="icon"
              variant="outline"
              onClick={() => { setIndex(0); setIsPlaying(false); }}
              title="Reset"
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
