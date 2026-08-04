import { describe, expect, it } from "vitest";
import { parseTle, safestWindows } from "./satelliteTrails";

describe("satellite trail planning", () => {
  it("parses named TLE groups", () => {
    const rows = parseTle("ISS (ZARYA)\n1 25544U 98067A   26200.00000000  .00000000  00000-0  00000-0 0  9999\n2 25544  51.6400 100.0000 0004000 100.0000 200.0000 15.50000000123456");
    expect(rows).toHaveLength(1); expect(rows[0].name).toBe("ISS (ZARYA)");
  });
  it("marks blocks without crossings clear", () => {
    const start = new Date("2026-08-04T22:00:00Z");
    const windows = safestWindows(start, 60, [{ name: "ISS", at: new Date("2026-08-04T22:40:00Z"), separationDegrees: 1, altitudeDegrees: 40, direction: "S" }]);
    expect(windows.map((window) => window.rating)).toEqual(["CLEAR", "CAUTION"]);
  });
});
