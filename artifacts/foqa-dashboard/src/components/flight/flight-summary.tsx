import { useMemo } from "react";
import { FlightPoint } from "@workspace/api-client-react";

interface Props { points: FlightPoint[]; loading?: boolean }

function safeMin(vals: (number | null | undefined)[], minVal = 0) {
  const filtered = vals.filter((v): v is number => v != null && v > minVal);
  return filtered.length ? Math.min(...filtered) : null;
}
function safeMax(vals: (number | null | undefined)[]) {
  const filtered = vals.filter((v): v is number => v != null && isFinite(v));
  return filtered.length ? Math.max(...filtered) : null;
}

function computeStats(pts: FlightPoint[]) {
  if (!pts.length) return null;

  // Per-cylinder max — explicit fields to keep TS happy
  const chtMax: (number | null)[] = [
    safeMax(pts.map(p => p.e1Cht1)),
    safeMax(pts.map(p => p.e1Cht2)),
    safeMax(pts.map(p => p.e1Cht3)),
    safeMax(pts.map(p => p.e1Cht4)),
    safeMax(pts.map(p => p.e1Cht5)),
    safeMax(pts.map(p => p.e1Cht6)),
  ];
  const egtMax: (number | null)[] = [
    safeMax(pts.map(p => p.e1Egt1)),
    safeMax(pts.map(p => p.e1Egt2)),
    safeMax(pts.map(p => p.e1Egt3)),
    safeMax(pts.map(p => p.e1Egt4)),
    safeMax(pts.map(p => p.e1Egt5)),
    safeMax(pts.map(p => p.e1Egt6)),
  ];

  const validCht = chtMax.filter((v): v is number => v !== null);
  const validEgt = egtMax.filter((v): v is number => v !== null);
  const deltaChT = validCht.length >= 2 ? Math.max(...validCht) - Math.min(...validCht) : null;
  const egtSpread = validEgt.length >= 2 ? Math.max(...validEgt) - Math.min(...validEgt) : null;
  let hotCylIdx = 0;
  for (let i = 1; i < chtMax.length; i++) {
    if ((chtMax[i] ?? 0) > (chtMax[hotCylIdx] ?? 0)) hotCylIdx = i;
  }

  return {
    // Rendimiento
    altMax: safeMax(pts.map(p => p.altGps)),
    iasMax: safeMax(pts.map(p => p.ias)),
    rpmMax: safeMax(pts.map(p => p.e1Rpm)),
    mapMax: safeMax(pts.map(p => p.e1Map)),
    mapMin: safeMin(pts.map(p => p.e1Map), 1),
    oatMin: safeMin(pts.map(p => p.oat), -100),
    oatMax: safeMax(pts.map(p => p.oat)),
    // Motor & eléctrico
    oilTMax: safeMax(pts.map(p => p.e1OilT)),
    oilPMin: safeMin(pts.map(p => p.e1OilP), 0),
    oilPMax: safeMax(pts.map(p => p.e1OilP)),
    voltsMin: safeMin(pts.map(p => p.volts1), 0),
    ampsMax: safeMax(pts.map(p => p.amps1)),
    ffMin: safeMin(pts.map(p => p.e1Fflow), 0),
    // Combustible
    ffMax: safeMax(pts.map(p => p.e1Fflow)),
    fqty1Min: safeMin(pts.map(p => p.fqty1), -1),
    fqty2Min: safeMin(pts.map(p => p.fqty2), -1),
    fqtyAcroMin: safeMin(pts.map(p => p.fqtyAcro), -1),
    // Cilindros
    chtMax, egtMax, deltaChT, egtSpread,
    hotCyl: hotCylIdx + 1,
    hotChtVal: chtMax[hotCylIdx],
  };
}

function Row({ label, value, unit, alert = false }: {
  label: string; value: string | null; unit?: string; alert?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs font-mono text-muted-foreground">{label}</span>
      <span className={`text-sm font-mono font-bold ${alert ? "text-destructive" : "text-foreground"}`}>
        {value ?? "--"}{unit ? <span className="text-[10px] font-normal text-muted-foreground ml-1">{unit}</span> : null}
      </span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-md p-4 flex flex-col gap-0">
      <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 border-b border-primary/20 pb-2">{title}</h4>
      {children}
    </div>
  );
}

