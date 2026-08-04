import { describe, expect, it } from "vitest";
import { analyseRgba } from "./imageQuality";

function synthetic(width: number, height: number, stretched = false) {
  const data = new Uint8Array(width * height * 4).fill(18);
  for (let i = 0; i < width * height; i += 1) data[i * 4 + 3] = 255;
  for (let star = 0; star < 20; star += 1) { const x = 8 + (star * 11) % (width - 16); const y = 8 + (star * 17) % (height - 16); for (let dy = -1; dy <= 1; dy += 1) for (let dx = stretched ? -3 : -1; dx <= (stretched ? 3 : 1); dx += 1) { const offset = ((y + dy) * width + x + dx) * 4; data[offset] = data[offset + 1] = data[offset + 2] = dx === 0 && dy === 0 ? 245 : 150; } }
  return data;
}
describe("image quality analysis", () => {
  it("measures stars and returns a bounded score", () => { const result = analyseRgba(synthetic(128, 96), 128, 96); expect(result.starCount).toBeGreaterThan(5); expect(result.score).toBeGreaterThanOrEqual(0); expect(result.score).toBeLessThanOrEqual(100); });
  it("penalises elongated stars", () => { const round = analyseRgba(synthetic(128, 96), 128, 96); const stretched = analyseRgba(synthetic(128, 96, true), 128, 96); expect(stretched.eccentricity).toBeGreaterThan(round.eccentricity); });
});
