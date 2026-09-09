import { describe, expect, it } from "vitest";
import { sampleEquipment } from "../data/sample";
import { targets } from "../data/targets";
import { flatHorizon } from "./horizon";
import { parseBackup, validateBackupValue } from "./backup";
import { tangentCoordinate, validComposition } from "./compositions";
import {
  parseHorizonsTrack,
  trackOffset,
  trackingRate,
  trailingLimit,
} from "./cometTrack";
import { generateNightPlan } from "./nightPlan";
import type { ObserverLocation } from "../types";

const observer: ObserverLocation = {
  latitude: 51.48,
  longitude: 0,
  label: "Test",
  source: "manual",
  updatedAt: "2026-09-09T00:00:00Z",
};
describe("portable backups and compositions", () => {
  const backup = () => ({
    format: "AstroToolkit",
    version: 1,
    createdAt: observer.updatedAt,
    data: Object.fromEntries(
      Object.entries({
        equipment: sampleEquipment,
        observer,
        projects: [],
        sessions: [],
        favourites: [],
      }).map(([k, v]) => [`@astrotoolkit/${k}`, JSON.stringify(v)]),
    ),
  });
  it("round-trips equipment and essential user data", () =>
    expect(parseBackup(JSON.stringify(backup())).data).toEqual(backup().data));
  it("rejects unsupported backup versions and keys", () => {
    expect(() =>
      parseBackup(JSON.stringify({ ...backup(), version: 2 })),
    ).toThrow();
    expect(() =>
      parseBackup(
        JSON.stringify({
          ...backup(),
          data: { ...backup().data, secret: "[]" },
        }),
      ),
    ).toThrow();
  });
  it("rejects invalid coordinates and malformed compositions", () => {
    expect(validComposition(null)).toBe(false);
    expect(validComposition({ ra: 0, dec: 0 })).toBe(false);
    expect(
      validateBackupValue("@astrotoolkit/observer", {
        ...observer,
        latitude: 91,
      }),
    ).toBe(false);
    expect(validateBackupValue("@astrotoolkit/compositions", [null])).toBe(
      false,
    );
  });
  it("preserves the centre and wraps RA when panning", () => {
    expect(tangentCoordinate(12, 40, 0, 0).ra).toBeCloseTo(12);
    expect(tangentCoordinate(12, 40, 0, 0).dec).toBeCloseTo(40);
    const moved = tangentCoordinate(23.99, 0, 1, 1);
    expect(moved.ra).toBeGreaterThan(0);
    expect(moved.ra).toBeLessThan(1);
    expect(moved.dec).toBeGreaterThan(0);
  });
});
describe("comet ephemerides", () => {
  it("parses JPL Julian-day CSV coordinates", () => {
    const result = parseHorizonsTrack(
      "header\n$$SOE\n2460000.5, , , 359.9, -12,\n2460000.520833333, , , 0.1, -12,\n$$EOE\nfooter",
    );
    expect(result).toHaveLength(2);
    expect(result[0].ra).toBeCloseTo(359.9 / 15);
    expect(trackOffset(result[1], result[0]).east).toBeCloseTo(
      0.2 * Math.cos((12 * Math.PI) / 180),
    );
    expect(trackingRate(result[0], result[1])).toBeGreaterThan(0);
  });
  it("rejects ambiguous, malformed and non-increasing responses", () => {
    expect(() => parseHorizonsTrack("Multiple matches")).toThrow();
    expect(() => parseHorizonsTrack("$$SOE\n2460000.5,,,x,1\n$$EOE")).toThrow();
    expect(() =>
      parseHorizonsTrack("$$SOE\n2460000.5,,,1,1\n2460000.5,,,1,1\n$$EOE"),
    ).toThrow();
  });
  it("calculates trailing limits without division by zero", () => {
    expect(trailingLimit(0.5, 2, 1)).toBe(4);
    expect(trailingLimit(0, 2, 1)).toBeNull();
    expect(() => trailingLimit(1, -1, 1)).toThrow();
  });
});
describe("automatic night planning", () => {
  const input = {
    targets,
    observer,
    equipment: sampleEquipment,
    horizon: flatHorizon,
    weather: [],
    start: new Date("2026-09-09T21:00:00Z"),
    hours: 6,
    rigId: sampleEquipment.rigs[0].id,
    subSeconds: 180,
  };
  it("keeps capture blocks ordered, non-overlapping and inside available time", () => {
    const plan = generateNightPlan(input);
    expect(plan.blocks.length).toBeGreaterThan(0);
    let end = input.start.getTime();
    let minutes = plan.skippedMinutes;
    for (const b of plan.blocks) {
      expect(Date.parse(b.start)).toBeGreaterThanOrEqual(end);
      end = Date.parse(b.end);
      expect(end).toBeLessThanOrEqual(input.start.getTime() + 21600000);
      expect(b.frames).toBeGreaterThanOrEqual(0);
      minutes += (end - Date.parse(b.start)) / 60000;
    }
    expect(minutes).toBe(360);
  });
  it("rejects missing rigs and invalid duration", () => {
    expect(() => generateNightPlan({ ...input, rigId: "missing" })).toThrow();
    expect(() => generateNightPlan({ ...input, hours: NaN })).toThrow();
  });
  it("excludes daylight and fully obstructed horizons", () => {
    expect(
      generateNightPlan({
        ...input,
        start: new Date("2026-09-09T10:00:00Z"),
        hours: 1,
      }).blocks,
    ).toHaveLength(0);
    expect(
      generateNightPlan({
        ...input,
        horizon: {
          ...flatHorizon,
          enabled: true,
          points: [
            { azimuthDegrees: 0, elevationDegrees: 90 },
            { azimuthDegrees: 180, elevationDegrees: 90 },
          ],
        },
      }).blocks,
    ).toHaveLength(0);
  });
});
