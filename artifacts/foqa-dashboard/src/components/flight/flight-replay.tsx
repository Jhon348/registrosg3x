import { useState, useEffect, useMemo } from "react";
import { FlightPoint } from "@workspace/api-client-react";
import { Slider } from "@/components/ui/slider";

// ── Types ───────────────────────────────────────────────────────────────
interface Props { points: FlightPoint[] }
interface Anomaly { key: string; time: string; label: string; value: string; severity: "warn" | "crit" }
interface CASEvent { message: string; firstTime: string; count: number }

// ── Thresholds — exact from aircraft POH ────────────────────────────────
const THR = {
  // Oil Temperature (°F): green 100-245, red outside
  oilTColdCrit: 100, oilTHotCrit: 245,
  // Oil Pressure (PSI): red <25, yellow 25-55 & 95-115, green 55-95, red >115
  oilPRedLo: 25, oilPYellowLo: 55, oilPGreenHi: 95, oilPYellowHi: 115, oilPRedHi: 115,
  // RPM: green 700-2600, red above 2600
  rpmCrit: 2600,
  // IAS (kt) — Vno / Vne (not in POH table, kept from prior)
  iasWarn: 145, iasCrit: 165,
  // Volts: green 12.4-15.5, yellow below 12.4 OR above 15.5 — no red
  voltLowWarn: 12.4, voltHighWarn: 15.5,
  // CHT (°F): yellow 100-200, green 200-465, red above 465
  chtWarnLo: 100, chtWarnHi: 200, chtCrit: 465,
  // EGT (°F): green 1100-1550, red above 1550
  egtGreenLo: 1100, egtCrit: 1550,
  // MAP ("Hg): green 11-32 only — no yellow, no red in POH
  mapGreenLo: 11, mapGreenHi: 32,
  // Amps: green 1-60, yellow below 0
  ampsWarn: 0,
};

