# Alvarez Aviation — FOQA Dashboard

Dashboard FOQA para Alvarez Aviation que analiza logs CSV del Garmin G3X GDU 460. Permite subir archivos de vuelo, visualizar telemetría, monitorear motor y reproducir el vuelo con instrumentos de cabina animados estilo G3X Touch.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React 19 + Vite + Recharts + Radix UI + Tailwind + Wouter

## Where things live

- `artifacts/api-server/src/routes/flights.ts` — upload, list, get, delete flights + points endpoint
- `artifacts/api-server/src/lib/g3xParser.ts` — CSV parser for Garmin G3X logs
- `artifacts/foqa-dashboard/src/pages/flight-detail.tsx` — main flight view (5 tabs)
- `artifacts/foqa-dashboard/src/components/flight/flight-replay.tsx` — G3X Touch replay with animated instruments
- `artifacts/foqa-dashboard/src/components/flight/flight-summary.tsx` — detailed stats panel (4 cards)
- `lib/db/src/schema/flights.ts` — DB schema source of truth
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for codegen)

## Aircraft & POH Thresholds

**Avión: GB1 Gamebird** — todos los umbrales del sistema vienen del POH del GB1 Gamebird:

| Parámetro | Verde | Amarillo | Rojo |
|---|---|---|---|
| RPM | 700–2600 | — | >2600 |
| MAP | 11–32 inHg | — | — |
| Oil T | 100–245°F | — | <100 o >245°F |
| Oil P | 55–95 psi | 25–55 y 95–115 psi | <25 o >115 psi |
| CHT | 200–465°F | 100–200°F | >465°F |
| EGT | 1100–1550°F | — | >1550°F |
| Voltios | 12.4–15.5 V | <12.4 o >15.5 V | sin rojo |
| Amperios | 1–60 A | <0 A | — |
| Combustible | ≥7 gal/tanque | <7 gal/tanque | — |

## Architecture decisions

- **Zod omitido en respuesta de puntos**: el endpoint `/flights/:id/points` no re-valida con Zod al leer porque para vuelos largos (5000+ puntos) añade 2-3s de overhead. Los datos vienen de nuestra propia DB.
- **React 19 concurrent mode — lista fija**: cualquier lista renderizada durante animación debe tener longitud fija con keys enteras estables (0..N-1). Listas variables causan el crash `insertBefore`. Ver `flight-replay.tsx` → panel CAS y VTape.
- **G3X replay index**: el replay usa `setInterval` + `useState(index)`. El índice avanza 1 por tick (100ms). Para vuelos muy largos se puede subir la velocidad.

## Product

- Subida de logs CSV del Garmin G3X GDU 460
- Listado de vuelos con fecha, duración y matrícula
- Por vuelo: 5 pestañas (Replay G3X, Telemetría, Motor, Voltaje, Mensajes CAS)
- Panel de resumen con 4 tarjetas: Rendimiento, Motor/Eléctrico, Combustible, Cilindros
- Thresholds del POH del GB1 Gamebird en toda la UI

## User preferences

- Idioma de la UI: **español**
- Umbrales: siempre del POH del **GB1 Gamebird**
- Unidades: °F para temperaturas de motor, psi, kt, pies, gal

## Gotchas

- No usar `console.log` en el servidor — usar `req.log` o el singleton `logger`
- `pnpm run dev` en la raíz no existe — usar los workflows individuales
- Typecheck con `pnpm --filter @workspace/<slug> run typecheck`, no `build`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
