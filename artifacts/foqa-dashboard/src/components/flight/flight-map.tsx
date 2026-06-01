import { Map, Marker } from "pigeon-maps";
import { FlightPoint } from "@workspace/api-client-react";

interface FlightMapProps {
  points: FlightPoint[];
}

function osm(x: number, y: number, z: number) {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

export function FlightMap({ points }: FlightMapProps) {
  const validPoints = points.filter(
    (p) => p.lat != null && p.lon != null
  ) as (FlightPoint & { lat: number; lon: number })[];

  if (validPoints.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-card text-muted-foreground border border-border rounded-md font-mono text-sm uppercase">
        No GPS data available
      </div>
    );
  }

  const lats = validPoints.map((p) => p.lat);
  const lons = validPoints.map((p) => p.lon);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;

  // Rough zoom from bounding box
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lonSpan = Math.max(...lons) - Math.min(...lons);
  const span = Math.max(latSpan, lonSpan);
  const zoom = span < 0.05 ? 13 : span < 0.2 ? 11 : span < 1 ? 9 : 7;

  return (
    <div className="h-[500px] w-full rounded-md overflow-hidden border border-border">
      <Map
        provider={osm}
        center={[centerLat, centerLon]}
        zoom={zoom}
        attribution={false}
      >
        {/* Flight path as SVG overlay */}
        <FlightPath points={validPoints} />
        {/* Start marker */}
        <Marker anchor={[validPoints[0].lat, validPoints[0].lon]} width={14}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#22c55e",
              border: "2px solid #fff",
            }}
          />
        </Marker>
        {/* End marker */}
        <Marker
          anchor={[
            validPoints[validPoints.length - 1].lat,
            validPoints[validPoints.length - 1].lon,
          ]}
          width={14}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ef4444",
              border: "2px solid #fff",
            }}
          />
        </Marker>
      </Map>
    </div>
  );
}

function FlightPath({
  points,
  mapState,
  latLngToPixel,
}: {
  points: { lat: number; lon: number }[];
  mapState?: any;
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
      <path d={d} stroke="#0ea5e9" strokeWidth={2.5} fill="none" />
    </svg>
  );
}
