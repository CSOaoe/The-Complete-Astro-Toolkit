import { describe, expect, it } from "vitest";
import { surveyImageUrl, targetImageFov } from "./surveyImages";

describe("survey imagery", () => {
  it("builds a coordinate cutout URL", () => {
    const url = surveyImageUrl({
      raHours: 0.7123,
      decDegrees: 41.269,
      fovDegrees: 3,
    });
    expect(url).toContain("hips=CDS%2FP%2FDSS2%2Fcolor");
    expect(url).toContain("ra=10.6845000");
    expect(url).toContain("format=jpg");
  });

  it("keeps target cutouts within useful bounds", () => {
    expect(
      targetImageFov({ majorAxis: 1, minorAxis: null } as never),
    ).toBe(0.12);
    expect(
      targetImageFov({ majorAxis: 600, minorAxis: null } as never),
    ).toBe(5);
  });
});
