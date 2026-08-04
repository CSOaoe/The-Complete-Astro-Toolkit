import { describe, expect, it } from "vitest";
import { sampleEquipment } from "../data/sample";
import { targets } from "../data/targets";
import { ObserverLocation } from "../types";
import { scoreTargetAt, smartNightSchedule } from "./smartPlanning";

const observer: ObserverLocation = { latitude: 51.48, longitude: 0, label: "Test", source: "manual", updatedAt: "2026-01-01T00:00:00Z" };
const at = new Date("2026-08-15T23:00:00Z");

describe("smart planning", () => {
  it("keeps target scores in a 0–100 range", () => {
    const result = scoreTargetAt(targets[0], observer, [], sampleEquipment, at);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.reasons).toHaveLength(4);
  });
  it("rewards a stronger forecast at the same time", () => {
    const poor = scoreTargetAt(targets[0], observer, [{ time: at.toISOString(), cloud: 100, humidity: 90, temperature: 10, dewPoint: 9, wind: 20, visibility: 2, seeing: 1, transparency: 1, score: 10 }], sampleEquipment, at);
    const clear = scoreTargetAt(targets[0], observer, [{ time: at.toISOString(), cloud: 0, humidity: 30, temperature: 10, dewPoint: 2, wind: 2, visibility: 30, seeing: 8, transparency: 8, score: 95 }], sampleEquipment, at);
    expect(clear.score).toBeGreaterThan(poor.score);
  });
  it("builds an ordered schedule", () => {
    const schedule = smartNightSchedule(targets, observer, [], sampleEquipment, at);
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule.every((item, index) => index === 0 || item.start > schedule[index - 1].start)).toBe(true);
  });
});
