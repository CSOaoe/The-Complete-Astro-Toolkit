import { DeepSkyTarget, ObserverLocation } from "@/types";

const DAY_MS = 86_400_000;
const SYNODIC_MONTH = 29.53058867;
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14);

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}
function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI;
}
function normaliseDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

export function parseRightAscension(value: string): number {
  const parts = value.match(/[+-]?\d+(?:\.\d+)?/g)?.map(Number);
  if (!parts?.length) throw new Error("Invalid right ascension.");
  return 15 * (parts[0] + (parts[1] ?? 0) / 60 + (parts[2] ?? 0) / 3600);
}

export function parseDeclination(value: string): number {
  const parts = value.match(/[+-]?\d+(?:\.\d+)?/g)?.map(Number);
  if (!parts?.length) throw new Error("Invalid declination.");
  const sign =
    value.trim().startsWith("−") || value.trim().startsWith("-") ? -1 : 1;
  return (
    sign * (Math.abs(parts[0]) + (parts[1] ?? 0) / 60 + (parts[2] ?? 0) / 3600)
  );
}

export function altitudeAt(
  raDegrees: number,
  decDegrees: number,
  observer: Pick<ObserverLocation, "latitude" | "longitude">,
  date: Date,
): number {
  const julianDate = date.getTime() / DAY_MS + 2440587.5;
  const daysFromJ2000 = julianDate - 2451545;
  const sidereal = normaliseDegrees(
    280.46061837 + 360.98564736629 * daysFromJ2000 + observer.longitude,
  );
  let hourAngle = normaliseDegrees(sidereal - raDegrees);
  if (hourAngle > 180) hourAngle -= 360;
  const lat = degreesToRadians(observer.latitude);
  const dec = degreesToRadians(decDegrees);
  const altitude = Math.asin(
    Math.sin(lat) * Math.sin(dec) +
      Math.cos(lat) * Math.cos(dec) * Math.cos(degreesToRadians(hourAngle)),
  );
  return radiansToDegrees(altitude);
}

export function horizontalCoordinates(
  raDegrees: number,
  decDegrees: number,
  observer: Pick<ObserverLocation, "latitude" | "longitude">,
  date: Date,
) {
  const julianDate = date.getTime() / DAY_MS + 2440587.5;
  const sidereal = normaliseDegrees(280.46061837 + 360.98564736629 * (julianDate - 2451545) + observer.longitude);
  let hourAngle = normaliseDegrees(sidereal - raDegrees);
  if (hourAngle > 180) hourAngle -= 360;
  const h = degreesToRadians(hourAngle);
  const lat = degreesToRadians(observer.latitude);
  const dec = degreesToRadians(decDegrees);
  const altitude = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h));
  const azimuth = Math.atan2(-Math.sin(h) * Math.cos(dec), Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(h));
  return { altitudeDegrees: radiansToDegrees(altitude), azimuthDegrees: normaliseDegrees(radiansToDegrees(azimuth)) };
}

export function equatorialCoordinates(
  azimuthDegrees: number,
  altitudeDegrees: number,
  observer: Pick<ObserverLocation, "latitude" | "longitude">,
  date: Date,
) {
  const azimuth = degreesToRadians(azimuthDegrees);
  const altitude = degreesToRadians(altitudeDegrees);
  const latitude = degreesToRadians(observer.latitude);
  const declination = Math.asin(
    Math.sin(altitude) * Math.sin(latitude) +
      Math.cos(altitude) * Math.cos(latitude) * Math.cos(azimuth),
  );
  const hourAngle = Math.atan2(
    -Math.sin(azimuth) * Math.cos(altitude),
    Math.sin(altitude) * Math.cos(latitude) -
      Math.cos(altitude) * Math.sin(latitude) * Math.cos(azimuth),
  );
  const julianDate = date.getTime() / DAY_MS + 2440587.5;
  const sidereal = normaliseDegrees(
    280.46061837 +
      360.98564736629 * (julianDate - 2451545) +
      observer.longitude,
  );
  return {
    raHours: normaliseDegrees(sidereal - radiansToDegrees(hourAngle)) / 15,
    decDegrees: radiansToDegrees(declination),
  };
}

function nightStart(reference: Date): Date {
  const start = new Date(reference);
  if (reference.getHours() < 12) start.setDate(start.getDate() - 1);
  start.setHours(18, 0, 0, 0);
  return start;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export interface TargetVisibility {
  target: DeepSkyTarget;
  currentAltitude: number;
  maximumAltitude: number;
  bestTime: string;
}

export function targetVisibility(
  target: DeepSkyTarget,
  observer: ObserverLocation,
  reference = new Date(),
): TargetVisibility {
  const ra = parseRightAscension(target.ra);
  const dec = parseDeclination(target.dec);
  const start = nightStart(reference);
  let maximumAltitude = -90;
  let peak = start;
  for (let minutes = 0; minutes <= 720; minutes += 10) {
    const at = new Date(start.getTime() + minutes * 60_000);
    const altitude = altitudeAt(ra, dec, observer, at);
    if (altitude > maximumAltitude) {
      maximumAltitude = altitude;
      peak = at;
    }
  }
  const nightEnd = new Date(start.getTime() + 720 * 60_000);
  const windowStart = new Date(
    Math.max(start.getTime(), peak.getTime() - 45 * 60_000),
  );
  const windowEnd = new Date(
    Math.min(nightEnd.getTime(), peak.getTime() + 45 * 60_000),
  );
  return {
    target,
    currentAltitude: altitudeAt(ra, dec, observer, reference),
    maximumAltitude,
    bestTime:
      maximumAltitude < 15
        ? "Not well placed"
        : `${formatTime(windowStart)}–${formatTime(windowEnd)}`,
  };
}

export function bestTargetsTonight(
  targets: DeepSkyTarget[],
  observer: ObserverLocation,
  reference = new Date(),
  limit = 5,
): TargetVisibility[] {
  return targets
    .map((target) => targetVisibility(target, observer, reference))
    .filter((item) => item.maximumAltitude >= 15)
    .sort((a, b) => b.maximumAltitude - a.maximumAltitude)
    .slice(0, limit);
}

export function moonPhase(date = new Date()) {
  const age =
    ((((date.getTime() - NEW_MOON_EPOCH) / DAY_MS) % SYNODIC_MONTH) +
      SYNODIC_MONTH) %
    SYNODIC_MONTH;
  const fraction = age / SYNODIC_MONTH;
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  const names = [
    "New moon",
    "Waxing crescent",
    "First quarter",
    "Waxing gibbous",
    "Full moon",
    "Waning gibbous",
    "Last quarter",
    "Waning crescent",
  ];
  return {
    name: names[Math.round(fraction * 8) % 8],
    illumination: Math.round(illumination * 100),
    rating:
      illumination < 0.25
        ? "EXCELLENT"
        : illumination < 0.55
          ? "GOOD"
          : "BRIGHT",
  };
}
