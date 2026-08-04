import { HorizonProfile } from "@/types";

export const flatHorizon: HorizonProfile = {
  enabled: false,
  label: "My observing horizon",
  points: Array.from({ length: 12 }, (_, index) => ({ azimuthDegrees: index * 30, elevationDegrees: 0 })),
  updatedAt: new Date(0).toISOString(),
};

export function horizonElevationAt(profile: HorizonProfile, azimuthDegrees: number) {
  if (!profile.enabled || profile.points.length === 0) return 0;
  const az = ((azimuthDegrees % 360) + 360) % 360;
  const points = [...profile.points].sort((a, b) => a.azimuthDegrees - b.azimuthDegrees);
  const nextIndex = points.findIndex((point) => point.azimuthDegrees >= az);
  const next = nextIndex < 0 ? { ...points[0], azimuthDegrees: points[0].azimuthDegrees + 360 } : points[nextIndex];
  const previous = nextIndex === 0
    ? { ...points[points.length - 1], azimuthDegrees: points[points.length - 1].azimuthDegrees - 360 }
    : nextIndex < 0 ? points[points.length - 1] : points[nextIndex - 1];
  const span = next.azimuthDegrees - previous.azimuthDegrees;
  return previous.elevationDegrees + ((az - previous.azimuthDegrees) / span) * (next.elevationDegrees - previous.elevationDegrees);
}

export function isAboveLocalHorizon(profile: HorizonProfile, azimuthDegrees: number, altitudeDegrees: number, marginDegrees = 3) {
  if (!profile.enabled) return true;
  return altitudeDegrees >= horizonElevationAt(profile, azimuthDegrees) + marginDegrees;
}
