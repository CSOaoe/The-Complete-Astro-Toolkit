import AsyncStorage from "@react-native-async-storage/async-storage";
import { ObserverLocation } from "@/types";

const ROOT = "https://services.swpc.noaa.gov";
const CACHE = "@astrotoolkit/space-weather";
export interface SpaceWeatherSnapshot { observedAt: string; kp: number; solarWindSpeed: number | null; bz: number | null; auroraProbability: number | null; cached: boolean; }

export function nearestAurora(coordinates: number[][], location: ObserverLocation) {
  let nearest: number[] | null = null; let distance = Number.POSITIVE_INFINITY;
  for (const row of coordinates) {
    const lon = row[0] > 180 ? row[0] - 360 : row[0];
    const delta = (lon - location.longitude) ** 2 + (row[1] - location.latitude) ** 2;
    if (delta < distance) { distance = delta; nearest = row; }
  }
  return nearest ? Number(nearest[2]) : null;
}

export function parseSpaceWeather(location: ObserverLocation, kpRows: string[][], plasmaRows: string[][], magRows: string[][], aurora: { "Forecast Time"?: string; coordinates?: number[][] }): SpaceWeatherSnapshot {
  const latest = (rows: string[][]) => rows[rows.length - 1] ?? [];
  return { observedAt: aurora["Forecast Time"] ?? new Date().toISOString(), kp: Number(latest(kpRows)[1]) || 0, solarWindSpeed: Number(latest(plasmaRows)[2]) || null, bz: Number(latest(magRows)[3]) || null, auroraProbability: nearestAurora(aurora.coordinates ?? [], location), cached: false };
}

export async function fetchSpaceWeather(location: ObserverLocation): Promise<SpaceWeatherSnapshot> {
  try {
    const [kpResponse, plasmaResponse, magResponse, auroraResponse] = await Promise.all([
      fetch(`${ROOT}/products/noaa-planetary-k-index.json`), fetch(`${ROOT}/products/solar-wind/plasma-1-day.json`),
      fetch(`${ROOT}/products/solar-wind/mag-1-day.json`), fetch(`${ROOT}/json/ovation_aurora_latest.json`),
    ]);
    if (![kpResponse, plasmaResponse, magResponse, auroraResponse].every((response) => response.ok)) throw new Error("NOAA space-weather data is temporarily unavailable.");
    const kpRows = await kpResponse.json() as string[][]; const plasmaRows = await plasmaResponse.json() as string[][]; const magRows = await magResponse.json() as string[][];
    const aurora = await auroraResponse.json() as { "Forecast Time"?: string; coordinates?: number[][] };
    const value = parseSpaceWeather(location, kpRows, plasmaRows, magRows, aurora);
    await AsyncStorage.setItem(CACHE, JSON.stringify(value)); return value;
  } catch (error) {
    const stored = await AsyncStorage.getItem(CACHE); if (!stored) throw error;
    return { ...(JSON.parse(stored) as SpaceWeatherSnapshot), cached: true };
  }
}
