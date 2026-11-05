import { useEffect, useState } from "react";
import { ago, minutesLabel, statusLabel } from "../format";
import type { RouteDetail, Vehicle } from "../types";
import { MiniMap } from "./MiniMap";

interface TrackingPanelProps {
  route: RouteDetail;
  vehicle: Vehicle;
  onRefresh: () => void;
  refreshing: boolean;
}

export function TrackingPanel({ route, vehicle, onRefresh, refreshing }: TrackingPanelProps) {
  const [now, setNow] = useState(() => Date.now());
  const [follow, setFollow] = useState(true);
  const [frame, setFrame] = useState<"bus" | "route">("bus");
  const pattern = route.patterns[0] ?? null;
  const hasPosition = vehicle.latitude !== null && vehicle.longitude !== null;

  useEffect(() => {
    setFollow(true);
    setFrame("bus");
  }, [vehicle.vehicleId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <aside className="tracking" aria-live="polite">
      <p className="eyebrow">Siguiendo</p>
      <div className="tracking-head">
        {vehicle.licensePlate ? (
          <p className="plate plate-large">{vehicle.licensePlate}</p>
        ) : (
          <p className="plate plate-large is-empty">Placa no publicada</p>
        )}
        <p className="tracking-route">
          <strong>{route.shortName}</strong>
          <span>{route.longName}</span>
        </p>
      </div>
      <dl className="facts">
        <div>
          <dt>Próxima parada</dt>
          <dd>{vehicle.stopName ?? "Sin parada reportada"}</dd>
        </div>
        <div>
          <dt>Llegada estimada</dt>
          <dd>{minutesLabel(vehicle.minutesAway)}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{statusLabel(vehicle.stopStatus)}</dd>
        </div>
        <div>
          <dt>Última posición</dt>
          <dd>{ago(vehicle.reportedAt, now)}</dd>
        </div>
      </dl>
      {hasPosition ? (
        <MiniMap
          vehicle={vehicle}
          pattern={pattern}
          color={route.color}
          follow={follow}
          frame={frame}
          onRelease={() => setFollow(false)}
        />
      ) : (
        <figure className="map-empty">
          <img src="/empty.webp" alt="" />
          <figcaption>Este vehículo no reporta coordenadas.</figcaption>
        </figure>
      )}
      <div className="tracking-actions">
        <button type="button" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Actualizando" : "Actualizar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setFrame("bus");
            setFollow(true);
          }}
          disabled={!hasPosition}
        >
          Centrar bus
        </button>
        <button
          type="button"
          onClick={() => {
            setFrame("route");
            setFollow(false);
          }}
          disabled={!pattern?.geometry}
        >
          Ver recorrido
        </button>
      </div>
    </aside>
  );
}
