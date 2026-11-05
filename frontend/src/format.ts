export function statusLabel(status: string | null): string {
  switch (status) {
    case "incoming_at":
      return "Entrando";
    case "stopped_at":
      return "En parada";
    case "in_transit_to":
      return "En camino";
    default:
      return "Sin estado";
  }
}

export function minutesLabel(minutes: number | null): string {
  if (minutes === null) return "Sin estimación";
  if (minutes <= 0) return "Llegando";
  if (minutes === 1) return "1 min";
  return `${minutes} min`;
}

export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return "Sin reporte";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "Sin reporte";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 5) return "ahora";
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes === 1) return "hace 1 min";
  return `hace ${minutes} min`;
}

export function clock(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}
