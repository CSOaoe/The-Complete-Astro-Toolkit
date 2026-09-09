import { describe, expect, it } from "vitest";
import { parseForecast, forecastFreshness } from "./forecast";
const now = new Date("2026-09-08T21:00:00Z");
const weather = {
  hourly: {
    time: [now.getTime() / 1000],
    cloud_cover: [0],
    relative_humidity_2m: [30],
    temperature_2m: [10],
    dew_point_2m: [3],
    wind_speed_10m: [0],
    visibility: [20000],
  },
};
describe("forecast reliability", () => {
  it("aligns model time and reverses category into quality without exceeding 100", () => {
    const [hour] = parseForecast(
      weather,
      {
        init: "2026090818",
        dataseries: [{ timepoint: 3, seeing: 1, transparency: 2 }],
      },
      now,
    );
    expect(hour.time).toBe(now.toISOString());
    expect(hour.seeing).toBe(8);
    expect(hour.transparency).toBe(7);
    expect(hour.score).toBeLessThanOrEqual(100);
  });
  it("does not use a model from the wrong day", () => {
    expect(
      parseForecast(
        weather,
        {
          init: "2026090718",
          dataseries: [{ timepoint: 3, seeing: 1, transparency: 1 }],
        },
        now,
      )[0].seeingSource,
    ).toBe("Weather estimate");
  });
  it("rejects missing weather rather than treating null as zero cloud", () => {
    expect(
      parseForecast(
        {
          hourly: {
            ...weather.hourly,
            cloud_cover: [null as unknown as number],
          },
        },
        null,
        now,
      ),
    ).toEqual([]);
  });
  it("flags stale cached data", () => {
    const [hour] = parseForecast(weather, null, now);
    expect(
      forecastFreshness(hour, new Date(now.getTime() + 4 * 3600000)),
    ).toContain("Stale");
  });
});