// ── Analysis ────────────────────────────────────────────────────────────
function analyze(pts: FlightPoint[]) {
  const anomalies: Anomaly[] = [];
  const casMap = new Map<string, CASEvent>();
  const triggered: Record<string, boolean> = {};

  for (const p of pts) {
    const t = p.lclTime?.split(" ")[1] ?? "--:--";

    if (p.alerts) {
      for (const raw of p.alerts.split("/")) {
        const msg = raw.trim();
        if (!msg) continue;
        const existing = casMap.get(msg);
        if (existing) existing.count++;
        else casMap.set(msg, { message: msg, firstTime: t, count: 1 });
      }
    }

    const cht = Math.max(p.e1Cht1 ?? 0, p.e1Cht2 ?? 0, p.e1Cht3 ?? 0, p.e1Cht4 ?? 0, p.e1Cht5 ?? 0, p.e1Cht6 ?? 0);
    const egt = Math.max(p.e1Egt1 ?? 0, p.e1Egt2 ?? 0, p.e1Egt3 ?? 0, p.e1Egt4 ?? 0, p.e1Egt5 ?? 0, p.e1Egt6 ?? 0);
    const oilT = p.e1OilT ?? 0;
    const oilP = p.e1OilP ?? 999;
    const map = p.e1Map ?? 0;

    const checks: [string, boolean, string, string, "warn" | "crit"][] = [
      // Oil Temperature
      ["oilTHot",  oilT > THR.oilTHotCrit,                          "OVERTEMP ACEITE",        `${oilT.toFixed(0)}°F`,     "crit"],
      ["oilTCold", oilT > 0 && oilT < THR.oilTColdCrit,             "Aceite Frío",             `${oilT.toFixed(0)}°F`,     "warn"],
      // Oil Pressure
      ["oilPLo",   oilP < THR.oilPRedLo && oilP > 0,                "BAJA PRESIÓN ACEITE",    `${oilP.toFixed(0)} PSI`,   "crit"],
      ["oilPLoW",  oilP >= THR.oilPRedLo && oilP < THR.oilPYellowLo,"Presión Aceite Baja",    `${oilP.toFixed(0)} PSI`,   "warn"],
      ["oilPHiW",  oilP > THR.oilPGreenHi && oilP <= THR.oilPYellowHi,"Presión Aceite Alta",  `${oilP.toFixed(0)} PSI`,   "warn"],
      ["oilPHi",   oilP > THR.oilPRedHi,                             "ALTA PRESIÓN ACEITE",   `${oilP.toFixed(0)} PSI`,   "crit"],
      // RPM
      ["rpmCrit",  (p.e1Rpm ?? 0) > THR.rpmCrit,                    "SOBRERREVOLUCIÓN",       `${p.e1Rpm?.toFixed(0)} RPM`, "crit"],
      // IAS
      ["iasCrit",  (p.ias ?? 0) > THR.iasCrit,                      "EXCESO VEL (Vne)",       `${p.ias?.toFixed(0)} kt`,  "crit"],
      ["iasWarn",  (p.ias ?? 0) > THR.iasWarn,                      "Velocidad > Vno",        `${p.ias?.toFixed(0)} kt`,  "warn"],
      // Volts (yellow only: below 12.4 or above 15.5 — no red per POH)
      ["voltHi",   (p.volts1 ?? 0) > THR.voltHighWarn && (p.volts1 ?? 0) > 0,              "Voltaje Alto",  `${p.volts1?.toFixed(1)} V`, "warn"],
      ["voltLow",  (p.volts1 ?? 99) < THR.voltLowWarn && (p.volts1 ?? 99) > 0, "Voltaje Bajo", `${p.volts1?.toFixed(1)} V`, "warn"],
      // CHT
      ["chtCrit",  cht > THR.chtCrit,                                "OVERTEMP CULATA",        `${cht.toFixed(0)}°F`,      "crit"],
      ["chtWarn",  cht > 0 && cht < THR.chtWarnHi,                   "CHT Fría",               `${cht.toFixed(0)}°F`,      "warn"],
      // EGT
      ["egtCrit",  egt > THR.egtCrit,                                "OVERTEMP EGT",           `${egt.toFixed(0)}°F`,      "crit"],
      // MAP — no limit in POH, no anomaly check needed
    ];

    for (const [key, active, label, value, severity] of checks) {
      if (active && !triggered[key]) {
        anomalies.push({ key, time: t, label, value, severity });
      }
      triggered[key] = active;
    }
  }

  return { anomalies, casEvents: Array.from(casMap.values()) };
}

