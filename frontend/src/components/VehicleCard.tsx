import { minutesLabel, statusLabel } from "../format";
import type { Vehicle } from "../types";

interface VehicleCardProps {
  vehicle: Vehicle;
  selected: boolean;
  onSelect: (vehicleId: string) => void;
}

export function VehicleCard({ vehicle, selected, onSelect }: VehicleCardProps) {
  return (
    <button
      type="button"
      className={selected ? "bus-card is-selected" : "bus-card"}
      aria-pressed={selected}
      onClick={() => onSelect(vehicle.vehicleId)}
    >
      <span className="bus-card-top">
        <span className="route-chip">{vehicle.routeCode || "Ruta"}</span>
        <span className={`status status-${vehicle.stopStatus ?? "unknown"}`}>{statusLabel(vehicle.stopStatus)}</span>
      </span>
      {vehicle.licensePlate ? (
        <span className="plate">{vehicle.licensePlate}</span>
      ) : (
        <span className="plate is-empty">Placa no publicada</span>
      )}
      <span className="bus-card-stop">{vehicle.stopName ?? "Parada sin nombre"}</span>
      <span className="bus-card-eta">{minutesLabel(vehicle.minutesAway)}</span>
      {vehicle.label ? <span className="bus-card-label">{vehicle.label}</span> : null}
    </button>
  );
}
