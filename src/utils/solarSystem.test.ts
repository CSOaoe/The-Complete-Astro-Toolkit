import { describe, expect, it } from "vitest";
import { Body } from "astronomy-engine";
import { bodyImagingSummary } from "./solarSystem";
describe("solar-system imaging", () => { it("returns topocentric body details", () => { const result = bodyImagingSummary(Body.Jupiter, { latitude: 51.5, longitude: 0, label: "Test", source: "manual", updatedAt: "" }, new Date("2026-08-04T22:00:00Z")); expect(Number.isFinite(result.altitude)).toBe(true); expect(result.mode).toContain("RGB"); }); });
