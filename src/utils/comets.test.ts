import { describe, expect, it } from "vitest";
import { cometEquatorialPosition, julianDate } from "./comets";

const halley = {
  eccentricity: 0.9679,
  perihelionDistanceAu: 0.575,
  inclinationDegrees: 162.19,
  ascendingNodeDegrees: 59.1,
  argumentOfPerihelionDegrees: 112.24,
  perihelionJulianDate: 2446469.97,
  epochJulianDate: 2439875.5,
};

describe("comet positions", () => {
  it("converts Unix epoch to Julian date", () => {
    expect(julianDate(new Date("1970-01-01T00:00:00Z"))).toBe(2440587.5);
  });

  it("returns a finite normalized sky position for Halley", () => {
    const position = cometEquatorialPosition(
      halley,
      new Date("2026-08-03T00:00:00Z"),
    );
    expect(position.raHours).toBeGreaterThanOrEqual(0);
    expect(position.raHours).toBeLessThan(24);
    expect(position.decDegrees).toBeGreaterThanOrEqual(-90);
    expect(position.decDegrees).toBeLessThanOrEqual(90);
    expect(position.distanceAu).toBeGreaterThan(0);
  });
});
