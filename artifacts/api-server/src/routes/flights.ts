import { Router, type IRouter } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db, flightsTable, flightPointsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetFlightParams,
  DeleteFlightParams,
  GetFlightPointsParams,
  ListFlightsResponse,
  GetFlightResponse,
  GetFlightPointsResponse,
} from "@workspace/api-zod";
import { parseG3xCsv, computeFlightStats } from "../lib/g3xParser";

/**
 * Convert an Excel (.xlsx/.xls) buffer to CSV text.
 * Reads the first sheet and exports it as CSV so the G3X parser can handle it.
 */
function xlsxToCsv(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Excel file contains no sheets");
  return XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]!, { blankrows: false });
}

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get("/flights", async (req, res): Promise<void> => {
  const flights = await db
    .select()
    .from(flightsTable)
    .orderBy(flightsTable.uploadedAt);

  const mapped = flights.map(f => ({
    ...f,
    uploadedAt: f.uploadedAt.toISOString(),
  }));
  res.json(ListFlightsResponse.parse(mapped));
});

router.post("/flights/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded. Send a multipart/form-data request with field 'file'." });
    return;
  }

  const filename = req.file.originalname.toLowerCase();
  const isExcel = filename.endsWith(".xlsx") || filename.endsWith(".xls");
  req.log.info({ filename: req.file.originalname, size: req.file.size, isExcel }, "Parsing G3X log");

  let csvContent: string;
  if (isExcel) {
    try {
      csvContent = xlsxToCsv(req.file.buffer);
    } catch (err) {
      req.log.error({ err }, "Failed to convert Excel to CSV");
      res.status(400).json({ error: "No se pudo leer el archivo Excel. Asegúrese de que es un archivo .xlsx o .xls válido." });
      return;
    }
  } else {
    csvContent = req.file.buffer.toString("utf-8");
  }

  let parsed;
  try {
    parsed = parseG3xCsv(csvContent);
  } catch (err) {
    req.log.error({ err }, "Failed to parse G3X CSV");
    res.status(400).json({ error: "Could not parse the CSV file. Make sure it is a valid Garmin G3X log." });
    return;
  }

  const { airframeInfo, points } = parsed;
  const stats = computeFlightStats(points);

  const [flight] = await db
    .insert(flightsTable)
    .values({
      filename: req.file.originalname,
      aircraftIdent: airframeInfo.aircraftIdent,
      product: airframeInfo.product,
      softwareVersion: airframeInfo.softwareVersion,
      systemId: airframeInfo.systemId || null,
      airframeHours: airframeInfo.airframeHours,
      engineHours: airframeInfo.engineHours,
      totalPoints: points.length,
      startTime: stats.startTime,
      endTime: stats.endTime,
      maxAltGps: stats.maxAltGps,
      maxIas: stats.maxIas,
      maxRpm: stats.maxRpm,
      maxEgt: stats.maxEgt,
      fuelUsed: stats.fuelUsed,
    })
    .returning();

  if (points.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < points.length; i += BATCH_SIZE) {
      const batch = points.slice(i, i + BATCH_SIZE).map(p => ({
        flightId: flight.id,
        ...p,
      }));
      await db.insert(flightPointsTable).values(batch);
    }
    req.log.info({ flightId: flight.id, points: points.length }, "Flight points inserted");
  }

  res.status(201).json(GetFlightResponse.parse({ ...flight, uploadedAt: flight.uploadedAt.toISOString() }));
});

router.get("/flights/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetFlightParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [flight] = await db
    .select()
    .from(flightsTable)
    .where(eq(flightsTable.id, params.data.id));

  if (!flight) {
    res.status(404).json({ error: "Flight not found" });
    return;
  }

  res.json(GetFlightResponse.parse({ ...flight, uploadedAt: flight.uploadedAt.toISOString() }));
});

router.delete("/flights/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteFlightParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [flight] = await db
    .delete(flightsTable)
    .where(eq(flightsTable.id, params.data.id))
    .returning();

  if (!flight) {
    res.status(404).json({ error: "Flight not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/flights/:id/points", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetFlightPointsParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [flight] = await db
    .select({ id: flightsTable.id })
    .from(flightsTable)
    .where(eq(flightsTable.id, params.data.id));

  if (!flight) {
    res.status(404).json({ error: "Flight not found" });
    return;
  }

  const points = await db
    .select()
    .from(flightPointsTable)
    .where(eq(flightPointsTable.flightId, params.data.id))
    .orderBy(flightPointsTable.id);

  // Skip Zod re-validation on read path — data came from our own DB,
  // and for large flights (5000+ points) parse() adds 2-3s of CPU overhead.
  res.json(points);
});

export default router;
