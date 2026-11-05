export interface RouteSummary {
  routeId: string;
  shortName: string;
  longName: string;
  system: string;
  systemName: string;
  mode: string;
  color: string;
  textColor: string;
  stopsCount: number;
  tripsPerWeek: number;
  firstDeparture: string;
  lastDeparture: string;
}

export interface RouteStop {
  sequence: number;
  stopId: string;
  name: string;
  code: string | null;
  latitude: number;
  longitude: number;
  offsetSeconds: number;
}

export interface RoutePattern {
  shapeId: string;
  tripsPerWeek: number;
  lengthM: number | null;
  geometry: { type: "LineString"; coordinates: [number, number][] } | null;
  stops: RouteStop[];
}

export interface RouteDetail extends RouteSummary {
  patterns: RoutePattern[];
}

export interface Vehicle {
  vehicleId: string;
  label: string | null;
  licensePlate: string | null;
  latitude: number | null;
  longitude: number | null;
  bearing: number | null;
  speedKmh: number | null;
  routeId: string;
  routeCode: string;
  routeName: string;
  system: string;
  stopId: string | null;
  stopName: string | null;
  stopStatus: string | null;
  reportedAt: string | null;
  minutesAway: number | null;
  predictedAt: string | null;
  delaySeconds: number | null;
}

export interface ServiceAlert {
  alertId: string;
  cause: string | null;
  effect: string | null;
  header: string;
  description: string | null;
  url: string | null;
}

export interface Board {
  asOf: string | null;
  vehicles: Vehicle[];
  alerts: ServiceAlert[];
}

export interface Health {
  connected: boolean;
  message: string;
}

export type StatusFilter = "all" | "in_transit_to" | "stopped_at" | "incoming_at";
