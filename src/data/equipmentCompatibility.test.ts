import { describe, expect, it } from "vitest";
import { sampleEquipment } from "./sample";
import { correctorProfiles, evaluateRigCompatibility, recommendedFilterSize } from "./equipmentCompatibility";

describe("equipment compatibility", () => {
  it("checks image circle and reduced focal length", () => {
    const result = evaluateRigCompatibility(sampleEquipment.telescopes[0], sampleEquipment.cameras[0], correctorProfiles[1]);
    expect(result.effectiveFocalLength).toBe(384);
    expect(result.imageCircleMargin).toBeGreaterThan(0);
  });

  it("recommends a filter size for APS-C", () => {
    expect(recommendedFilterSize(sampleEquipment.cameras[0])).toContain("2-inch");
  });
});
