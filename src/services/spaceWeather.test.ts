import { describe, expect, it } from "vitest";
import { nearestAurora, parseSpaceWeather } from "./spaceWeather";
const location = { latitude: 55, longitude: -2, label: "Test", source: "manual" as const, updatedAt: "" };
describe("NOAA space-weather parsing", () => {
  it("selects the closest wrapped aurora grid point", () => { expect(nearestAurora([[358,55,42],[20,60,5]], location)).toBe(42); });
  it("reads the latest NOAA product rows", () => { const result = parseSpaceWeather(location, [["time","Kp"],["now","5.3"]], [["time","density","speed"],["now","4","520"]], [["time","bx","by","bz"],["now","1","2","-6.5"]], { "Forecast Time": "2026-08-04T22:00:00Z", coordinates: [[358,55,42]] }); expect(result.kp).toBe(5.3); expect(result.solarWindSpeed).toBe(520); expect(result.bz).toBe(-6.5); expect(result.auroraProbability).toBe(42); });
  it("keeps a valid zero Bz reading", () => { const result = parseSpaceWeather(location, [], [], [["time","bx","by","bz"],["now","1","2","0"]], {}); expect(result.bz).toBe(0); });
});
