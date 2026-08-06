import { describe, expect, it } from "vitest";
import { buildIntelligentAlerts } from "./intelligentAlerts";

describe("intelligent alerts", () => {
  it("detects clear sky and dew risk", () => {
    const alerts = buildIntelligentAlerts([{ time: "2026-08-06T22:00:00Z", cloud: 5, humidity: 95, temperature: 8, dewPoint: 7, wind: 4, visibility: 20, seeing: 7, transparency: 7, score: 90 }], null, []);
    expect(alerts.some((alert) => alert.id === "clear")).toBe(true);
    expect(alerts.some((alert) => alert.id === "dew")).toBe(true);
  });
});
