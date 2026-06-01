import { useEffect, useRef } from "react";
import L from "leaflet";
import { FlightPoint } from "@workspace/api-client-react";

interface FlightMapProps {
  points: FlightPoint[];
}

export function FlightMap({ points }: FlightMapProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const validPoints = points.filter(
    (p) => p.lat != null && p.lon != null
  ) as (FlightPoint & { lat: number; lon: number })[];

  useEffect(() => {
    if (!outerRef.current || validPoints.length === 0) return;

    // Destroy previous instance cleanly without touching outerRef
    if (mapRef.current) {
      mapRef.current.off();
      mapRef.current.remove();
      mapRef.current = null;
    }
    // Clear any leftover children Leaflet may have injected
    outerRef.current.innerHTML = "";

    // Leaflet manages its own inner div so map.remove() never detaches outerRef
    const inner = document.createElement("div");
    inner.style.cssText = "height:100%;width:100%;";
    outerRef.current.appendChild(inner);

    const positions: [number, number][] = validPoints.map((p) => [p.lat, p.lon]);

    const center = positions[0];
    const map = L.map(inner, { zoomControl: true }).setView(center, 11);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.polyline(positions, { color: "#0ea5e9", weight: 3 }).addTo(map);

    const dotIcon = (color: string) =>
      L.divIcon({
        html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #fff;"></div>`,
        className: "",
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

    L.marker(positions[0], { icon: dotIcon("#22c55e") }).addTo(map);
    L.marker(positions[positions.length - 1], { icon: dotIcon("#ef4444") }).addTo(map);

    // Force Leaflet to recalculate container size, then fit bounds
    map.invalidateSize();
    map.fitBounds(L.latLngBounds(positions), { padding: [30, 30] });

    return () => {
      // Remove all layers first to abort in-flight tile requests
      map.eachLayer((layer) => map.removeLayer(layer));
      map.off();
      map.remove();
      mapRef.current = null;
    };
  }, [validPoints.length]);

  if (validPoints.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-card text-muted-foreground border border-border rounded-md font-mono text-sm uppercase">
        No GPS data available
      </div>
    );
  }

  return (
    <div
      ref={outerRef}
      className="h-[500px] w-full rounded-md overflow-hidden border border-border"
    />
  );
}
