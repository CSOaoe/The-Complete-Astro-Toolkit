import { Body, Equator, Horizon, Observer } from "astronomy-engine";
import type {
  DeepSkyTarget,
  EquipmentState,
  HorizonProfile,
  ObserverLocation,
} from "../types";
import type { WeatherHour } from "../services/weather";
import { scoreTargetAt } from "./smartPlanning";
import { parseDeclination, parseRightAscension } from "./astronomy";
import { fieldOfView } from "./calculations";

export interface NightBlock {
  targetId: string;
  targetName: string;
  start: string;
  end: string;
  ra: number;
  dec: number;
  reasons: string[];
  score: number;
  filters: string[];
  subSeconds: number;
  frames: number;
  fov: string;
}
export function generateNightPlan(input: {
  targets: DeepSkyTarget[];
  observer: ObserverLocation;
  equipment: EquipmentState;
  horizon: HorizonProfile;
  weather: WeatherHour[];
  start: Date;
  hours: number;
  rigId: string;
  subSeconds: number;
}) {
  const { targets, observer, horizon, start, hours, subSeconds } = input;
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(hours) ||
    hours < 1 ||
    hours > 16 ||
    !Number.isFinite(subSeconds) ||
    subSeconds < 1 ||
    subSeconds > 3600
  )
    throw new Error(
      "Choose 1–16 hours and a sub-exposure between 1 and 3600 seconds.",
    );
  const rig = input.equipment.rigs.find((r) => r.id === input.rigId);
  const scope = input.equipment.telescopes.find(
      (s) => s.id === rig?.telescopeId,
    ),
    camera = input.equipment.cameras.find((c) => c.id === rig?.cameraId);
  if (!rig || !scope || !camera)
    throw new Error("Choose a rig with a telescope and camera in Equipment.");
  const equipment = { ...input.equipment, rigs: [rig] };
  const fov = `${fieldOfView(camera.sensorWidth, scope.focalLength).toFixed(2)}° × ${fieldOfView(camera.sensorHeight, scope.focalLength).toFixed(2)}°`;
  const site = new Observer(observer.latitude, observer.longitude, 0);
  const blocks: NightBlock[] = [];
  const endMs = start.getTime() + hours * 3600000;
  let skippedMinutes = (hours * 60) % 30;
  for (let at = start.getTime(); at + 1800000 <= endMs; at += 1800000) {
    const times = [0, 15, 30].map((m) => new Date(at + m * 60000));
    if (
      times.some((t) => {
        const sun = Equator(Body.Sun, t, site, true, true);
        return Horizon(t, site, sun.ra, sun.dec, "normal").altitude > -12;
      })
    ) {
      skippedMinutes += 30;
      continue;
    }
    const relevantWeather = input.weather.filter(
      (w) =>
        times.some(
          (t) => Math.abs(Date.parse(w.time) - t.getTime()) <= 3600000,
        ) &&
        (!w.fetchedAt || Date.now() - Date.parse(w.fetchedAt) < 10800000),
    );
    const previous = blocks[blocks.length - 1];
    const ranked = targets
      .map((target) => {
        const scores = times.map((t) =>
          scoreTargetAt(
            target,
            observer,
            relevantWeather,
            equipment,
            t,
            horizon,
          ),
        );
        return {
          target,
          scores,
          rank:
            Math.min(...scores.map((s) => s.score)) +
            (previous?.targetId === target.id ? 8 : 0),
        };
      })
      .filter((r) =>
        r.scores.every(
          (s) =>
            s.altitude >= 25 &&
            s.horizonClear &&
            (s.weatherScore === null || s.weatherScore >= 35),
        ),
      )
      .sort((a, b) => b.rank - a.rank);
    const best = ranked[0];
    if (!best) {
      skippedMinutes += 30;
      continue;
    }
    if (
      previous?.targetId === best.target.id &&
      Date.parse(previous.end) === at
    ) {
      previous.score = Math.min(
        previous.score,
        ...best.scores.map((s) => s.score),
      );
      previous.end = new Date(at + 1800000).toISOString();
      previous.frames = Math.max(
        0,
        Math.floor(
          ((Date.parse(previous.end) - Date.parse(previous.start)) / 1000 -
            300) /
            (subSeconds + 5),
        ),
      );
      continue;
    }
    const savedFilters = input.equipment.filters.filter((f) =>
      rig.filterIds.includes(f.id),
    );
    const filters = savedFilters
      .filter((f) =>
        best.target.filters.some((t) =>
          `${f.name} ${f.filterType}`.toLowerCase().includes(t.toLowerCase()),
        ),
      )
      .map((f) => f.name);
    blocks.push({
      targetId: best.target.id,
      targetName: best.target.name,
      start: new Date(at).toISOString(),
      end: new Date(at + 1800000).toISOString(),
      ra: parseRightAscension(best.target.ra) / 15,
      dec: parseDeclination(best.target.dec),
      reasons: [
        ...best.scores[1].reasons,
        "At least 25° high throughout this block; Sun below −12°",
      ],
      score: Math.min(...best.scores.map((s) => s.score)),
      filters: filters.length
        ? filters
        : [
            savedFilters.length
              ? `Suggested: ${best.target.filters.join(" / ")} (not matched to saved filters)`
              : `Suggested: ${best.target.filters.join(" / ")} — verify availability`,
          ],
      subSeconds,
      frames: Math.max(0, Math.floor(1500 / (subSeconds + 5))),
      fov,
    });
  }
  return { blocks, skippedMinutes };
}
