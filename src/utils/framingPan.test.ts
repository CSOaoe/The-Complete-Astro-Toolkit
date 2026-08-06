import { describe, expect, it } from "vitest";
import { clampPanOffset, coordinateForPan } from "./framingPan";

describe("visual framing pan", () => {
  it("keeps a cumulative two-axis position within the survey overscan", () => {
    const clamped = clampPanOffset({ x: 300, y: -200 }, 300, 200);
    expect(clamped.x).toBeCloseTo(180);
    expect(clamped.y).toBeCloseTo(-120);
  });

  it("turns the retained image offset into a new reticle coordinate", () => {
    const moved = coordinateForPan(
      { ra: 10, dec: 30 },
      { x: 75, y: -50 },
      2,
      1,
      300,
      200,
    );
    expect(moved.ra).toBeLessThan(10);
    expect(moved.dec).toBeCloseTo(29.75);
  });
});
