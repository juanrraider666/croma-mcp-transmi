import type {
  ArrivalHit,
  LineString,
  RouteDetail,
  RoutePattern,
  RouteStop,
  RouteSummary,
  ServiceAlert,
  ToolResult,
  Vehicle,
} from "./types.js";

export class CromaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CromaError";
  }
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function safeColor(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value) ? value : fallback;
}

export function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readToolPayload(result: ToolResult): Record<string, unknown> {
  if (result.isError) {
    const detail = textOf(result);
    throw new CromaError(detail || "La fuente de datos rechazó la consulta.");
  }

  const text = textOf(result);
  if (text) {
    try {
      const parsed = JSON.parse(text) as unknown;
      return asRecord(parsed);
    } catch {
      throw new CromaError("La fuente de datos devolvió un formato ilegible.");
    }
  }

  const structured = result.structuredContent;
  if (structured && typeof structured === "object" && "data" in structured) {
    return asRecord((structured as { data?: unknown }).data);
  }

  throw new CromaError("La fuente de datos no devolvió contenido.");
}

function textOf(result: ToolResult): string {
  return result.content?.find((item) => item.type === "text")?.text?.trim() ?? "";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CromaError("La fuente de datos devolvió un formato inesperado.");
  }
  return value as Record<string, unknown>;
}

export function toRouteSummary(raw: Record<string, unknown>): RouteSummary | null {
  const routeId = textOrNull(raw.route_id);
  const shortName = textOrNull(raw.short_name);
  if (!routeId || !shortName) return null;

  return {
    routeId,
    shortName,
    longName: textOrNull(raw.long_name) ?? shortName,
    system: textOrNull(raw.system) ?? "",
    systemName: textOrNull(raw.system_name) ?? "",
    mode: textOrNull(raw.mode) ?? "",
    color: safeColor(raw.color, "#C23B2E"),
    textColor: safeColor(raw.text_color, "#ffffff"),
    stopsCount: numberOrNull(raw.stops_count) ?? 0,
    tripsPerWeek: numberOrNull(raw.trips_per_week) ?? 0,
    firstDeparture: textOrNull(raw.first_departure) ?? "",
    lastDeparture: textOrNull(raw.last_departure) ?? "",
  };
}

export function toRouteDetail(raw: Record<string, unknown>): RouteDetail | null {
  const summary = toRouteSummary(raw);
  if (!summary) return null;
  const patterns = Array.isArray(raw.patterns)
    ? raw.patterns.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const pattern = toPattern(item as Record<string, unknown>);
        return pattern ? [pattern] : [];
      })
    : [];

  return { ...summary, patterns };
}

function toPattern(raw: Record<string, unknown>): RoutePattern | null {
  const shapeId = textOrNull(raw.shape_id);
  if (!shapeId) return null;
  const stops = Array.isArray(raw.stops)
    ? raw.stops.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const stop = toStop(item as Record<string, unknown>);
        return stop ? [stop] : [];
      })
    : [];

  return {
    shapeId,
    tripsPerWeek: numberOrNull(raw.trips_per_week) ?? 0,
    lengthM: numberOrNull(raw.length_m),
    geometry: toLineString(raw.geometry),
    stops,
  };
}

function toStop(raw: Record<string, unknown>): RouteStop | null {
  const stopId = textOrNull(raw.stop_id);
  const latitude = numberOrNull(raw.latitude);
  const longitude = numberOrNull(raw.longitude);
  if (!stopId || latitude === null || longitude === null) return null;

  return {
    sequence: numberOrNull(raw.sequence) ?? 0,
    stopId,
    name: textOrNull(raw.name) ?? "Parada",
    code: textOrNull(raw.code),
    latitude,
    longitude,
    offsetSeconds: numberOrNull(raw.offset_seconds) ?? 0,
  };
}

function toLineString(value: unknown): LineString | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { type?: unknown; coordinates?: unknown };
  if (raw.type !== "LineString" || !Array.isArray(raw.coordinates)) return null;

  const coordinates = raw.coordinates.flatMap((pair) => {
    if (!Array.isArray(pair) || pair.length < 2) return [];
    const longitude = numberOrNull(pair[0]);
    const latitude = numberOrNull(pair[1]);
    if (longitude === null || latitude === null) return [];
    return [[longitude, latitude] as [number, number]];
  });

  return coordinates.length > 1 ? { type: "LineString", coordinates } : null;
}

export function toVehicle(raw: Record<string, unknown>): Vehicle | null {
  const vehicleId = textOrNull(raw.vehicle_id);
  const routeId = textOrNull(raw.route_id);
  if (!vehicleId || !routeId) return null;

  return {
    vehicleId,
    label: textOrNull(raw.label),
    licensePlate: textOrNull(raw.license_plate),
    latitude: numberOrNull(raw.latitude),
    longitude: numberOrNull(raw.longitude),
    bearing: numberOrNull(raw.bearing),
    speedKmh: numberOrNull(raw.speed_kmh),
    routeId,
    routeCode: textOrNull(raw.route_code) ?? "",
    routeName: textOrNull(raw.route_name) ?? "",
    system: textOrNull(raw.system) ?? "",
    stopId: textOrNull(raw.stop_id),
    stopName: textOrNull(raw.stop_name),
    stopStatus: textOrNull(raw.stop_status),
    reportedAt: textOrNull(raw.reported_at),
    minutesAway: null,
    predictedAt: null,
    delaySeconds: null,
  };
}

export function toArrival(raw: Record<string, unknown>): ArrivalHit | null {
  const vehicleId = textOrNull(raw.vehicle_id);
  if (!vehicleId) return null;
  return {
    vehicleId,
    minutesAway: numberOrNull(raw.minutes_away),
    predictedAt: textOrNull(raw.predicted_at),
    delaySeconds: numberOrNull(raw.delay_seconds),
  };
}

export function joinArrivals(vehicles: Vehicle[], arrivals: ArrivalHit[]): Vehicle[] {
  const byId = new Map(arrivals.map((arrival) => [arrival.vehicleId, arrival]));
  return vehicles.map((vehicle) => {
    const hit = byId.get(vehicle.vehicleId);
    if (!hit) return vehicle;
    return {
      ...vehicle,
      minutesAway: hit.minutesAway,
      predictedAt: hit.predictedAt,
      delaySeconds: hit.delaySeconds,
    };
  });
}

export function toAlert(raw: Record<string, unknown>): ServiceAlert | null {
  const header = textOrNull(raw.header);
  const description = textOrNull(raw.description);
  if (!header && !description) return null;
  return {
    alertId: textOrNull(raw.alert_id) ?? header ?? description ?? "alerta",
    cause: textOrNull(raw.cause),
    effect: textOrNull(raw.effect),
    header: header ?? "Novedad del servicio",
    description,
    url: textOrNull(raw.url),
  };
}

export function records(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}
