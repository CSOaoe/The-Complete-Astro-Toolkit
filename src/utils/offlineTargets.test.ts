import { describe, expect, it } from "vitest";
import { collectOfflineTargets } from "./offlineTargets";

describe("offline field pack", () => {
  it("deduplicates favourite and planned targets", () => {
    const session = { id: "s", date: "2026-08-06", targetId: "m31", targetName: "M31", startTime: "22:00", durationMinutes: 120, locationName: "Site", rigName: "Rig", notes: "", status: "Planned", createdAt: "" } as const;
    const result = collectOfflineTargets(["m31", "m42"], [session]);
    expect(result.map((target) => target.id)).toEqual(["m31", "m42"]);
  });
});
