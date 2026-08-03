import { Body, HelioVector } from "astronomy-engine";
import { CometOrbitalElements } from "@/types";

const DEG = Math.PI / 180;
const GAUSSIAN_GRAVITATIONAL_CONSTANT = 0.01720209895;
const J2000_OBLIQUITY = 23.43928 * DEG;

export function julianDate(date: Date) {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

function solveElliptic(meanAnomaly: number, eccentricity: number) {
  let eccentricAnomaly = meanAnomaly;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const delta =
      (eccentricAnomaly -
        eccentricity * Math.sin(eccentricAnomaly) -
        meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
    eccentricAnomaly -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  return eccentricAnomaly;
}

function solveHyperbolic(meanAnomaly: number, eccentricity: number) {
  let hyperbolicAnomaly = Math.asinh(meanAnomaly / eccentricity);
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const delta =
      (eccentricity * Math.sinh(hyperbolicAnomaly) -
        hyperbolicAnomaly -
        meanAnomaly) /
      (eccentricity * Math.cosh(hyperbolicAnomaly) - 1);
    hyperbolicAnomaly -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  return hyperbolicAnomaly;
}

function solveParabolic(daysFromPerihelion: number, perihelionDistanceAu: number) {
  const barker =
    (GAUSSIAN_GRAVITATIONAL_CONSTANT * daysFromPerihelion) /
    Math.sqrt(2 * perihelionDistanceAu ** 3);
  let d = Math.cbrt(3 * barker);
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const delta = (d + d ** 3 / 3 - barker) / (1 + d * d);
    d -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  return d;
}

function heliocentricEcliptic(elements: CometOrbitalElements, jd: number) {
  const e = elements.eccentricity;
  const q = elements.perihelionDistanceAu;
  const days = jd - elements.perihelionJulianDate;
  let trueAnomaly: number;
  let radius: number;

  if (e < 0.9999) {
    const semiMajorAxis = q / (1 - e);
    const meanAnomaly =
      (GAUSSIAN_GRAVITATIONAL_CONSTANT * days) /
      semiMajorAxis ** 1.5;
    const eccentricAnomaly = solveElliptic(meanAnomaly, e);
    trueAnomaly =
      2 *
      Math.atan2(
        Math.sqrt(1 + e) * Math.sin(eccentricAnomaly / 2),
        Math.sqrt(1 - e) * Math.cos(eccentricAnomaly / 2),
      );
    radius = semiMajorAxis * (1 - e * Math.cos(eccentricAnomaly));
  } else if (e > 1.0001) {
    const semiMajorAxis = q / (e - 1);
    const meanAnomaly =
      (GAUSSIAN_GRAVITATIONAL_CONSTANT * days) /
      semiMajorAxis ** 1.5;
    const hyperbolicAnomaly = solveHyperbolic(meanAnomaly, e);
    trueAnomaly =
      2 *
      Math.atan(
        Math.sqrt((e + 1) / (e - 1)) *
          Math.tanh(hyperbolicAnomaly / 2),
      );
    radius = semiMajorAxis * (e * Math.cosh(hyperbolicAnomaly) - 1);
  } else {
    const d = solveParabolic(days, q);
    trueAnomaly = 2 * Math.atan(d);
    radius = q * (1 + d * d);
  }

  const node = elements.ascendingNodeDegrees * DEG;
  const inclination = elements.inclinationDegrees * DEG;
  const argument = elements.argumentOfPerihelionDegrees * DEG;
  const u = argument + trueAnomaly;
  return {
    x:
      radius *
      (Math.cos(node) * Math.cos(u) -
        Math.sin(node) * Math.sin(u) * Math.cos(inclination)),
    y:
      radius *
      (Math.sin(node) * Math.cos(u) +
        Math.cos(node) * Math.sin(u) * Math.cos(inclination)),
    z: radius * Math.sin(u) * Math.sin(inclination),
  };
}

export function cometEquatorialPosition(
  elements: CometOrbitalElements,
  date = new Date(),
) {
  const comet = heliocentricEcliptic(elements, julianDate(date));
  const earthEquatorial = HelioVector(Body.Earth, date);
  const earth = {
    x: earthEquatorial.x,
    y:
      earthEquatorial.y * Math.cos(J2000_OBLIQUITY) +
      earthEquatorial.z * Math.sin(J2000_OBLIQUITY),
    z:
      -earthEquatorial.y * Math.sin(J2000_OBLIQUITY) +
      earthEquatorial.z * Math.cos(J2000_OBLIQUITY),
  };
  const x = comet.x - earth.x;
  const yEcliptic = comet.y - earth.y;
  const zEcliptic = comet.z - earth.z;
  const y =
    yEcliptic * Math.cos(J2000_OBLIQUITY) -
    zEcliptic * Math.sin(J2000_OBLIQUITY);
  const z =
    yEcliptic * Math.sin(J2000_OBLIQUITY) +
    zEcliptic * Math.cos(J2000_OBLIQUITY);
  const rightAscensionRadians = Math.atan2(y, x);
  return {
    raHours:
      ((((rightAscensionRadians * 12) / Math.PI) % 24) + 24) % 24,
    decDegrees: Math.atan2(z, Math.hypot(x, y)) / DEG,
    distanceAu: Math.hypot(x, y, z),
  };
}
