import { CatalogueObject } from "@/types";

const SERVICE = "https://alasky.u-strasbg.fr/hips-image-services/hips2fits";

export function targetImageFov(target: CatalogueObject) {
  const sizeDegrees = Math.max(
    (target.majorAxis ?? 20) / 60,
    (target.minorAxis ?? 0) / 60,
  );
  return Math.min(5, Math.max(0.12, sizeDegrees * 1.8));
}

export function surveyImageUrl({
  raHours,
  decDegrees,
  fovDegrees,
  width = 900,
  height = 600,
  rotationDegrees = 0,
}: {
  raHours: number;
  decDegrees: number;
  fovDegrees: number;
  width?: number;
  height?: number;
  rotationDegrees?: number;
}) {
  const params = [
    ["hips", "CDS/P/DSS2/color"],
    ["width", Math.round(width).toString()],
    ["height", Math.round(height).toString()],
    ["fov", Math.min(10, Math.max(0.02, fovDegrees)).toFixed(5)],
    ["projection", "TAN"],
    ["coordsys", "icrs"],
    ["ra", (raHours * 15).toFixed(7)],
    ["dec", decDegrees.toFixed(7)],
    ["rotation_angle", rotationDegrees.toFixed(2)],
    ["format", "jpg"],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return `${SERVICE}?${params}`;
}
