import { describe, expect, it } from "vitest";
import {
  angularSeparation,
  exposurePlan,
  exposureRecommendation,
  pixInsightWorkflow,
} from "./planning";

describe("moon separation geometry", () => {
  it("returns zero for identical coordinates", () => {
    expect(angularSeparation(5, -20, 5, -20)).toBeCloseTo(0, 7);
  });

  it("returns 90 degrees for a six-hour equatorial RA difference", () => {
    expect(angularSeparation(0, 0, 6, 0)).toBeCloseTo(90, 8);
  });
});

describe("exposure planning", () => {
  it("calculates a finite positive subexposure", () => {
    expect(exposureRecommendation(1.5, 0.15, 5)).toBeCloseTo(146.34, 1);
  });

  it("rounds frame count upward to meet total integration", () => {
    expect(exposurePlan(180, 1.05)).toEqual({ count: 21, totalSeconds: 3780 });
  });

  it("rejects invalid camera inputs", () => {
    expect(() => exposureRecommendation(0, 0.1, 5)).toThrow();
  });
});

describe("PixInsight workflow", () => {
  it("adapts steps to gradients and narrowband data", () => {
    const steps = pixInsightWorkflow({ data: "Mono", target: "Nebula", narrowband: true, gradients: true, noise: false, stars: false });
    expect(steps.some((step) => step.includes("DynamicBackgroundExtraction"))).toBe(true);
    expect(steps.some((step) => step.includes("Narrowband"))).toBe(true);
  });
});
