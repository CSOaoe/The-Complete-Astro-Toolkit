import { describe, expect, it } from "vitest";
import { mosaicDimensions, mosaicPanels } from "./mosaic";

describe("mosaic planner", () => {
  it("accounts for overlap", () => {
    expect(mosaicDimensions(2, 1, 3, 2, 20)).toEqual({ width: 5.2, height: 1.8 });
  });
  it("centres a one-panel plan", () => {
    const [panel] = mosaicPanels({ centerRaHours: 10, centerDecDegrees: 20, panelWidthDegrees: 2, panelHeightDegrees: 1, columns: 1, rows: 1, overlapPercent: 15 });
    expect(panel.raHours).toBeCloseTo(10);
    expect(panel.decDegrees).toBeCloseTo(20);
  });
  it("creates every requested panel", () => {
    expect(mosaicPanels({ centerRaHours: 1, centerDecDegrees: 0, panelWidthDegrees: 2, panelHeightDegrees: 1, columns: 3, rows: 2, overlapPercent: 10 }).length).toBe(6);
  });
});
