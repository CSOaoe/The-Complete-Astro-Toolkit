import { DeepSkyTarget, EquipmentState, HorizonProfile, ObserverLocation } from "@/types";
import { WeatherHour } from "@/services/weather";
import { horizontalCoordinates, moonPhase, parseDeclination, parseRightAscension } from "./astronomy";
import { flatHorizon, horizonElevationAt, isAboveLocalHorizon } from "./horizon";
import { fieldOfView } from "./calculations";
import { moonDistance } from "./planning";

export interface SmartTargetScore {
  target: DeepSkyTarget;
  score: number;
  altitude: number;
  azimuth: number;
  localHorizon: number;
  horizonClear: boolean;
  moonSeparation: number;
  weatherScore: number | null;
  equipmentFit: number;
  reasons: string[];
  at: Date;
}

export interface SmartScheduleBlock extends SmartTargetScore {
  start: Date;
  end: Date;
}

function nearestWeather(weather: WeatherHour[], at: Date) {
  return weather.reduce<WeatherHour | null>((closest, hour) => {
    if (!closest) return hour;
    return Math.abs(new Date(hour.time).getTime() - at.getTime()) < Math.abs(new Date(closest.time).getTime() - at.getTime()) ? hour : closest;
  }, null);
}

function targetSizeDegrees(value: string) {
  const numbers = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [30];
  const unit = value.includes("°") || value.includes("Â°") ? 1 : 1 / 60;
  return Math.max(...numbers) * unit;
}

function equipmentFit(target: DeepSkyTarget, equipment: EquipmentState) {
  const rig = equipment.rigs[0];
  const scope = equipment.telescopes.find((item) => item.id === rig?.telescopeId);
  const camera = equipment.cameras.find((item) => item.id === rig?.cameraId);
  if (!scope || !camera) return 5;
  const frame = Math.min(fieldOfView(camera.sensorWidth, scope.focalLength), fieldOfView(camera.sensorHeight, scope.focalLength));
  const ratio = targetSizeDegrees(target.apparentSize) / frame;
  return ratio >= 0.12 && ratio <= 0.9 ? 10 : ratio <= 1.5 ? 7 : 3;
}

export function scoreTargetAt(target: DeepSkyTarget, observer: ObserverLocation, weather: WeatherHour[], equipment: EquipmentState, at: Date, horizon: HorizonProfile = flatHorizon): SmartTargetScore {
  const raDegrees = parseRightAscension(target.ra);
  const dec = parseDeclination(target.dec);
  const horizontal = horizontalCoordinates(raDegrees, dec, observer, at);
  const altitude = horizontal.altitudeDegrees;
  const localHorizon = horizonElevationAt(horizon, horizontal.azimuthDegrees);
  const horizonClear = isAboveLocalHorizon(horizon, horizontal.azimuthDegrees, altitude);
  const weatherPoint = nearestWeather(weather, at);
  const weatherScore = weatherPoint?.score ?? null;
  const separation = moonDistance(raDegrees / 15, dec, at, observer);
  const illumination = moonPhase(at).illumination / 100;
  const altitudePoints = Math.max(0, Math.min(35, ((altitude - 10) / 60) * 35));
  const weatherPoints = weatherScore === null ? 18 : (Math.max(0, Math.min(100, weatherScore)) / 100) * 30;
  const safeMoonDistance = 30 + illumination * 60;
  const moonPoints = Math.min(25, (separation / safeMoonDistance) * 25);
  const fit = equipmentFit(target, equipment);
  const score = Math.round(Math.max(0, Math.min(100, altitudePoints + weatherPoints + moonPoints + fit - (horizonClear ? 0 : 45))));
  const reasons = [
    !horizonClear ? `Blocked by your ${Math.round(localHorizon)}° local horizon` : altitude >= 50 ? "High in your sky" : altitude >= 25 ? "Usable altitude" : "Low on the horizon",
    weatherScore === null ? "Weather not loaded" : weatherScore >= 70 ? "Strong forecast window" : weatherScore >= 45 ? "Mixed forecast" : "Cloud risk",
    separation >= safeMoonDistance ? "Comfortably away from the Moon" : "Moon may reduce contrast",
    fit >= 9 ? "Good fit for your rig" : fit >= 6 ? "Workable framing" : "May need a mosaic or different focal length",
  ];
  return { target, score, altitude, azimuth: horizontal.azimuthDegrees, localHorizon, horizonClear, moonSeparation: separation, weatherScore, equipmentFit: fit, reasons, at };
}

export function smartTargetsTonight(targets: DeepSkyTarget[], observer: ObserverLocation, weather: WeatherHour[], equipment: EquipmentState, reference = new Date(), limit = 5, horizon: HorizonProfile = flatHorizon) {
  const start = new Date(reference);
  if (reference.getHours() < 12) start.setDate(start.getDate() - 1);
  start.setHours(20, 0, 0, 0);
  return targets.map((target) => {
    let best = scoreTargetAt(target, observer, weather, equipment, start, horizon);
    for (let hours = 1; hours <= 10; hours += 1) {
      const candidate = scoreTargetAt(target, observer, weather, equipment, new Date(start.getTime() + hours * 3_600_000), horizon);
      if (candidate.score > best.score) best = candidate;
    }
    return best;
  }).filter((item) => item.altitude >= 15 && item.horizonClear).sort((a, b) => b.score - a.score).slice(0, limit);
}

export function smartNightSchedule(targets: DeepSkyTarget[], observer: ObserverLocation, weather: WeatherHour[], equipment: EquipmentState, reference = new Date(), horizon: HorizonProfile = flatHorizon) {
  const start = new Date(reference);
  if (reference.getHours() < 12) start.setDate(start.getDate() - 1);
  start.setHours(20, 0, 0, 0);
  let previous = "";
  return Array.from({ length: 5 }, (_, index) => {
    const at = new Date(start.getTime() + index * 2 * 3_600_000);
    const ranked = targets.map((target) => scoreTargetAt(target, observer, weather, equipment, at, horizon)).filter((item) => item.altitude >= 15 && item.horizonClear).sort((a, b) => b.score - a.score);
    const chosen = ranked.find((item) => item.target.id !== previous) ?? ranked[0];
    if (!chosen) return null;
    previous = chosen.target.id;
    return { ...chosen, start: at, end: new Date(at.getTime() + 2 * 3_600_000) };
  }).filter((item): item is SmartScheduleBlock => item !== null);
}
