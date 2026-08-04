import { describe, expect, it } from "vitest";
import { analyseVCurve, criticalFocusZone } from "./focus";
describe("focus planning", () => { it("calculates a wider focus zone for slower optics", () => { expect(criticalFocusZone(8)).toBeGreaterThan(criticalFocusZone(4)); }); it("finds the intersection of a balanced V-curve", () => { const result = analyseVCurve([960,980,1000,1020,1040,1060,1080],[4,3,2.2,1.8,2.2,3,4]); expect(result.bestPosition).toBeCloseTo(1020, -1); expect(result.symmetry).toBeGreaterThan(0.8); }); });
