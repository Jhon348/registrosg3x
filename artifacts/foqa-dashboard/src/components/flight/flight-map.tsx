import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FlightPoint } from "@workspace/api-client-react";

// Fix for default marker icons in Leaflet with Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FlightMapProps {
  points: FlightPoint[];
}

export function FlightMap({ points }: FlightMapProps) {
  const validPoints = points.filter(p => p.lat != null && p.lon != null) as (FlightPoint & { lat: number, lon: number })[];
  
  if (validPoints.length === 0) {
    return <div className="h-[500px] flex items-center justify-center bg-card text-muted-foreground border border-border rounded-md font-mono text-sm uppercase">No GPS data available</div>;
  }

  const positions: [number, number][] = validPoints.map(p => [p.lat, p.lon]);
  const center = positions[0];

  return (
    <div className="h-[500px] w-full rounded-md overflow-hidden border border-border">
      <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={positions} color="#0ea5e9" weight={3} />
        <Marker position={positions[0]} />
        <Marker position={positions[positions.length - 1]} />
      </MapContainer>
    </div>
  );
}
