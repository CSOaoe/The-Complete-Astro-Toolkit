import { describe, expect, it } from "vitest";
import { analyseEquipmentTrain, samplingAssessment } from "./equipmentTrain";

describe("equipment train analysis", () => {
  it("recognises a matched train", () => {
    const result = analyseEquipmentTrain(55, [
      { id: "camera", name: "Camera", thicknessMm: 17.5 },
      { id: "wheel", name: "Filter wheel", thicknessMm: 20 },
      { id: "spacer", name: "Spacer", thicknessMm: 17.5 },
    ]);
    expect(result.status).toBe("Matched");
    expect(result.remainingMm).toBe(0);
  });

  it("reports spacing still required", () => {
    expect(
      analyseEquipmentTrain(55, [
        { id: "camera", name: "Camera", thicknessMm: 17.5 },
      ]).status,
    ).toBe("Needs spacing");
  });

  it("assesses imaging scale", () => {
    expect(samplingAssessment(1.5)).toContain("Balanced");
  });
});
