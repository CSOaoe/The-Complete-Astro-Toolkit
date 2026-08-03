import { describe, expect, it } from "vitest";
import { targets } from "../data/targets";
import {
  altitudeAt,
  bestTargetsTonight,
  moonPhase,
  parseDeclination,
  parseRightAscension,
} from "./astronomy";

const greenwich = {
  latitude: 51.4769,
  longitude: 0,
  label: "Greenwich",
  source: "manual" as const,
  updatedAt: "2026-08-03T00:00:00.000Z",
};

describe("coordinate parsing", () => {
  it("converts right ascension to degrees", () =>
    expect(parseRightAscension("12h 00m 00s")).toBe(180));
  it("converts negative declination to degrees", () =>
    expect(parseDeclination("−20° 30′ 00″")).toBe(-20.5));
});

describe("observer sky calculations", () => {
  it("keeps altitude equal to declination at the north pole", () => {
    expect(
      altitudeAt(
        120,
        35,
        { latitude: 90, longitude: 0 },
        new Date("2026-08-03T22:00:00Z"),
      ),
    ).toBeCloseTo(35, 8);
  });
  it("returns five location-ranked targets above the planning horizon", () => {
    const result = bestTargetsTonight(
      targets,
      greenwich,
      new Date("2026-08-03T22:00:00Z"),
    );
    expect(result).toHaveLength(5);
    expect(result.every((item) => item.maximumAltitude >= 15)).toBe(true);
    expect(result[0].maximumAltitude).toBeGreaterThanOrEqual(
      result[1].maximumAltitude,
    );
    expect(result.every((item) => !item.bestTime.startsWith("17:"))).toBe(true);
  });
});

describe("moon phase", () => {
  it("recognises the reference new moon", () => {
    expect(moonPhase(new Date("2000-01-06T18:14:00Z"))).toMatchObject({
      name: "New moon",
      illumination: 0,
      rating: "EXCELLENT",
    });
  });
});
