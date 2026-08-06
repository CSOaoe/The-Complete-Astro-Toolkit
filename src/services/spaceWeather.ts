import AsyncStorage from "@react-native-async-storage/async-storage";
import { ObserverLocation } from "@/types";

const ROOT = "https://services.swpc.noaa.gov";
const CACHE = "@astrotoolkit/space-weather";
export interface SpaceWeatherSnapshot { observedAt: string; kp: number; solarWindSpeed: number | null; bz: number | null; auroraProbability: number | null; cached: boolean; }

type SolarWindSpeed = { proton_speed?: number; time_tag?: string }[];
type SolarWindField = { bz_gsm?: number; time_tag?: string }[];

export function nearestAurora(coordinates: number[][], location: ObserverLocation) {
  let nearest: number[] | null = null; let distance = Number.POSITIVE_INFINITY;
  for (const row of coordinates) {
    const lon = row[0] > 180 ? row[0] - 360 : row[0];
    const delta = (lon - location.longitude) ** 2 + (row[1] - location.latitude) ** 2;
    if (delta < distance) { distance = delta; nearest = row; }
  }
  return nearest ? Number(nearest[2]) : null;
}

function finiteOrNull(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function parseSpaceWeather(location: ObserverLocation, kpRows: string[][], plasmaRows: string[][], magRows: string[][], aurora: { "Forecast Time"?: string; coordinates?: number[][] }): SpaceWeatherSnapshot {
  const latest = (rows: string[][]) => rows[rows.length - 1] ?? [];
  return { observedAt: aurora["Forecast Time"] ?? new Date().toISOString(), kp: finiteOrNull(latest(kpRows)[1]) ?? 0, solarWindSpeed: finiteOrNull(latest(plasmaRows)[2]), bz: finiteOrNull(latest(magRows)[3]), auroraProbability: nearestAurora(aurora.coordinates ?? [], location), cached: false };
}

export async function fetchSpaceWeather(location: ObserverLocation): Promise<SpaceWeatherSnapshot> {
  try {
    const read = async <T,>(url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`NOAA feed returned ${response.status}.`);
      return response.json() as Promise<T>;
    };
    const [kpResult, speedResult, fieldResult, auroraResult] = await Promise.allSettled([
      read<string[][]>(`${ROOT}/products/noaa-planetary-k-index.json`),
      read<SolarWindSpeed>(`${ROOT}/products/summary/solar-wind-speed.json`),
      read<SolarWindField>(`${ROOT}/products/summary/solar-wind-mag-field.json`),
      read<{ "Forecast Time"?: string; coordinates?: number[][] }>(`${ROOT}/json/ovation_aurora_latest.json`),
    ]);
    if ([kpResult, speedResult, fieldResult, auroraResult].every((result) => result.status === "rejected")) {
      throw new Error("NOAA space-weather data is temporarily unavailable.");
    }
    const kpRows = kpResult.status === "fulfilled" ? kpResult.value : [];
    const speed = speedResult.status === "fulfilled" ? speedResult.value.at(-1) : undefined;
    const field = fieldResult.status === "fulfilled" ? fieldResult.value.at(-1) : undefined;
    const plasmaRows = speed ? [["time", "density", "speed"], [speed.time_tag ?? "", "", String(speed.proton_speed ?? "")]] : [];
    const magRows = field ? [["time", "bt", "by", "bz"], [field.time_tag ?? "", "", "", String(field.bz_gsm ?? "")]] : [];
    const aurora = auroraResult.status === "fulfilled" ? auroraResult.value : {};
    const value = parseSpaceWeather(location, kpRows, plasmaRows, magRows, aurora);
    await AsyncStorage.setItem(CACHE, JSON.stringify(value)); return value;
  } catch (error) {
    const stored = await AsyncStorage.getItem(CACHE); if (!stored) throw error;
    return { ...(JSON.parse(stored) as SpaceWeatherSnapshot), cached: true };
  }
}
