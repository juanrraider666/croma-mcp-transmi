import type { Board, Health, RouteDetail, RouteSummary, Vehicle } from "./types";

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path);
  } catch {
    throw new ApiError("No pudimos hablar con Andén. Revisa que el servidor esté encendido.");
  }

  const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  if (!response.ok) {
    throw new ApiError(body?.error?.message || "La consulta no se completó.");
  }
  return body as T;
}

export function fetchHealth(): Promise<Health> {
  return request<Health>("/api/health");
}

export function searchRoutes(query: string): Promise<{ asOf: string | null; total: number; routes: RouteSummary[] }> {
  const params = new URLSearchParams({ q: query });
  return request(`/api/routes?${params.toString()}`);
}

export function fetchRoute(routeId: string): Promise<{ asOf: string | null; route: RouteDetail }> {
  return request(`/api/routes/${encodeURIComponent(routeId)}`);
}

export function fetchBoard(routeId: string): Promise<Board> {
  return request(`/api/routes/${encodeURIComponent(routeId)}/board`);
}

export function fetchVehicle(routeId: string, vehicleId: string): Promise<{ asOf: string | null; vehicle: Vehicle }> {
  return request(`/api/routes/${encodeURIComponent(routeId)}/vehicles/${encodeURIComponent(vehicleId)}`);
}
