import { pgTable, text, serial, timestamp, integer, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flightsTable = pgTable("flights", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  aircraftIdent: text("aircraft_ident").notNull().default(""),
  product: text("product").notNull().default(""),
  softwareVersion: text("software_version").notNull().default(""),
  systemId: text("system_id"),
  airframeHours: real("airframe_hours"),
  engineHours: real("engine_hours"),
  totalPoints: integer("total_points").notNull().default(0),
  startTime: text("start_time"),
  endTime: text("end_time"),
  maxAltGps: real("max_alt_gps"),
  maxIas: real("max_ias"),
  maxRpm: real("max_rpm"),
  maxEgt: real("max_egt"),
  fuelUsed: real("fuel_used"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFlightSchema = createInsertSchema(flightsTable).omit({ id: true, uploadedAt: true });
export type InsertFlight = z.infer<typeof insertFlightSchema>;
export type Flight = typeof flightsTable.$inferSelect;

export const flightPointsTable = pgTable("flight_points", {
  id: serial("id").primaryKey(),
  flightId: integer("flight_id").notNull().references(() => flightsTable.id, { onDelete: "cascade" }),
  lclTime: text("lcl_time").notNull(),
  utcTime: text("utc_time"),
  lat: real("lat"),
  lon: real("lon"),
  altGps: real("alt_gps"),
  altP: real("alt_p"),
  ias: real("ias"),
  tas: real("tas"),
  gndSpd: real("gnd_spd"),
  trk: real("trk"),
  hdg: real("hdg"),
  pitch: real("pitch"),
  roll: real("roll"),
  vspd: real("vspd"),
  oat: real("oat"),
  e1Rpm: real("e1_rpm"),
  e1Map: real("e1_map"),
  e1OilT: real("e1_oil_t"),
  e1OilP: real("e1_oil_p"),
  e1Fflow: real("e1_fflow"),
  volts1: real("volts1"),
  amps1: real("amps1"),
  fqty1: real("fqty1"),
  fqty2: real("fqty2"),
  e1Cht1: real("e1_cht1"),
  e1Cht2: real("e1_cht2"),
  e1Cht3: real("e1_cht3"),
  e1Cht4: real("e1_cht4"),
  e1Cht5: real("e1_cht5"),
  e1Cht6: real("e1_cht6"),
  e1Egt1: real("e1_egt1"),
  e1Egt2: real("e1_egt2"),
  e1Egt3: real("e1_egt3"),
  e1Egt4: real("e1_egt4"),
  e1Egt5: real("e1_egt5"),
  e1Egt6: real("e1_egt6"),
  alerts: text("alerts"),
  baro: real("baro"),
}, (table) => [
  index("flight_points_flight_id_idx").on(table.flightId),
]);

export const insertFlightPointSchema = createInsertSchema(flightPointsTable).omit({ id: true });
export type InsertFlightPoint = z.infer<typeof insertFlightPointSchema>;
export type FlightPoint = typeof flightPointsTable.$inferSelect;
