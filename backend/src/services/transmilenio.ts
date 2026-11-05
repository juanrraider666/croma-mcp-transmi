import { memoStore, mapPool } from "../domain/cache.js";
import {
  CromaError,
  joinArrivals,
  records,
  toAlert,
  toArrival,
  toRouteDetail,
  toRouteSummary,
  toVehicle,
} from "../domain/normalize.js";
import type { ArrivalHit, RouteDetail, RouteSummary, ServiceAlert, Vehicle } from "../domain/types.js";
import { callCromaTool } from "../mcp/client.js";

const routeSearchCache = memoStore<{ asOf: string | null; total: number; routes: RouteSummary[] }>(5 * 60_000);
const routeCache = memoStore<{ asOf: string | null; route: RouteDetail }>(6 * 60 * 60_000);
const arrivalCache = memoStore<ArrivalHit[]>(15_000);
const alertCache = memoStore<ServiceAlert[]>(60_000);
const vehicleCache = memoStore<{ asOf: string | null; vehicles: Vehicle[] }>(8_000);

const SYSTEMS = new Set([
  "troncal",
  "alimentador",
  "dual",
  "zonal_urbano",
  "zonal_complementario",
  "zonal_especial",
  "transmicable",
]);

export function assertRouteId(routeId: string): void {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(routeId)) {
    throw new CromaError("Esa ruta no tiene un identificador válido.");
  }
}

export async function searchRoutes(query: string, system?: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2 || trimmed.length > 200) {
    throw new CromaError("Escribe al menos 2 caracteres para buscar.");
  }
  if (system && !SYSTEMS.has(system)) {
    throw new CromaError("Ese sistema de transporte no existe.");
  }

  const key = `${trimmed.toLowerCase()}|${system ?? ""}`;
  return routeSearchCache.get(key, async () => {
    const payload = asRecord(
      await callCromaTool("transmilenio_routes_search", {
        query: trimmed,
        system: system ?? "",
        page: 1,
        per_page: 20,
      }),
    );
    return {
      asOf: text(payload.as_of),
      total: typeof payload.total === "number" ? payload.total : 0,
      routes: records(payload.routes).flatMap((item) => {
        const route = toRouteSummary(item);
        return route ? [route] : [];
      }),
    };
  });
}

export async function getRoute(routeId: string) {
  assertRouteId(routeId);
  return routeCache.get(routeId, async () => {
    const payload = asRecord(
      await callCromaTool("transmilenio_route", {
        route_id: routeId,
        include_geometry: true,
      }),
    );
    if (payload.found === false || !payload.route || typeof payload.route !== "object") {
      throw new MissingRoute();
    }
    const route = toRouteDetail(payload.route as Record<string, unknown>);
    if (!route) throw new CromaError("La ruta llegó incompleta.");
    return { asOf: text(payload.as_of), route };
  });
}

export async function getBoard(routeId: string) {
  assertRouteId(routeId);
  const listed = await vehicleCache.get(routeId, () => loadVehicles(routeId));
  const stopIds = [...new Set(listed.vehicles.map((vehicle) => vehicle.stopId).filter((id): id is string => Boolean(id)))];
  const arrivals = (await mapPool(stopIds, 4, (stopId) => loadArrivals(stopId, routeId))).flat();
  const alerts = await alertCache.get(routeId, () => loadAlerts(routeId));

  return {
    asOf: listed.asOf,
    vehicles: joinArrivals(listed.vehicles, arrivals),
    alerts,
  };
}

async function loadVehicles(routeId: string) {
  const first = asRecord(
    await callCromaTool("transmilenio_vehicles", {
      route: routeId,
      page: 1,
      per_page: 100,
    }),
  );
  const vehicles = records(first.vehicles).flatMap((item) => {
    const vehicle = toVehicle(item);
    return vehicle ? [vehicle] : [];
  });
  const totalPages = typeof first.total_pages === "number" ? first.total_pages : 1;
  if (totalPages > 1) {
    const second = asRecord(
      await callCromaTool("transmilenio_vehicles", {
        route: routeId,
        page: 2,
        per_page: 100,
      }),
    );
    for (const item of records(second.vehicles)) {
      const vehicle = toVehicle(item);
      if (vehicle) vehicles.push(vehicle);
    }
  }
  return { asOf: text(first.as_of), vehicles };
}

async function loadArrivals(stopId: string, routeId: string): Promise<ArrivalHit[]> {
  return arrivalCache.get(`${routeId}|${stopId}`, async () => {
    try {
      const payload = asRecord(
        await callCromaTool("transmilenio_stop_arrivals", {
          stop_id: stopId,
          route: routeId,
          limit: 50,
        }),
      );
      return records(payload.arrivals).flatMap((item) => {
        const arrival = toArrival(item);
        return arrival ? [arrival] : [];
      });
    } catch {
      return [];
    }
  });
}

async function loadAlerts(routeId: string): Promise<ServiceAlert[]> {
  try {
    const payload = asRecord(await callCromaTool("transmilenio_alerts", { route: routeId }));
    return records(payload.alerts).flatMap((item) => {
      const alert = toAlert(item);
      return alert ? [alert] : [];
    });
  } catch {
    return [];
  }
}

export class MissingRoute extends Error {
  constructor() {
    super("No encontramos esa ruta.");
    this.name = "MissingRoute";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CromaError("La fuente de datos devolvió un formato inesperado.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
