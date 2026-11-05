import { Router } from "express";
import { asyncRoute, HttpError } from "../http/errors.js";
import { connectionStatus } from "../mcp/client.js";
import { getBoard, getRoute, searchRoutes } from "../services/transmilenio.js";

export const api = Router();

function one(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : "";
  return typeof value === "string" ? value : "";
}

api.get(
  "/health",
  asyncRoute(async (_req, res) => {
    const status = await connectionStatus();
    res.json({
      connected: status.connected,
      message: status.message ?? "Datos de TransMilenio disponibles.",
    });
  }),
);

api.get(
  "/routes",
  asyncRoute(async (req, res) => {
    const query = one(req.query.q);
    const system = one(req.query.system);
    const result = await searchRoutes(query, system || undefined);
    res.json(result);
  }),
);

api.get(
  "/routes/:routeId",
  asyncRoute(async (req, res) => {
    const routeId = one(req.params.routeId);
    const result = await getRoute(routeId);
    res.json(result);
  }),
);

api.get(
  "/routes/:routeId/board",
  asyncRoute(async (req, res) => {
    const routeId = one(req.params.routeId);
    res.json(await getBoard(routeId));
  }),
);

api.get(
  "/routes/:routeId/vehicles/:vehicleId",
  asyncRoute(async (req, res) => {
    const routeId = one(req.params.routeId);
    const vehicleId = one(req.params.vehicleId);
    const board = await getBoard(routeId);
    const vehicle = board.vehicles.find((item) => item.vehicleId === vehicleId);
    if (!vehicle) {
      throw new HttpError(404, "not_found", "Ese bus no está reportando en esta ruta.");
    }
    res.json({ asOf: board.asOf, vehicle });
  }),
);
