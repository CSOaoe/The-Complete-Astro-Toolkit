export interface Composition {
  id: string;
  name: string;
  targetId: string;
  rigId: string;
  createdAt: string;
  ra: number;
  dec: number;
  rotation: number;
  focal: number;
  sensorWidth: number;
  sensorHeight: number;
  pixelSize: number;
}
export function validComposition(value: unknown): value is Composition {
  if (!value || typeof value !== "object") return false;
  const c = value as Composition;
  if (
    ![c.id, c.name, c.targetId, c.rigId, c.createdAt].every(
      (v) => typeof v === "string",
    )
  )
    return false;
  return (
    [
      c.ra,
      c.dec,
      c.rotation,
      c.focal,
      c.sensorWidth,
      c.sensorHeight,
      c.pixelSize,
    ].every(Number.isFinite) &&
    c.ra >= 0 &&
    c.ra < 24 &&
    Math.abs(c.dec) <= 89.9 &&
    c.focal > 0 &&
    c.sensorWidth > 0 &&
    c.sensorHeight > 0 &&
    c.pixelSize > 0
  );
}
export function tangentCoordinate(
  ra: number,
  dec: number,
  east: number,
  north: number,
) {
  const rad = Math.PI / 180,
    x = Math.tan(east * rad),
    y = Math.tan(north * rad),
    d = dec * rad;
  const denom = Math.cos(d) - y * Math.sin(d);
  return {
    ra: (((ra + Math.atan2(x, denom) / rad / 15) % 24) + 24) % 24,
    dec: Math.atan2(Math.sin(d) + y * Math.cos(d), Math.hypot(denom, x)) / rad,
  };
}
