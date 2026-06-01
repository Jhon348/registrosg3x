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

export function parseG3xCsv(csvContent: string): ParsedG3xLog {
  const lines = csvContent.split(/\r?\n/);
  let airframeInfo: G3xAirframeInfo = {
    product: "GDU 460",
    aircraftIdent: "",
    softwareVersion: "",
    systemId: "",
    airframeHours: null,
    engineHours: null,
  };

  let headersParsed = 0;
  let shortHeaders: string[] = [];
  const points: G3xPoint[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#airframe_info")) {
      airframeInfo = parseAirframeInfo(line);
      continue;
    }

    if (line.startsWith("#")) continue;

    if (headersParsed === 0) {
      headersParsed = 1;
      continue;
    }

    if (headersParsed === 1) {
      shortHeaders = splitCsvLine(line).map(h => h.trim());
      headersParsed = 2;
      continue;
    }

    const values = splitCsvLine(line);
    if (values.length < 5) continue;

    const get = (name: string): string => {
      const idx = shortHeaders.indexOf(name);
      return idx >= 0 ? (values[idx] ?? "").trim() : "";
    };

    const getByPartial = (partial: string): string => {
      const idx = shortHeaders.findIndex(h => h === partial);
      return idx >= 0 ? (values[idx] ?? "").trim() : "";
    };

    const lclDate = get("Lcl Date");
    const lclTime = get("Lcl Time");
    if (!lclDate && !lclTime) continue;
    const fullLclTime = `${lclDate} ${lclTime}`.trim();

    const utcTime = get("UTC Time");
    const alerts = getByPartial("") ;

    const lastVal = values[values.length - 1]?.trim() ?? "";
    const secondLastVal = values[values.length - 2]?.trim() ?? "";

    const alertsValue = (lastVal && !lastVal.match(/^[\d.-]+$/)) ? lastVal
      : (secondLastVal && !secondLastVal.match(/^[\d.-]+$/)) ? secondLastVal
      : null;

    const point: G3xPoint = {
      lclTime: fullLclTime,
      utcTime: utcTime || null,
      lat: parseNum(get("Latitude")),
      lon: parseNum(get("Longitude")),
      altGps: parseNum(get("AltGPS")),
      altP: parseNum(get("AltP")),
      ias: parseNum(get("IAS")),
      tas: parseNum(get("TAS")),
      gndSpd: parseNum(get("GndSpd")),
      trk: parseNum(get("TRK")),
      hdg: parseNum(get("HDG")),
      pitch: parseNum(get("Pitch")),
      roll: parseNum(get("Roll")),
      vspd: parseNum(get("VSpd")),
      oat: parseNum(get("OAT")),
      e1Rpm: parseNum(get("E1 RPM")),
      e1Map: parseNum(get("E1 MAP")),
      e1OilT: parseNum(get("E1 OilT")),
      e1OilP: parseNum(get("E1 OilP")),
      e1Fflow: parseNum(get("E1 FFlow")),
      volts1: parseNum(get("Volts1")),
      amps1: parseNum(get("Amps1")),
      fqty1: parseNum(get("FQty1")),
      fqty2: parseNum(get("FQty2")),
      e1Cht1: parseNum(get("E1 CHT1")),
      e1Cht2: parseNum(get("E1 CHT2")),
      e1Cht3: parseNum(get("E1 CHT3")),
      e1Cht4: parseNum(get("E1 CHT4")),
      e1Cht5: parseNum(get("E1 CHT5")),
      e1Cht6: parseNum(get("E1 CHT6")),
      e1Egt1: parseNum(get("E1 EGT1")),
      e1Egt2: parseNum(get("E1 EGT2")),
      e1Egt3: parseNum(get("E1 EGT3")),
      e1Egt4: parseNum(get("E1 EGT4")),
      e1Egt5: parseNum(get("E1 EGT5")),
      e1Egt6: parseNum(get("E1 EGT6")),
      alerts: alertsValue,
      baro: parseNum(get("Baro")),
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

    const fqty = p.fqty1 != null && p.fqty2 != null ? p.fqty1 + p.fqty2 : (p.fqty1 ?? p.fqty2);
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
