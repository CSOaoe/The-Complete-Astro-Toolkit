export function fieldOfView(
  sensorDimensionMm: number,
  focalLengthMm: number,
): number {
  if (
    !Number.isFinite(sensorDimensionMm) ||
    !Number.isFinite(focalLengthMm) ||
    sensorDimensionMm <= 0 ||
    focalLengthMm <= 0
  ) {
    throw new Error(
      "Sensor dimension and focal length must be positive numbers.",
    );
  }
  return (
    2 * Math.atan(sensorDimensionMm / (2 * focalLengthMm)) * (180 / Math.PI)
  );
}

export function pixelScale(
  pixelSizeMicrons: number,
  focalLengthMm: number,
): number {
  if (
    !Number.isFinite(pixelSizeMicrons) ||
    !Number.isFinite(focalLengthMm) ||
    pixelSizeMicrons <= 0 ||
    focalLengthMm <= 0
  ) {
    throw new Error("Pixel size and focal length must be positive numbers.");
  }
  return (206.265 * pixelSizeMicrons) / focalLengthMm;
}

export function totalIntegrationSeconds(
  exposureLength: number,
  exposureCount: number,
): number {
  if (
    !Number.isFinite(exposureLength) ||
    !Number.isFinite(exposureCount) ||
    exposureLength < 0 ||
    exposureCount < 0
  ) {
    throw new Error("Exposure values cannot be negative.");
  }
  return exposureLength * exposureCount;
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m ${seconds % 60}s`;
}
