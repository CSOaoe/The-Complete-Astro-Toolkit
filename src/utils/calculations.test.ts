import { describe, expect, it } from "vitest";
import {
  fieldOfView,
  formatDuration,
  pixelScale,
  totalIntegrationSeconds,
} from "./calculations";

describe("fieldOfView", () => {
  it("calculates a horizontal field in degrees", () => {
    expect(fieldOfView(23.5, 480)).toBeCloseTo(2.8045, 3);
  });
  it("calculates a vertical field in degrees", () => {
    expect(fieldOfView(15.7, 480)).toBeCloseTo(1.874, 3);
  });
  it("rejects invalid inputs", () => {
    expect(() => fieldOfView(0, 480)).toThrow();
    expect(() => fieldOfView(23.5, -1)).toThrow();
  });
});

describe("pixelScale", () => {
  it("calculates arcseconds per pixel", () => {
    expect(pixelScale(3.76, 480)).toBeCloseTo(1.6157, 3);
  });
  it("rejects invalid inputs", () =>
    expect(() => pixelScale(Number.NaN, 480)).toThrow());
});

describe("integration time", () => {
  it("multiplies exposure length by count", () =>
    expect(totalIntegrationSeconds(180, 40)).toBe(7200));
  it("formats hours, minutes and seconds", () =>
    expect(formatDuration(7384)).toBe("2h 3m 4s"));
  it("rejects negative values", () =>
    expect(() => totalIntegrationSeconds(-1, 10)).toThrow());
});