export function FlightSummary({ points, loading }: Props) {
  const stats = useMemo(() => computeStats(points), [points]);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => (
          <div key={i} className="bg-card border border-border rounded-md p-4 h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  const f = (v: number | null, dec = 0) => v !== null ? v.toFixed(dec) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" translate="no">

      {/* ── Rendimiento de Vuelo ── */}
      <SectionCard title="Rendimiento de Vuelo">
        <Row label="ALT MÁX" value={f(stats.altMax)} unit="ft" />
        <Row label="IAS MÁX" value={f(stats.iasMax)} unit="kt" />
        <Row label="RPM MÁX" value={f(stats.rpmMax)} unit="RPM" />
        <Row label="MAP MÁX" value={f(stats.mapMax, 1)} unit="inHg" />
        <Row label="MAP MÍN" value={f(stats.mapMin, 1)} unit="inHg" />
        <Row label="OAT MÍN / MÁX"
          value={stats.oatMin !== null && stats.oatMax !== null
            ? `${f(stats.oatMin)} / ${f(stats.oatMax)}`
            : null}
          unit="°C" />
      </SectionCard>

      {/* ── Motor — Aceite & Eléctrico ── */}
      <SectionCard title="Motor — Aceite & Eléctrico">
        <Row label="Temp. Aceite Máx"
          value={f(stats.oilTMax, 1)} unit="°F"
          alert={(stats.oilTMax ?? 0) > 245} />
        <Row label="Presión Aceite Mín"
          value={f(stats.oilPMin)} unit="psi"
          alert={(stats.oilPMin ?? 999) < 25} />
        <Row label="Presión Aceite Máx"
          value={f(stats.oilPMax)} unit="psi"
          alert={(stats.oilPMax ?? 0) > 115} />
        <Row label="Voltios Mínimos"
          value={f(stats.voltsMin, 1)} unit="V"
          alert={(stats.voltsMin ?? 99) < 12.4} />
        <Row label="Amperios Máx"
          value={f(stats.ampsMax, 1)} unit="A" />
        <Row label="Flujo Comb. Mínimo"
          value={f(stats.ffMin, 1)} unit="gal/h" />
      </SectionCard>

      {/* ── Combustible ── */}
      <SectionCard title="Combustible">
        <Row label="Flujo Comb. Máximo"
          value={f(stats.ffMax, 1)} unit="gal/h" />
        <Row label="Flujo Comb. Mínimo"
          value={f(stats.ffMin, 1)} unit="gal/h" />
        <Row label="Wing L Tank Min"
          value={f(stats.fqty1Min, 1)} unit="gal"
          alert={(stats.fqty1Min ?? 99) < 7} />
        <Row label="Wing R Tank Min"
          value={f(stats.fqty2Min, 1)} unit="gal"
          alert={(stats.fqty2Min ?? 99) < 7} />
        {stats.fqtyAcroMin !== null && (
          <Row label="Acro Tank Min"
            value={f(stats.fqtyAcroMin, 1)} unit="gal"
            alert={(stats.fqtyAcroMin ?? 99) < 1} />
        )}
      </SectionCard>

      {/* ── Cilindros ── */}
      <SectionCard title="Cilindros">
        {/* Per-cyl table */}
        <div className="grid text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1"
          style={{ gridTemplateColumns: "28px 1fr 1fr" }}>
          <span>CYL</span><span className="text-right">CHT °F</span><span className="text-right">EGT °F</span>
        </div>
        {[0,1,2,3,4,5].map(i => {
          const cht = stats.chtMax[i];
          const egt = stats.egtMax[i];
          const isHot = (i + 1) === stats.hotCyl;
          return (
            <div key={i} className="grid py-0.5 border-b border-border/30 last:border-0"
              style={{ gridTemplateColumns: "28px 1fr 1fr" }}>
              <span className={`text-xs font-mono ${isHot ? "text-amber-400 font-bold" : "text-muted-foreground"}`}>{i+1}</span>
              <span className={`text-xs font-mono text-right ${(cht ?? 0) > 465 ? "text-destructive" : isHot ? "text-amber-400" : "text-foreground"}`}>
                {cht !== null ? cht.toFixed(0) : "--"}
              </span>
              <span className={`text-xs font-mono text-right ${(egt ?? 0) > 1550 ? "text-destructive" : "text-foreground"}`}>
                {egt !== null ? egt.toFixed(0) : "--"}
              </span>
            </div>
          );
        })}
        <div className="mt-2 space-y-1">
          {stats.deltaChT !== null && (
            <div className="text-xs font-mono text-muted-foreground">ΔCHT: <span className="text-foreground font-bold">{stats.deltaChT.toFixed(1)} °F</span></div>
          )}
          {stats.egtSpread !== null && (
            <div className="text-xs font-mono text-muted-foreground">Dispersión EGT: <span className="text-foreground font-bold">{stats.egtSpread.toFixed(1)} °F</span></div>
          )}
          {stats.hotChtVal !== null && (
            <div className="text-xs font-mono text-amber-400">Cilindro caliente: N.° {stats.hotCyl} ({stats.hotChtVal.toFixed(0)} °F)</div>
          )}
        </div>
      </SectionCard>

    </div>
  );
}
