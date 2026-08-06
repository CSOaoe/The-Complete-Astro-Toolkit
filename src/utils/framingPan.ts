export interface SkyCoordinate {
  ra: number;
  dec: number;
}

export interface PanOffset {
  x: number;
  y: number;
}

const wrapRa = (hours: number) => ((hours % 24) + 24) % 24;
const clampDec = (degrees: number) => Math.max(-89.9, Math.min(89.9, degrees));

export function clampPanOffset(
  offset: PanOffset,
  frameWidth: number,
  frameHeight: number,
  overscan = 2.2,
): PanOffset {
  const extra = Math.max(0, (overscan - 1) / 2);
  return {
    x: Math.max(-frameWidth * extra, Math.min(frameWidth * extra, offset.x)),
    y: Math.max(-frameHeight * extra, Math.min(frameHeight * extra, offset.y)),
  };
}

export function coordinateForPan(
  origin: SkyCoordinate,
  offset: PanOffset,
  horizontalFov: number,
  verticalFov: number,
  frameWidth: number,
  frameHeight: number,
): SkyCoordinate {
  const cosDec = Math.max(0.12, Math.cos((origin.dec * Math.PI) / 180));
  return {
    ra: wrapRa(origin.ra - ((offset.x / frameWidth) * horizontalFov) / (15 * cosDec)),
    dec: clampDec(origin.dec + (offset.y / frameHeight) * verticalFov),
  };
}
