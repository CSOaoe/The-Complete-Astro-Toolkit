import { angularSeparation } from "./planning";
export interface TrackPoint {
  time: string;
  ra: number;
  dec: number;
}
export function parseHorizonsTrack(result: string): TrackPoint[] {
  const body = result.split("$$SOE")[1]?.split("$$EOE")[0];
  if (!body)
    throw new Error(
      "JPL could not resolve this comet uniquely or produce its ephemeris.",
    );
  const points = body
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const columns = line.split(",").map((s) => s.trim());
      const jd = Number(columns[0]),
        ra = Number(columns[3]),
        dec = Number(columns[4]);
      if (
        columns.length < 5 ||
        !columns[3] ||
        !columns[4] ||
        ![jd, ra, dec].every(Number.isFinite) ||
        jd < 2000000 ||
        jd > 3000000 ||
        ra < 0 ||
        ra >= 360 ||
        Math.abs(dec) > 90
      )
        throw new Error("JPL returned an unsupported coordinate row.");
      return {
        time: new Date(Math.round((jd - 2440587.5) * 86400000)).toISOString(),
        ra: ra / 15,
        dec,
      };
    });
  if (
    points.length < 2 ||
    points.some(
      (p, i) => i > 0 && Date.parse(p.time) <= Date.parse(points[i - 1].time),
    )
  )
    throw new Error("JPL returned an incomplete time sequence.");
  return points;
}
export function trackingRate(a: TrackPoint, b: TrackPoint) {
  const seconds = (Date.parse(b.time) - Date.parse(a.time)) / 1000;
  if (!(seconds > 0)) throw new Error("Track times must increase.");
  return (angularSeparation(a.ra, a.dec, b.ra, b.dec) * 3600) / seconds;
}
export function trailingLimit(
  rateArcsecSecond: number,
  scaleArcsecPixel: number,
  tolerancePixels: number,
) {
  if (
    ![rateArcsecSecond, scaleArcsecPixel, tolerancePixels].every(
      Number.isFinite,
    ) ||
    rateArcsecSecond < 0 ||
    scaleArcsecPixel <= 0 ||
    tolerancePixels <= 0
  )
    throw new Error("Enter positive pixel scale and trailing tolerance.");
  return rateArcsecSecond < 1e-8
    ? null
    : (scaleArcsecPixel * tolerancePixels) / rateArcsecSecond;
}
export function trackOffset(point: TrackPoint, origin: TrackPoint) {
  const delta = (((point.ra - origin.ra) * 15 + 540) % 360) - 180;
  return {
    east: delta * Math.cos((origin.dec * Math.PI) / 180),
    north: point.dec - origin.dec,
  };
}
