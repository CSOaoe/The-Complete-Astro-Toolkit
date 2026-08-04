import { describe, expect, it } from "vitest";
import { HorizonProfile } from "@/types";
import { horizonElevationAt, isAboveLocalHorizon } from "./horizon";

const profile: HorizonProfile = {
  enabled: true,
  label: "Back garden",
  points: [
    { azimuthDegrees: 0, elevationDegrees: 10 },
    { azimuthDegrees: 90, elevationDegrees: 30 },
    { azimuthDegrees: 180, elevationDegrees: 5 },
    { azimuthDegrees: 270, elevationDegrees: 15 },
  ],
  updatedAt: "2026-08-04T00:00:00.000Z",
};

describe("local horizon", () => {
  it("interpolates between measured directions and wraps through north", () => {
    expect(horizonElevationAt(profile, 45)).toBeCloseTo(20);
    expect(horizonElevationAt(profile, 315)).toBeCloseTo(12.5);
  });

  it("applies the configured safety margin", () => {
    expect(isAboveLocalHorizon(profile, 90, 34)).toBe(true);
    expect(isAboveLocalHorizon(profile, 90, 32)).toBe(false);
  });

  it("does not block targets when the profile is disabled", () => {
    expect(isAboveLocalHorizon({ ...profile, enabled: false }, 90, -5)).toBe(true);
  });
});