// ── Attitude Indicator ──────────────────────────────────────────────────
function AttitudeIndicator({ pitch, roll }: { pitch: number; roll: number }) {
  const cx = 100, cy = 100, r = 97;
  const PPD = 4.2; // pixels per degree

  return (
    <svg width={200} height={200} viewBox="0 0 200 200" style={{ display: "block" }}>
      <defs>
        <clipPath id="ai-clip"><circle cx={cx} cy={cy} r={r} /></clipPath>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d3d6b" />
          <stop offset="100%" stopColor="#1a72c4" />
        </linearGradient>
        <linearGradient id="gnd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c3510" />
          <stop offset="100%" stopColor="#2e1a06" />
        </linearGradient>
      </defs>

      <g clipPath="url(#ai-clip)">
        {/* Rotated+pitched world */}
        <g transform={`rotate(${-roll}, ${cx}, ${cy})`}>
          <g transform={`translate(0, ${pitch * PPD})`}>
            <rect x={-200} y={-500} width={600} height={600 + cy} fill="url(#sky)" />
            <rect x={-200} y={cy} width={600} height={600} fill="url(#gnd)" />
            <line x1={-200} y1={cy} x2={400} y2={cy} stroke="white" strokeWidth={1.5} />
            {/* Pitch ladder */}
            {[-30, -20, -15, -10, -5, 5, 10, 15, 20, 30].map(d => {
              const y = cy - d * PPD;
              const w = Math.abs(d) % 10 === 0 ? 32 : 22;
              return (
                <g key={d}>
                  <line x1={cx - w} y1={y} x2={cx + w} y2={y} stroke="white" strokeWidth={1} opacity={0.75} />
                  {Math.abs(d) % 10 === 0 && (
                    <>
                      <text x={cx - w - 4} y={y + 4} fill="white" fontSize={8} textAnchor="end" fontFamily="monospace">{Math.abs(d)}</text>
                      <text x={cx + w + 4} y={y + 4} fill="white" fontSize={8} textAnchor="start" fontFamily="monospace">{Math.abs(d)}</text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
          {/* Roll tick at top */}
          <line x1={cx} y1={cy - r + 2} x2={cx} y2={cy - r + 12} stroke="white" strokeWidth={1.5} />
        </g>
      </g>

      {/* Bezel */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#152840" strokeWidth={3} />

      {/* Roll scale ticks */}
      {[-60, -45, -30, -20, -10, 10, 20, 30, 45, 60].map(d => {
        const a = (d - 90) * Math.PI / 180;
        return (
          <line key={d}
            x1={cx + (r - 12) * Math.cos(a)} y1={cy + (r - 12) * Math.sin(a)}
            x2={cx + (r - 4) * Math.cos(a)} y2={cy + (r - 4) * Math.sin(a)}
            stroke="white" strokeWidth={1} opacity={0.6}
          />
        );
      })}

      {/* Roll pointer triangle */}
      <g transform={`rotate(${-roll}, ${cx}, ${cy})`}>
        <polygon points={`${cx},${cy - r + 18} ${cx - 6},${cy - r + 6} ${cx + 6},${cy - r + 6}`} fill="white" />
      </g>

      {/* Fixed aircraft symbol */}
      <line x1={cx - 42} y1={cy} x2={cx - 12} y2={cy} stroke="#f5c518" strokeWidth={3} strokeLinecap="round" />
      <line x1={cx + 12} y1={cy} x2={cx + 42} y2={cy} stroke="#f5c518" strokeWidth={3} strokeLinecap="round" />
      <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="#f5c518" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={3.5} fill="#f5c518" />
    </svg>
  );
}

// ── Vertical Tape ───────────────────────────────────────────────────────
// IMPORTANT: uses a FIXED-SIZE array (NUM_TICKS slots) with stable integer keys 0..N-1
// so React never inserts/removes DOM nodes during animation — only content updates.
// Variable-length arrays with value-based keys cause insertBefore crashes in React 19.
const NUM_TICKS = 24;

function VTape({ value, step, label, unit, color, width = 60, height = 200 }: {
  value: number; step: number; label: string; unit: string; color: string; width?: number; height?: number;
}) {
  const PX = height / (step * 12); // pixels per unit value
  // Snap base to nearest step so ticks stay centered as value scrolls
  const base = Math.round(value / step) * step;
  const half = Math.floor(NUM_TICKS / 2);

  // py: y-position of a given value (higher = up)
  const py = (v: number) => height / 2 - (v - value) * PX;

  return (
    <div style={{ width, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ color: "#6090c0", fontSize: 9, fontFamily: "monospace", marginBottom: 2 }}>{label}</div>
      <div style={{ position: "relative", width, height, background: "#07101f", border: "1px solid #1e3d5a", overflow: "hidden", borderRadius: 2 }}>
        {/* Fixed NUM_TICKS slots — keys are always 0..N-1, never inserted/removed */}
        {Array.from({ length: NUM_TICKS }, (_, i) => {
          const v = base + (i - half) * step;
          const y = py(v);
          const visible = v >= 0 && y >= -16 && y <= height + 16;
          return (
            <div key={i} style={{ position: "absolute", top: y - 8, left: 0, right: 0, height: 16, pointerEvents: "none", opacity: visible ? 1 : 0 }}>
              <div style={{ position: "absolute", top: 8, left: 0, width: "35%", height: 1, background: "#1e3d5a" }} />
              <div style={{ position: "absolute", top: 0, right: 3, color: "#8fb0d8", fontFamily: "monospace", fontSize: 9, textAlign: "right", lineHeight: "16px" }}>{v}</div>
            </div>
          );
        })}
        {/* Center bug — always present, just updates text */}
        <div style={{
          position: "absolute", top: height / 2 - 13, left: 0, right: 0, height: 26,
          background: "#050e1e", border: `2px solid ${color}`,
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3
        }}>
          <span style={{ color, fontSize: 14, fontWeight: "bold", fontFamily: "monospace" }}>
            {Math.round(value)}
          </span>
        </div>
        <div style={{ position: "absolute", top: height / 2 - 13, left: 2, fontSize: 10, color: color, opacity: 0.5 }}>▶</div>
      </div>
      <div style={{ color: "#4060a0", fontSize: 8, fontFamily: "monospace", marginTop: 2 }}>{unit}</div>
    </div>
  );
}

// ── VSI Bar ─────────────────────────────────────────────────────────────
function VSIBar({ vspd, height = 200 }: { vspd: number; height?: number }) {
  const MAX = 2000;
  const clamped = Math.max(-MAX, Math.min(MAX, vspd));
  const halfH = (height - 40) / 2;
  const barH = (Math.abs(clamped) / MAX) * halfH;
  const up = clamped >= 0;

  return (
    <div style={{ width: 36, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ color: "#6090c0", fontSize: 8, fontFamily: "monospace", marginBottom: 2 }}>VSI</div>
      <div style={{ position: "relative", width: 36, height, background: "#07101f", border: "1px solid #1e3d5a", overflow: "hidden", borderRadius: 2 }}>
        {/* Center line */}
        <div style={{ position: "absolute", top: height / 2, left: 0, right: 0, height: 1, background: "#2a4060" }} />
        {/* Up bar — always in DOM, height 0 when not climbing (prevents insertBefore on sign change) */}
        <div style={{ position: "absolute", bottom: height / 2, left: 4, right: 4, height: up ? barH : 0, background: "#00c3ff", borderRadius: "2px 2px 0 0", transition: "height 0.15s" }} />
        {/* Down bar — always in DOM, height 0 when not descending */}
        <div style={{ position: "absolute", top: height / 2, left: 4, right: 4, height: up ? 0 : barH, background: "#ff6633", borderRadius: "0 0 2px 2px", transition: "height 0.15s" }} />
        {/* Labels */}
        {[2000, 1000, -1000, -2000].map(v => {
          const y = height / 2 - (v / MAX) * halfH;
          return (
            <div key={v} style={{ position: "absolute", top: y - 5, right: 4, color: "#3a5a7a", fontSize: 7, fontFamily: "monospace" }}>
              {Math.abs(v / 1000)}
            </div>
          );
        })}
      </div>
      <div style={{ color: clamped > 0 ? "#00c3ff" : clamped < 0 ? "#ff6633" : "#4060a0", fontSize: 9, fontFamily: "monospace", marginTop: 2 }}>
        {clamped > 0 ? "+" : ""}{Math.round(clamped)}
      </div>
    </div>
  );
}

// ── Heading Compass ─────────────────────────────────────────────────────
function HSI({ hdg }: { hdg: number }) {
  const cx = 90, cy = 90, r = 84;
  const cards = ["N", "E", "S", "W"];

  return (
    <svg width={180} height={180} viewBox="0 0 180 180">
      <circle cx={cx} cy={cy} r={r} fill="#07101f" stroke="#1e3d5a" strokeWidth={2} />

      <g transform={`rotate(${-hdg}, ${cx}, ${cy})`}>
        {Array.from({ length: 36 }, (_, i) => i * 10).map(d => {
          const a = (d - 90) * Math.PI / 180;
          const isMaj = d % 30 === 0;
          const ri = isMaj ? r - 16 : r - 9;
          return (
            <line key={d}
              x1={cx + ri * Math.cos(a)} y1={cy + ri * Math.sin(a)}
              x2={cx + (r - 3) * Math.cos(a)} y2={cy + (r - 3) * Math.sin(a)}
              stroke={d === 0 ? "#ff5555" : "#3a5a7a"} strokeWidth={isMaj ? 2 : 1}
            />
          );
        })}
        {cards.map((c, i) => {
          const a = (i * 90 - 90) * Math.PI / 180;
          return (
            <text key={c} x={cx + (r - 26) * Math.cos(a)} y={cy + (r - 26) * Math.sin(a) + 4}
              fill={c === "N" ? "#ff5555" : "#a0c0e0"} fontSize={13} fontWeight="bold"
              textAnchor="middle" fontFamily="monospace">{c}</text>
          );
        })}
        {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33].map(n => {
          const a = (n * 10 - 90) * Math.PI / 180;
          return (
            <text key={n} x={cx + (r - 22) * Math.cos(a)} y={cy + (r - 22) * Math.sin(a) + 3}
              fill="#3a5a7a" fontSize={7} textAnchor="middle" fontFamily="monospace">{n}</text>
          );
        })}
      </g>

      {/* Fixed aircraft */}
      <line x1={cx} y1={cy - 22} x2={cx} y2={cy - 10} stroke="#f5c518" strokeWidth={2} />
      <line x1={cx - 18} y1={cy} x2={cx + 18} y2={cy} stroke="#f5c518" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3} fill="#f5c518" />

      {/* North triangle */}
      <polygon points={`${cx},${cy - r + 2} ${cx - 5},${cy - r + 13} ${cx + 5},${cy - r + 13}`} fill="#ff5555" />

      {/* HDG readout */}
      <rect x={cx - 24} y={cy + r - 22} width={48} height={18} rx={2} fill="#050e1e" stroke="#1e3d5a" />
      <text x={cx} y={cy + r - 9} fill="#00c3ff" fontSize={12} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
        {String(Math.round(hdg) % 360).padStart(3, "0")}°
      </text>
    </svg>
  );
}

// ── Arc Gauge ───────────────────────────────────────────────────────────
function ArcGauge({ label, value, min, max, unit, green, yellows, red, dec = 0 }: {
  label: string; value: number; min: number; max: number; unit: string; dec?: number;
  green?: [number, number]; yellows?: [number, number][]; red?: [number, number][];
}) {
  const S = 108, cx = 54, cy = 60, r = 42;
  const A0 = 135, SWEEP = 270;

  const toXY = (pct: number) => {
    const a = (A0 + pct * SWEEP) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
  };

  const arcD = (p1: number, p2: number) => {
    const [x1, y1] = toXY(p1), [x2, y2] = toXY(p2);
    const large = (p2 - p1) * SWEEP > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const norm = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min)));
  const pct = norm(value);
  const [nx, ny] = toXY(pct);

  // Needle color: red if in any red band, yellow if in any yellow band, else green
  const isRed = red?.some(([lo, hi]) => value >= lo && value <= hi);
  const isYellow = !isRed && yellows?.some(([lo, hi]) => value >= lo && value <= hi);
  const vColor = isRed ? "#ff3333" : isYellow ? "#ffaa00" : "#00cc66";

  const bgP1 = toXY(0), bgP2 = toXY(1);

  return (
    <div style={{ textAlign: "center", width: S }}>
      <svg width={S} height={80} viewBox={`0 0 ${S} 80`}>
        {/* Track */}
        <path d={`M ${bgP1[0]} ${bgP1[1]} A ${r} ${r} 0 1 1 ${bgP2[0]} ${bgP2[1]}`} fill="none" stroke="#0f1e30" strokeWidth={7} />
        {/* Green arc */}
        {green && <path d={arcD(norm(green[0]), norm(green[1]))} fill="none" stroke="#00cc66" strokeWidth={6} />}
        {/* Yellow arcs (multiple bands supported) */}
        {yellows?.map(([lo, hi], i) => (
          <path key={i} d={arcD(norm(lo), norm(hi))} fill="none" stroke="#ffaa00" strokeWidth={5} strokeDasharray="4 3" />
        ))}
        {/* Red arcs */}
        {red?.map(([lo, hi], i) => (
          <path key={i} d={arcD(norm(lo), norm(hi))} fill="none" stroke="#ff3333" strokeWidth={6} />
        ))}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={vColor} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={3.5} fill={vColor} />
        <text x={cx} y={cy + 18} fill={vColor} fontSize={13} textAnchor="middle" fontFamily="monospace" fontWeight="bold">
          {value.toFixed(dec)}
        </text>
      </svg>
      <div style={{ color: "#5070a0", fontSize: 9, fontFamily: "monospace", marginTop: -4 }}>
        <span style={{ color: "#8090b0" }}>{label}</span> <span style={{ color: "#3a5060" }}>{unit}</span>
      </div>
    </div>
  );
}

// ── Playback Controls ───────────────────────────────────────────────────
function Controls({ index, total, isPlaying, speed, onToggle, onSeek, onSkip, onSpeed }: {
  index: number; total: number; isPlaying: boolean; speed: number;
  onToggle: () => void; onSeek: (i: number) => void; onSkip: (delta: number) => void;
  onSpeed: (s: number) => void;
}) {
  const progress = total > 1 ? (index / (total - 1)) * 100 : 0;
  const btn = (label: string, onClick: () => void, active = false) => (
    <button onClick={onClick} style={{
      background: active ? "#00c3ff" : "#0d1e30", color: active ? "#000" : "#80b0d0",
      border: `1px solid ${active ? "#00c3ff" : "#1e3d5a"}`, borderRadius: 4,
      fontFamily: "monospace", fontSize: 12, padding: "4px 10px", cursor: "pointer",
    }}>{label}</button>
  );

  return (
    <div style={{ background: "#07101f", borderTop: "1px solid #1e3d5a", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      {btn("|◀", () => { onSeek(0); })}
      {btn("◀◀", () => onSkip(-Math.max(10, speed * 5)))}
      {btn(isPlaying ? "⏸" : "▶", onToggle, isPlaying)}
      {btn("▶▶", () => onSkip(Math.max(10, speed * 5)))}
      <div style={{ width: 1, height: 20, background: "#1e3d5a" }} />
      {[1, 2, 4, 8].map(s => <span key={s}>{btn(`${s}×`, () => onSpeed(s), speed === s)}</span>)}
      <div style={{ flex: 1, minWidth: 100 }}>
        <Slider value={[progress]} max={100} step={0.1}
          onValueChange={([v]) => onSeek(Math.floor((v / 100) * (total - 1)))} />
      </div>
      <span style={{ color: "#4060a0", fontFamily: "monospace", fontSize: 11 }}>
        {index + 1}/{total}
      </span>
    </div>
  );
}

// ── Main Export ─────────────────────────────────────────────────────────
export function FlightReplay({ points }: Props) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const { anomalies, casEvents } = useMemo(() => analyze(points), [points]);

  useEffect(() => {
    if (!isPlaying || points.length === 0) return;
    const id = setInterval(() => {
      setIndex(i => {
        if (i >= points.length - 1) { setIsPlaying(false); return i; }
        return Math.min(i + Math.max(1, speed), points.length - 1);
      });
    }, 100);
    return () => clearInterval(id);
  }, [isPlaying, speed, points.length]);

  if (points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground font-mono text-sm">
        Sin datos de vuelo
      </div>
    );
  }

  const p = points[index] ?? points[0];
  const pitch = p.pitch ?? 0;
  const roll = p.roll ?? 0;
  const hdg = p.hdg ?? 0;
  const ias = p.ias ?? 0;
  const alt = p.altGps ?? p.altP ?? 0;
  const vspd = p.vspd ?? 0;
  const rpm   = p.e1Rpm   ?? 0;
  const map   = p.e1Map   ?? 0;
  const oilP  = p.e1OilP  ?? 0;
  const oilT  = p.e1OilT  ?? 0;
  const fflow = p.e1Fflow ?? 0;
  const volts = p.volts1  ?? 0;
  const amps  = p.amps1   ?? 0;
  const cht   = Math.max(p.e1Cht1 ?? 0, p.e1Cht2 ?? 0, p.e1Cht3 ?? 0, p.e1Cht4 ?? 0, p.e1Cht5 ?? 0, p.e1Cht6 ?? 0);
  const egt   = Math.max(p.e1Egt1 ?? 0, p.e1Egt2 ?? 0, p.e1Egt3 ?? 0, p.e1Egt4 ?? 0, p.e1Egt5 ?? 0, p.e1Egt6 ?? 0);

  const activeCAS = p.alerts
    ? p.alerts.split("/").map(s => s.trim()).filter(Boolean)
    : [];

  const panelBg = { background: "#050e1e" };
  const borderRight = { borderRight: "1px solid #1e3d5a" };
  const borderBottom = { borderBottom: "1px solid #1e3d5a" };
  const sectionLabel = { color: "#2a4a70", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.12em", textTransform: "uppercase" as const, marginBottom: 8 };

  return (
    <div style={{ ...panelBg, borderRadius: 8, border: "1px solid #1e3d5a", overflow: "hidden", fontFamily: "monospace" }}>
      {/* Header bar */}
      <div style={{ background: "#070f1e", ...borderBottom, padding: "6px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#00c3ff", fontSize: 12, fontWeight: "bold", letterSpacing: "0.1em" }}>G3X TOUCH — FLIGHT REPLAY</span>
        <span style={{ color: "#3a5a7a", fontSize: 12 }}>{p.lclTime?.split(" ")[1] ?? "--:--:--"}</span>
      </div>

      {/* Main body: PFD | Engine+Analysis */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 520 }}>

        {/* ── LEFT: PFD ── */}
        <div style={{ ...borderRight, padding: 12 }}>
          <div style={sectionLabel}>PFD</div>

          {/* Tapes + AI row */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "flex-start" }}>
            <VTape value={ias} step={10} label="IAS" unit="KT" height={200}
              color={ias > THR.iasCrit ? "#ff3333" : ias > THR.iasWarn ? "#ffaa00" : "#00c3ff"} />
            <AttitudeIndicator pitch={pitch} roll={roll} />
            <VTape value={alt} step={200} label="ALT" unit="FT" height={200} color="#00cc66" />
            <VSIBar vspd={vspd} height={200} />
          </div>

          {/* HSI */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
            <HSI hdg={hdg} />
          </div>

          {/* Data row */}
          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 8, padding: "6px 0", borderTop: "1px solid #0f2030" }}>
            {[
              { l: "PITCH", v: `${pitch.toFixed(1)}°` },
              { l: "ROLL", v: `${roll.toFixed(1)}°` },
              { l: "TAS", v: p.tas ? `${p.tas.toFixed(0)} kt` : "--" },
              { l: "OAT", v: p.oat != null ? `${p.oat.toFixed(1)}°C` : "--" },
            ].map(({ l, v }) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ color: "#2a4060", fontSize: 8 }}>{l}</div>
                <div style={{ color: "#a0c0e0", fontSize: 13, fontWeight: "bold" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Engine + CAS + Analysis ── */}
        <div style={{ display: "flex", flexDirection: "column" }}>

          {/* Engine gauges — 2 rows × 4, limits from aircraft POH */}
          <div style={{ padding: 12, ...borderBottom }}>
            <div style={sectionLabel}>ENGINE</div>
            {/* Row 1: RPM · MAP · OIL P · OIL T */}
            <div style={{ display: "flex", justifyContent: "center", gap: 2, marginBottom: 4 }}>
              <ArcGauge label="RPM" value={rpm} min={0} max={3000} unit="RPM"
                green={[700, 2600]} red={[[2600, 3000]]} />
              <ArcGauge label="MAP" value={map} min={0} max={40} unit='"Hg'
                green={[11, 32]} dec={1} />
              <ArcGauge label="OIL P" value={oilP} min={0} max={130} unit="PSI"
                green={[55, 95]}
                yellows={[[25, 55], [95, 115]]}
                red={[[0, 25], [115, 130]]} />
              <ArcGauge label="OIL T" value={oilT} min={50} max={300} unit="°F"
                green={[100, 245]}
                red={[[50, 100], [245, 300]]} />
            </div>
            {/* Row 2: CHT max · EGT max · VOLTS · AMPS */}
            <div style={{ display: "flex", justifyContent: "center", gap: 2 }}>
              <ArcGauge label="CHT" value={cht} min={0} max={550} unit="°F"
                yellows={[[100, 200]]}
                green={[200, 465]}
                red={[[465, 550]]} />
              <ArcGauge label="EGT" value={egt} min={800} max={1700} unit="°F"
                green={[1100, 1550]}
                red={[[1550, 1700]]} />
              <ArcGauge label="VOLTS" value={volts} min={10} max={17} unit="V"
                green={[12.4, 15.5]}
                yellows={[[10, 12.4], [15.5, 17]]} dec={1} />
              <ArcGauge label="AMPS" value={amps} min={-10} max={70} unit="A"
                green={[1, 60]}
                yellows={[[-10, 0]]} />
            </div>
          </div>

          {/* CAS + Analysis */}
          <div style={{ padding: 12, flex: 1, overflowY: "auto" }}>

            {/* CAS panel: render ALL flight events (fixed length = casEvents.length, never changes
                during playback). Only "isNowActive" flag changes — no DOM insertions/removals. */}
            <div style={sectionLabel}>MENSAJES CAS</div>
            {casEvents.length === 0 ? (
              <div style={{ color: "#1a4020", fontSize: 10, marginBottom: 10 }}>— Sin mensajes CAS en este vuelo —</div>
            ) : (
              <div style={{ marginBottom: 10, maxHeight: 200, overflowY: "auto" }}>
                {casEvents.map((ev) => {
                  const isNowActive = activeCAS.includes(ev.message);
                  return (
                    <div key={ev.message} style={{
                      background: isNowActive ? "#2a0f00" : "#0a1018",
                      border: `1px solid ${isNowActive ? "#993300" : "#0f2030"}`,
                      borderRadius: 3, padding: "4px 8px", marginBottom: 2,
                      display: "flex", alignItems: "center", gap: 8,
                      opacity: isNowActive ? 1 : 0.45,
                    }}>
                      <span style={{ fontSize: 11, flexShrink: 0, width: 14 }}>
                        {isNowActive ? "⚠" : "·"}
                      </span>
                      <span style={{ color: isNowActive ? "#ffaa44" : "#5a7090", fontSize: 10, flex: 1 }}>{ev.message}</span>
                      <span style={{ color: "#3a4a60", fontSize: 9, flexShrink: 0 }}>{ev.firstTime} ×{ev.count}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Smart analysis — fixed length (anomalies from useMemo, never changes during playback) */}
            <div style={sectionLabel}>ANÁLISIS INTELIGENTE</div>
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              {anomalies.length === 0 ? (
                <div style={{ color: "#1a5030", fontSize: 10, padding: "4px 0" }}>✓ Sin eventos detectados</div>
              ) : anomalies.map((ev, i) => (
                <div key={i} style={{
                  display: "flex", gap: 6, alignItems: "center", marginBottom: 3,
                  padding: "3px 8px", borderRadius: 3,
                  background: ev.severity === "crit" ? "#1a0000" : "#0a0e00",
                  border: `1px solid ${ev.severity === "crit" ? "#660000" : "#554400"}`,
                }}>
                  <span style={{ fontSize: 10 }}>{ev.severity === "crit" ? "🔴" : "🟡"}</span>
                  <span style={{ color: "#3a5a7a", fontSize: 9, width: 48, flexShrink: 0 }}>{ev.time}</span>
                  <span style={{ color: ev.severity === "crit" ? "#ff6666" : "#ffcc44", fontSize: 10, flex: 1 }}>{ev.label}</span>
                  <span style={{ color: ev.severity === "crit" ? "#ff9999" : "#ccaa22", fontSize: 10 }}>{ev.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <Controls
        index={index} total={points.length}
        isPlaying={isPlaying} speed={speed}
        onToggle={() => setIsPlaying(v => !v)}
        onSeek={setIndex}
        onSkip={d => setIndex(i => Math.max(0, Math.min(points.length - 1, i + d)))}
        onSpeed={setSpeed}
      />
    </div>
  );
}
