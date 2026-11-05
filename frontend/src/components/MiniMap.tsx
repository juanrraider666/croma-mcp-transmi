import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { RoutePattern, Vehicle } from "../types";

interface MiniMapProps {
  vehicle: Vehicle;
  pattern: RoutePattern | null;
  color: string;
  follow: boolean;
  frame: "bus" | "route";
  onRelease: () => void;
}

function busIcon(bearing: number | null) {
  const rotation = bearing ?? 0;
  return L.divIcon({
    className: "bus-marker",
    html: `<img src="/bus.webp" alt="" style="transform: rotate(${rotation}deg)" />`,
    iconSize: [46, 46],
    iconAnchor: [23, 23],
  });
}

function MapView({
  vehicle,
  line,
  follow,
  frame,
  onRelease,
}: {
  vehicle: Vehicle;
  line: [number, number][];
  follow: boolean;
  frame: "bus" | "route";
  onRelease: () => void;
}) {
  const map = useMap();
  const lineRef = useRef(line);
  lineRef.current = line;

  useEffect(() => {
    const release = () => onRelease();
    map.on("dragstart", release);
    return () => {
      map.off("dragstart", release);
    };
  }, [map, onRelease]);

  useEffect(() => {
    if (frame !== "route" || lineRef.current.length < 2) return;
    map.fitBounds(lineRef.current, { padding: [18, 18], animate: true });
  }, [frame, map, vehicle.vehicleId]);

  useEffect(() => {
    if (frame === "route" || !follow || vehicle.latitude === null || vehicle.longitude === null) return;
    map.panTo([vehicle.latitude, vehicle.longitude], { animate: true });
  }, [follow, frame, map, vehicle.latitude, vehicle.longitude]);

  return null;
}

function useSlidingPosition(position: [number, number], token: string): [number, number] {
  const [current, setCurrent] = useState(position);
  const from = useRef(position);
  const tokenRef = useRef(token);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const jumped = tokenRef.current !== token;
    tokenRef.current = token;
    if (reduce || jumped) {
      from.current = position;
      setCurrent(position);
      return;
    }
    const start = from.current;
    const begun = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - begun) / 700);
      const eased = 1 - (1 - progress) * (1 - progress);
      const next: [number, number] = [
        start[0] + (position[0] - start[0]) * eased,
        start[1] + (position[1] - start[1]) * eased,
      ];
      from.current = next;
      setCurrent(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [position, token]);

  return current;
}

export function MiniMap({ vehicle, pattern, color, follow, frame, onRelease }: MiniMapProps) {
  const line = useMemo<[number, number][]>(() => {
    const coordinates = pattern?.geometry?.coordinates ?? [];
    return coordinates.map(([longitude, latitude]) => [latitude, longitude]);
  }, [pattern]);

  const position = useMemo<[number, number] | null>(() => {
    if (vehicle.latitude === null || vehicle.longitude === null) return null;
    return [vehicle.latitude, vehicle.longitude];
  }, [vehicle.latitude, vehicle.longitude]);

  const icon = useMemo(() => busIcon(vehicle.bearing), [vehicle.bearing]);
  const markerPosition = useSlidingPosition(position ?? [4.65, -74.08], vehicle.vehicleId);

  if (!position) return null;

  return (
    <div className="map-frame">
      <MapContainer
        key={vehicle.vehicleId}
        center={position}
        zoom={15}
        zoomControl
        scrollWheelZoom={false}
        className="map-canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {line.length > 1 ? <Polyline positions={line} pathOptions={{ color, weight: 5, opacity: 0.9 }} /> : null}
        {pattern?.stops.map((stop) => (
          <CircleMarker
            key={stop.stopId}
            center={[stop.latitude, stop.longitude]}
            radius={stop.stopId === vehicle.stopId ? 7 : 4}
            pathOptions={{
              color: stop.stopId === vehicle.stopId ? "#172033" : color,
              fillColor: stop.stopId === vehicle.stopId ? "#F3D23A" : "#ffffff",
              fillOpacity: 1,
              weight: 2,
            }}
          />
        ))}
        <Marker position={markerPosition} icon={icon} />
        <MapView vehicle={vehicle} line={line} follow={follow} frame={frame} onRelease={onRelease} />
      </MapContainer>
    </div>
  );
}
