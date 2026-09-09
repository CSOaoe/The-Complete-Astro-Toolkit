import AsyncStorage from "@react-native-async-storage/async-storage";
import { ObserverLocation } from "@/types";
import {
  AstroResponse,
  ForecastResponse,
  parseForecast,
} from "@/utils/forecast";
export interface WeatherHour {
  time: string;
  cloud: number;
  humidity: number;
  temperature: number;
  dewPoint: number;
  wind: number;
  visibility: number;
  seeing: number;
  transparency: number;
  score: number;
  fetchedAt?: string;
  seeingSource?: "7Timer model" | "Weather estimate";
  cached?: boolean;
}
async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok)
      throw new Error(`Weather service returned ${response.status}.`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
export async function fetchAstroWeather(
  location: ObserverLocation,
): Promise<WeatherHour[]> {
  const key = `@astrotoolkit/weather/${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
  try {
    const [weather, astro] = await Promise.all([
      fetchJson<ForecastResponse>(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=cloud_cover,relative_humidity_2m,temperature_2m,dew_point_2m,wind_speed_10m,visibility&forecast_days=3&timezone=GMT&timeformat=unixtime`,
      ),
      fetchJson<AstroResponse>(
        `https://www.7timer.info/bin/api.pl?lon=${location.longitude}&lat=${location.latitude}&product=astro&output=json`,
      ).catch(() => null),
    ]);
    const hours = parseForecast(weather, astro);
    if (!hours.length)
      throw new Error("No valid forecast hours are available.");
    await AsyncStorage.setItem(key, JSON.stringify(hours)).catch(
      () => undefined,
    );
    return hours;
  } catch (error) {
    try {
      const stored = JSON.parse((await AsyncStorage.getItem(key)) ?? "null");
      if (Array.isArray(stored)) {
        const valid = stored.filter(
          (h) =>
            h &&
            Number.isFinite(h.score) &&
            Date.parse(h.time) >= Date.now() - 3600000 &&
            Date.parse(h.fetchedAt) >= Date.now() - 86400000,
        );
        if (valid.length) return valid.map((h) => ({ ...h, cached: true }));
      }
    } catch {
      /* Report the original network failure. */
    }
    throw error;
  }
}
