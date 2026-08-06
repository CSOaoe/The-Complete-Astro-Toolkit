import { describe, expect, it } from "vitest";
import {
  angularSeparation,
  exposurePlan,
  exposureRecommendation,
  postProcessWorkflow,
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

describe("post-processing workflow", () => {
  it("adapts PixInsight steps to gradients and narrowband data", () => {
    const steps = postProcessWorkflow({ software: "PixInsight", data: "Mono", target: "Nebula", narrowband: true, gradients: true, noise: false, stars: false });
    expect(steps.some((step) => step.includes("DynamicBackgroundExtraction"))).toBe(true);
    expect(steps.some((step) => step.toLowerCase().includes("narrowband"))).toBe(true);
  });

  it("uses software-specific Siril steps", () => {
    const steps = postProcessWorkflow({ software: "Siril", data: "OSC", target: "Galaxy", narrowband: false, gradients: true, noise: true, stars: true });
    expect(steps.some((step) => step.includes("Photometric Colour Calibration"))).toBe(true);
    expect(steps.some((step) => step.includes("StarNet"))).toBe(true);
  });
});
