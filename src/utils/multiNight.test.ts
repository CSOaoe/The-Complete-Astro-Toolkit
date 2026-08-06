import { describe, expect, it } from "vitest";
import { sampleEquipment } from "../data/sample";
import { flatHorizon } from "./horizon";
import { planCampaignNights } from "./multiNight";

describe("multi-night campaign planning", () => {
  it("allocates only the remaining integration time", () => {
    const result = planCampaignNights(
      { id: "x", targetId: "m31", targetName: "M31", rigId: "rig-1", requiredHours: 8, capturedHours: 2, nightsToPlan: 14, createdAt: "" },
      { latitude: 51.5, longitude: 0, label: "Test", source: "manual", updatedAt: "" },
      sampleEquipment,
      flatHorizon,
      new Date("2026-08-01T12:00:00Z"),
    );
    expect(result.reduce((sum, night) => sum + night.allocatedHours, 0)).toBeLessThanOrEqual(6);
    expect(result.every((night) => night.allocatedHours <= 3)).toBe(true);
  });
});
