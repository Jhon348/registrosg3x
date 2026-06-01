import { Router, type IRouter } from "express";
import multer from "multer";
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

  const csvContent = req.file.buffer.toString("utf-8");
  req.log.info({ filename: req.file.originalname, size: req.file.size }, "Parsing G3X CSV");

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

  res.json(GetFlightPointsResponse.parse(points));
});

export default router;
