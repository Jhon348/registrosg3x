import { logger } from "./logger";

export interface G3xAirframeInfo {
  product: string;
  aircraftIdent: string;
  softwareVersion: string;
  systemId: string;
  airframeHours: number | null;
  engineHours: number | null;
}

export interface G3xPoint {
  lclTime: string;
  utcTime: string | null;
  lat: number | null;
  lon: number | null;
  altGps: number | null;
  altP: number | null;
  ias: number | null;
  tas: number | null;
  gndSpd: number | null;
  trk: number | null;
  hdg: number | null;
  pitch: number | null;
  roll: number | null;
  vspd: number | null;
  oat: number | null;
  e1Rpm: number | null;
  e1Map: number | null;
  e1OilT: number | null;
  e1OilP: number | null;
  e1Fflow: number | null;
  volts1: number | null;
  amps1: number | null;
  fqty1: number | null;
  fqty2: number | null;
  fqtyAcro: number | null;
  e1Cht1: number | null;
  e1Cht2: number | null;
  e1Cht3: number | null;
  e1Cht4: number | null;
  e1Cht5: number | null;
  e1Cht6: number | null;
  e1Egt1: number | null;
  e1Egt2: number | null;
  e1Egt3: number | null;
  e1Egt4: number | null;
  e1Egt5: number | null;
  e1Egt6: number | null;
  alerts: string | null;
  baro: number | null;
}

export interface ParsedG3xLog {
  airframeInfo: G3xAirframeInfo;
  points: G3xPoint[];
}

function parseNum(val: string): number | null {
  if (!val || val.trim() === "" || val.trim() === "*") return null;
  const n = parseFloat(val.trim());
  return isNaN(n) ? null : n;
}

