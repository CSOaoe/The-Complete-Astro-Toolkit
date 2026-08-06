import { Camera, Telescope } from "../types";
import { fieldOfView, pixelScale } from "../utils/calculations";

export interface CorrectorProfile {
  id: string;
  name: string;
  requiredBackFocusMm: number;
  imageCircleMm: number;
  telescopeThread: string;
  cameraThread: string;
  reductionFactor: number;
}

export const correctorProfiles: CorrectorProfile[] = [
  { id: "generic-flattener-55", name: "Standard refractor flattener", requiredBackFocusMm: 55, imageCircleMm: 44, telescopeThread: "M54", cameraThread: "M48", reductionFactor: 1 },
  { id: "generic-reducer-055", name: "0.8× refractor reducer", requiredBackFocusMm: 55, imageCircleMm: 42, telescopeThread: "M54", cameraThread: "M48", reductionFactor: 0.8 },
  { id: "large-reducer", name: "Large-format 0.75× reducer", requiredBackFocusMm: 55, imageCircleMm: 52, telescopeThread: "M68", cameraThread: "M54", reductionFactor: 0.75 },
  { id: "sct-reducer", name: "SCT 0.63× reducer", requiredBackFocusMm: 105, imageCircleMm: 27, telescopeThread: "SCT 2-inch", cameraThread: "SCT 2-inch", reductionFactor: 0.63 },
  { id: "newtonian-coma", name: "Newtonian coma corrector", requiredBackFocusMm: 55, imageCircleMm: 30, telescopeThread: "2-inch barrel", cameraThread: "M48", reductionFactor: 1 },
];

export function sensorDiagonal(camera: Camera) {
  return Math.hypot(camera.sensorWidth, camera.sensorHeight);
}

export function recommendedFilterSize(camera: Camera) {
  const diagonal = sensorDiagonal(camera);
  if (diagonal <= 16) return "1.25-inch / 31 mm";
  if (diagonal <= 22) return "31 mm unmounted";
  if (diagonal <= 28) return "36 mm unmounted";
  return "2-inch / 50 mm unmounted";
}

export function evaluateRigCompatibility(
  telescope: Telescope,
  camera: Camera,
  corrector: CorrectorProfile,
) {
  const diagonal = sensorDiagonal(camera);
  const effectiveFocalLength = telescope.focalLength * corrector.reductionFactor;
  const effectiveFocalRatio = telescope.focalRatio * corrector.reductionFactor;
  const imageCircleMargin = corrector.imageCircleMm - diagonal;
  return {
    diagonal,
    imageCircleMargin,
    imageCircleStatus: imageCircleMargin >= 4 ? "Comfortable" : imageCircleMargin >= 0 ? "Tight" : "Vignetting likely",
    effectiveFocalLength,
    effectiveFocalRatio,
    pixelScale: pixelScale(camera.pixelSize, effectiveFocalLength),
    horizontalFov: fieldOfView(camera.sensorWidth, effectiveFocalLength),
    verticalFov: fieldOfView(camera.sensorHeight, effectiveFocalLength),
    filterSize: recommendedFilterSize(camera),
  };
}
