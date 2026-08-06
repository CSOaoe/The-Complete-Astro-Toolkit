import { describe, expect, it } from "vitest";
import { calculatePowerPlan, calculateStoragePlan, dewPointCelsius, sessionTiming } from "./fieldOperations";

describe("field operations", () => {
  it("derates batteries in freezing conditions", () => {
    const result = calculatePowerPlan({ batteryWh: 500, reservePercent: 15, ambientCelsius: -2, durationHours: 6, mountWatts: 12, cameraWatts: 18, computerWatts: 15, dewHeaterWatts: 10, accessoriesWatts: 5 });
    expect(result.coldFactor).toBe(0.7);
    expect(result.runtimeHours).toBeCloseTo(4.96, 1);
    expect(result.sufficient).toBe(false);
  });

  it("calculates storage capacity from exposure cadence", () => {
    const result = calculateStoragePlan({ freeStorageGb: 32, frameSizeMb: 50, exposureSeconds: 180, overheadSeconds: 5, durationHours: 5 });
    expect(result.plannedFrames).toBe(97);
    expect(result.sufficient).toBe(true);
  });

  it("calculates dew point and running session progress", () => {
    expect(dewPointCelsius(10, 80)).toBeCloseTo(6.7, 1);
    const session = { id: "1", date: "2026-08-06", targetId: "m31", targetName: "M31", startTime: "22:00", durationMinutes: 120, locationName: "Site", rigName: "Rig", notes: "", status: "Planned", createdAt: "" } as const;
    const timing = sessionTiming(session, new Date("2026-08-06T23:00:00"));
    expect(timing.state).toBe("running");
    expect(timing.progress).toBe(0.5);
  });
});