function parseAirframeInfo(line: string): G3xAirframeInfo {
  const info: G3xAirframeInfo = {
    product: "",
    aircraftIdent: "",
    softwareVersion: "",
    systemId: "",
    airframeHours: null,
    engineHours: null,
  };

  const pairs = line.replace(/^#airframe_info,?/, "").split(",");
  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx < 0) continue;
    const key = pair.slice(0, eqIdx).trim();
    const val = pair.slice(eqIdx + 1).trim().replace(/^"|"$/g, "");
    switch (key) {
      case "product": info.product = val; break;
      case "aircraft_ident": info.aircraftIdent = val; break;
      case "software_version": info.softwareVersion = val; break;
      case "system_id": info.systemId = val; break;
      case "airframe_hours": info.airframeHours = parseNum(val); break;
      case "engine_hours": info.engineHours = parseNum(val); break;
    }
  }
  return info;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * When Excel opens a Garmin G3X CSV and re-saves it, it wraps the entire row
 * in double-quotes and doubles every internal quote ("" = escape).
 *
 *   Normal:  5/5/2026,12:29:50,32691,,,...
 *   Excel:   "5/5/2026,""12:29:50"",""32691"","""",",...
 *
 * Detection: splitCsvLine returns exactly 1 field (the whole line was one
 * giant quoted string) AND that field contains commas.
 * splitCsvLine's toggle logic already strips the outer quotes and collapses
 * the internal "" pairs into nothing — leaving the clean inner CSV.
 */
function normalizeExcelLine(line: string): string {
  if (!line.startsWith('"')) return line;
  const fields = splitCsvLine(line);
  if (fields.length === 1 && fields[0].includes(',')) {
    return fields[0];
  }
  return line;
}

/**
 * Column aliases: maps long/unit-suffixed names (Excel/GDU long header format)
 * to the canonical short names used internally.
 * Garmin G3X logs have TWO header rows in the native format (long+short).
 * Excel-saved files collapse to ONE header row with long names.
 */
const COL_ALIASES: Record<string, string> = {
  // Date / time
  "Lcl Date (yy-mm-dd)":       "Lcl Date",
  "Lcl Date (yyyy-mm-dd)":      "Lcl Date",
  "Lcl Time (hh:mm:ss)":        "Lcl Time",
  "UTC Date (yyyy-mm-dd)":      "UTC Date",
  "UTC Time (hh:mm:ss)":        "UTC Time",
  // Position
  "Latitude (WGS84 deg)":       "Latitude",
  "Longitude (WGS84 deg)":      "Longitude",
  "GPS Altitude (WGS84 ft)":    "AltGPS",
  "Pressure Altitude (ft)":     "AltP",
  "Baro Altitude (ft)":         "AltP",
  // Motion
  "GPS Ground Speed (kt)":      "GndSpd",
  "GPS Ground Track (deg true)":"TRK",
  "Vertical Speed (fpm)":       "VSpd",
  "Indicated Airspeed (kt)":    "IAS",
  "True Airspeed (kt)":         "TAS",
  "Magnetic Heading (deg)":     "HDG",
  "Selected Heading (deg)":     "HDG",
  // Attitude
  "Pitch (deg)":                "Pitch",
  "Roll (deg)":                 "Roll",
  // Environment
  "Outside Air Temp (deg C)":   "OAT",
  "Baro Setting (inch Hg)":     "Baro",
  // Engine
  "RPM":                        "E1 RPM",
  "Engine RPM (rpm)":           "E1 RPM",
  "Manifold Press (inch Hg)":   "E1 MAP",
  "Oil Temp (deg F)":           "E1 OilT",
  "Oil Press (PSI)":            "E1 OilP",
  "Fuel Flow (gal/hr)":         "E1 FFlow",
  // Electrical
  "Volts (volts)":              "Volts1",
  "Amps (amps)":                "Amps1",
  // Fuel — long-header (Excel) names
  "Wing Fuel L Qty (gal)":      "FQty1",
  "Wing Fuel R Qty (gal)":      "FQty2",
  "Acro Fuel Qty (gal)":        "FQtyAcro",
  // Fuel — native short-header: FQty3 is the acro/centre tank
  "FQty3":                      "FQtyAcro",
  // CHT
  "CHT 1 (deg F)":              "E1 CHT1",
  "CHT 2 (deg F)":              "E1 CHT2",
  "CHT 3 (deg F)":              "E1 CHT3",
  "CHT 4 (deg F)":              "E1 CHT4",
  "CHT 5 (deg F)":              "E1 CHT5",
  "CHT 6 (deg F)":              "E1 CHT6",
  // EGT
  "EGT 1 (deg F)":              "E1 EGT1",
  "EGT 2 (deg F)":              "E1 EGT2",
  "EGT 3 (deg F)":              "E1 EGT3",
  "EGT 4 (deg F)":              "E1 EGT4",
  "EGT 5 (deg F)":              "E1 EGT5",
  "EGT 6 (deg F)":              "E1 EGT6",
  // Alerts
  "CAS Alert":                  "CAS Alert",
  "Terrain Alert":              "Terrain Alert",
};

/** Build index map: canonical name → column index */
function buildColumnMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, idx) => {
    const t = h.trim();
    if (t && !map.has(t)) map.set(t, idx);
    const alias = COL_ALIASES[t];
    if (alias && !map.has(alias)) map.set(alias, idx);
  });
  return map;
}

/** True if the field looks like a date value rather than a column name */
function isDateLike(s: string): boolean {
  return /^\d{1,4}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s.trim());
}

/** Normalize M/D/YYYY → YYYY-MM-DD so DB timestamps parse correctly */
function normalizeDate(d: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(d.trim());
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return d.trim();
}

export function parseG3xCsv(csvContent: string): ParsedG3xLog {
  // Strip UTF-8 BOM if present (Excel adds it)
  const content = csvContent.replace(/^\uFEFF/, "");

  const lines = content.split(/\r?\n/);
  let airframeInfo: G3xAirframeInfo = {
    product: "GDU 460",
    aircraftIdent: "",
    softwareVersion: "",
    systemId: "",
    airframeHours: null,
    engineHours: null,
  };

  // headersSeen: how many non-# non-data lines we've consumed as headers
  let headersSeen = 0;
  let colMap = new Map<string, number>();
  const points: G3xPoint[] = [];

  for (const rawLine of lines) {
    const line = normalizeExcelLine(rawLine.trim());
    if (!line) continue;

    if (line.startsWith("#airframe_info")) {
      airframeInfo = parseAirframeInfo(line);
      continue;
    }
    if (line.startsWith("#")) continue;

    const fields = splitCsvLine(line).map(f => f.trim());
    if (fields.length < 2) continue;

    const firstField = fields[0];

    // --- Header lines: first field is alphabetic (not a date/number) ---
    if (headersSeen < 2 && !isDateLike(firstField) && /^[A-Za-z_# ]/.test(firstField)) {
      headersSeen++;
      if (headersSeen === 2) {
        // Second header = short names: these ARE the canonical names, map directly
        colMap = buildColumnMap(fields);
      } else {
        // First header could be the only one (Excel format uses long names only)
        // Build a tentative map; if a second header follows, it will override.
        colMap = buildColumnMap(fields);
      }
      continue;
    }

    // --- Data rows ---
    if (colMap.size === 0) continue; // no headers yet, skip

    const get = (name: string): string => {
      const idx = colMap.get(name);
      return idx !== undefined ? (fields[idx] ?? "") : "";
    };

    // Prefer local date/time; fall back to UTC (Excel-saved files use UTC columns)
    const dateStr = get("Lcl Date") || get("UTC Date");
    const timeStr = get("Lcl Time") || get("UTC Time");
    if (!dateStr && !timeStr) continue;
    const fullTime = `${normalizeDate(dateStr)} ${timeStr}`.trim();

    const utcTime = get("UTC Time") || null;

    // CAS alerts:
    // - If the column map has a dedicated "CAS Alert" column (Excel/long-header format),
    //   use that column. "Terrain Alert" is also read and merged in.
    // - If there is no dedicated column (native short-header format), fall back to the
    //   last-non-numeric-field heuristic, then also check second-last for terrain.
    // Both CAS and Terrain alerts are combined with " / " and stored in the alerts field.
    let casAlert: string | null = null;
    let terrainAlert: string | null = null;

    if (colMap.has("CAS Alert")) {
      const c = get("CAS Alert");
      casAlert = (c && c !== "") ? c : null;
      const t = get("Terrain Alert");
      terrainAlert = (t && t !== "") ? t : null;
    } else {
      // Native short-header: last two columns are CAS Alert then Terrain Alert
      const lastVal = fields[fields.length - 1] ?? "";
      const secondLastVal = fields[fields.length - 2] ?? "";
      const isNonNumeric = (v: string) => v !== "" && !v.match(/^[\d.-]+$/);
      casAlert = isNonNumeric(secondLastVal) ? secondLastVal : null;
      terrainAlert = isNonNumeric(lastVal) ? lastVal : null;
    }

    const parts = [casAlert, terrainAlert].filter(Boolean);
    const alertsValue: string | null = parts.length > 0 ? parts.join(" / ") : null;

    const point: G3xPoint = {
      lclTime: fullTime,
      utcTime: utcTime || null,
      lat:      parseNum(get("Latitude")),
      lon:      parseNum(get("Longitude")),
      altGps:   parseNum(get("AltGPS")),
      altP:     parseNum(get("AltP")),
      ias:      parseNum(get("IAS")),
      tas:      parseNum(get("TAS")),
      gndSpd:   parseNum(get("GndSpd")),
      trk:      parseNum(get("TRK")),
      hdg:      parseNum(get("HDG")),
      pitch:    parseNum(get("Pitch")),
      roll:     parseNum(get("Roll")),
      vspd:     parseNum(get("VSpd")),
      oat:      parseNum(get("OAT")),
      e1Rpm:    parseNum(get("E1 RPM")),
      e1Map:    parseNum(get("E1 MAP")),
      e1OilT:   parseNum(get("E1 OilT")),
      e1OilP:   parseNum(get("E1 OilP")),
      e1Fflow:  parseNum(get("E1 FFlow")),
      volts1:   parseNum(get("Volts1")),
      amps1:    parseNum(get("Amps1")),
      fqty1:    parseNum(get("FQty1")),
      fqty2:    parseNum(get("FQty2")),
      fqtyAcro: parseNum(get("FQtyAcro")),
      e1Cht1:   parseNum(get("E1 CHT1")),
      e1Cht2:   parseNum(get("E1 CHT2")),
      e1Cht3:   parseNum(get("E1 CHT3")),
      e1Cht4:   parseNum(get("E1 CHT4")),
      e1Cht5:   parseNum(get("E1 CHT5")),
      e1Cht6:   parseNum(get("E1 CHT6")),
      e1Egt1:   parseNum(get("E1 EGT1")),
      e1Egt2:   parseNum(get("E1 EGT2")),
      e1Egt3:   parseNum(get("E1 EGT3")),
      e1Egt4:   parseNum(get("E1 EGT4")),
      e1Egt5:   parseNum(get("E1 EGT5")),
      e1Egt6:   parseNum(get("E1 EGT6")),
      alerts:   alertsValue,
      baro:     parseNum(get("Baro")),
    };

    points.push(point);
  }

  logger.debug({ totalPoints: points.length }, "G3X CSV parsed");
  return { airframeInfo, points };
}

export function computeFlightStats(points: G3xPoint[]) {
  let maxAltGps: number | null = null;
  let maxIas: number | null = null;
  let maxRpm: number | null = null;
  let maxEgt: number | null = null;
  let startFqty: number | null = null;
  let endFqty: number | null = null;

  for (const p of points) {
    if (p.altGps != null && (maxAltGps == null || p.altGps > maxAltGps)) maxAltGps = p.altGps;
    if (p.ias != null && (maxIas == null || p.ias > maxIas)) maxIas = p.ias;
    if (p.e1Rpm != null && (maxRpm == null || p.e1Rpm > maxRpm)) maxRpm = p.e1Rpm;

    const egts = [p.e1Egt1, p.e1Egt2, p.e1Egt3, p.e1Egt4, p.e1Egt5, p.e1Egt6].filter(v => v != null) as number[];
    for (const egt of egts) {
      if (maxEgt == null || egt > maxEgt) maxEgt = egt;
    }

    // Sum all available tanks (wing L + wing R + acro) for total fuel tracking
    const parts = [p.fqty1, p.fqty2, p.fqtyAcro].filter((v): v is number => v != null);
    const fqty = parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : null;
    if (fqty != null) {
      if (startFqty == null) startFqty = fqty;
      endFqty = fqty;
    }
  }

  const fuelUsed = startFqty != null && endFqty != null ? startFqty - endFqty : null;

  const startTime = points[0]?.lclTime ?? null;
  const endTime = points[points.length - 1]?.lclTime ?? null;

  return { maxAltGps, maxIas, maxRpm, maxEgt, fuelUsed, startTime, endTime };
}
