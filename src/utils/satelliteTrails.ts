import * as satellite from "satellite.js";
import { ObserverLocation } from "@/types";
import { horizontalCoordinates } from "./astronomy";

export interface SatelliteTle { name: string; line1: string; line2: string; }
export interface TrailRisk { name: string; at: Date; separationDegrees: number; altitudeDegrees: number; direction: string; }

export function parseTle(text: string): SatelliteTle[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const result: SatelliteTle[] = [];
  for (let index = 0; index < lines.length;) {
    if (lines[index].startsWith("1 ") && lines[index + 1]?.startsWith("2 ")) {
      result.push({ name: `NORAD ${lines[index].slice(2, 7).trim()}`, line1: lines[index], line2: lines[index + 1] }); index += 2;
    } else if (lines[index + 1]?.startsWith("1 ") && lines[index + 2]?.startsWith("2 ")) {
      result.push({ name: lines[index].replace(/^0 /, ""), line1: lines[index + 1], line2: lines[index + 2] }); index += 3;
    } else index += 1;
  }
  return result;
}

function angleBetween(az1: number, alt1: number, az2: number, alt2: number) {
  const rad = Math.PI / 180;
  const cosine = Math.sin(alt1 * rad) * Math.sin(alt2 * rad) + Math.cos(alt1 * rad) * Math.cos(alt2 * rad) * Math.cos((az1 - az2) * rad);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) / rad;
}
function compass(azimuth: number) { return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((((azimuth % 360) + 360) % 360) / 45) % 8]; }

export function predictTrailRisks({ tles, observer, targetRaHours, targetDecDegrees, start, durationMinutes, frameWidthDegrees, frameHeightDegrees }: { tles: SatelliteTle[]; observer: ObserverLocation; targetRaHours: number; targetDecDegrees: number; start: Date; durationMinutes: number; frameWidthDegrees: number; frameHeightDegrees: number; }) {
  const threshold = Math.sqrt(frameWidthDegrees ** 2 + frameHeightDegrees ** 2) / 2 + 0.35;
  const observerGd = { latitude: satellite.degreesToRadians(observer.latitude), longitude: satellite.degreesToRadians(observer.longitude), height: 0 };
  const risks: TrailRisk[] = [];
  for (const tle of tles) {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    let closest: TrailRisk | null = null;
    for (let minute = 0; minute <= durationMinutes; minute += 1) {
      const at = new Date(start.getTime() + minute * 60_000);
      const propagated = satellite.propagate(satrec, at);
      if (!propagated || !propagated.position || typeof propagated.position === "boolean") continue;
      const look = satellite.ecfToLookAngles(observerGd, satellite.eciToEcf(propagated.position, satellite.gstime(at)));
      const altitude = satellite.radiansToDegrees(look.elevation);
      if (altitude <= 0) continue;
      const azimuth = satellite.radiansToDegrees(look.azimuth);
      const target = horizontalCoordinates(targetRaHours * 15, targetDecDegrees, observer, at);
      const separation = angleBetween(azimuth, altitude, target.azimuthDegrees, target.altitudeDegrees);
      if (separation <= threshold && (!closest || separation < closest.separationDegrees)) closest = { name: tle.name, at, separationDegrees: separation, altitudeDegrees: altitude, direction: compass(azimuth) };
    }
    if (closest) risks.push(closest);
  }
  return risks.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function safestWindows(start: Date, durationMinutes: number, risks: TrailRisk[], blockMinutes = 30) {
  return Array.from({ length: Math.ceil(durationMinutes / blockMinutes) }, (_, index) => {
    const blockStart = new Date(start.getTime() + index * blockMinutes * 60_000);
    const blockEnd = new Date(Math.min(start.getTime() + durationMinutes * 60_000, blockStart.getTime() + blockMinutes * 60_000));
    const count = risks.filter((risk) => risk.at >= blockStart && risk.at < blockEnd).length;
    return { start: blockStart, end: blockEnd, count, rating: count === 0 ? "CLEAR" as const : count <= 2 ? "CAUTION" as const : "BUSY" as const };
  });
}
