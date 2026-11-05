import { describe, expect, it } from "vitest";
import { joinArrivals, readToolPayload, safeColor, toVehicle } from "../src/domain/normalize.js";

describe("readToolPayload", () => {
  it("lee el JSON de texto antes del envoltorio structuredContent", () => {
    const payload = readToolPayload({
      content: [{ type: "text", text: JSON.stringify({ routes: [{ route_id: "1" }] }) }],
      structuredContent: { status: "completed", data: { routes: [] } },
    });
    expect(payload.routes).toEqual([{ route_id: "1" }]);
  });

  it("usa data cuando no hay texto", () => {
    const payload = readToolPayload({
      structuredContent: { status: "completed", data: { count: 3 } },
    });
    expect(payload.count).toBe(3);
  });
});

describe("vehículos y llegadas", () => {
  it("deja la placa y la estimación vacías cuando no vienen", () => {
    const vehicle = toVehicle({
      vehicle_id: "1",
      route_id: "12874",
      license_plate: "  ",
      bearing: null,
      speed_kmh: null,
    });
    expect(vehicle?.licensePlate).toBeNull();
    expect(vehicle?.minutesAway).toBeNull();
    expect(vehicle?.bearing).toBeNull();
  });

  it("cruza el tiempo solo cuando el vehicle_id coincide", () => {
    const base = toVehicle({
      vehicle_id: "41422",
      route_id: "12874",
      license_plate: "FVK633",
      latitude: 4.66,
      longitude: -74.07,
      stop_status: "in_transit_to",
    });
    expect(base).not.toBeNull();
    const [matched, missed] = joinArrivals(
      [
        base!,
        toVehicle({ vehicle_id: "999", route_id: "12874" })!,
      ],
      [{ vehicleId: "41422", minutesAway: 10, predictedAt: "2026-11-05T13:46:00-05:00", delaySeconds: 696 }],
    );
    expect(matched.minutesAway).toBe(10);
    expect(matched.licensePlate).toBe("FVK633");
    expect(missed.minutesAway).toBeNull();
    expect(missed.predictedAt).toBeNull();
  });
});

describe("safeColor", () => {
  it("acepta hex y descarta cualquier otro valor", () => {
    expect(safeColor("#ff0000", "#C23B2E")).toBe("#ff0000");
    expect(safeColor("red; background:url(x)", "#C23B2E")).toBe("#C23B2E");
  });
});
