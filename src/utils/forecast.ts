import type { WeatherHour } from "../services/weather";
export interface ForecastResponse {
  hourly: {
    time: number[];
    cloud_cover: number[];
    relative_humidity_2m: number[];
    temperature_2m: number[];
    dew_point_2m: number[];
    wind_speed_10m: number[];
    visibility: number[];
  };
}
export interface AstroResponse {
  init?: string;
  dataseries?: { timepoint: number; seeing: number; transparency: number }[];
}
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export function parseForecast(
  weather: ForecastResponse,
  astro: AstroResponse | null,
  now = new Date(),
): WeatherHour[] {
  if (!Array.isArray(weather?.hourly?.time))
    throw new Error("Weather service returned an invalid forecast.");
  const init = astro?.init;
  const epoch =
    init && /^\d{10}$/.test(init)
      ? Date.UTC(
          +init.slice(0, 4),
          +init.slice(4, 6) - 1,
          +init.slice(6, 8),
          +init.slice(8, 10),
        )
      : NaN;
  const out: WeatherHour[] = [];
  weather.hourly.time.forEach((seconds, index) => {
    const timestamp = seconds * 1000;
    if (
      !Number.isFinite(timestamp) ||
      timestamp < now.getTime() - 3600000 ||
      out.length >= 48
    )
      return;
    const h = weather.hourly;
    const values = [
      h.cloud_cover[index],
      h.relative_humidity_2m[index],
      h.temperature_2m[index],
      h.dew_point_2m[index],
      h.wind_speed_10m[index],
      h.visibility[index],
    ];
    if (!values.every((v) => typeof v === "number" && Number.isFinite(v)))
      return;
    const [rawCloud, rawHumidity, temperature, dewPoint, rawWind, visibility] =
      values;
    const cloud = clamp(rawCloud, 0, 100),
      humidity = clamp(rawHumidity, 0, 100),
      wind = Math.max(0, rawWind);
    const point = astro?.dataseries
      ?.filter(
        (p) =>
          Number.isFinite(epoch) &&
          Math.abs(epoch + p.timepoint * 3600000 - timestamp) <= 5400000,
      )
      .sort(
        (a, b) =>
          Math.abs(epoch + a.timepoint * 3600000 - timestamp) -
          Math.abs(epoch + b.timepoint * 3600000 - timestamp),
      )[0];
    const model =
      !!point &&
      [point.seeing, point.transparency].every(
        (v) => Number.isInteger(v) && v >= 1 && v <= 8,
      );
    // 7Timer category 1 is best. The app displays quality 8 as best.
    const seeing = model
      ? 9 - point.seeing
      : clamp(Math.round(8 - wind / 6 - humidity / 35), 1, 8);
    const transparency = model
      ? 9 - point.transparency
      : clamp(Math.round(8 - cloud / 18 - humidity / 45), 1, 8);
    out.push({
      time: new Date(timestamp).toISOString(),
      cloud,
      humidity,
      temperature,
      dewPoint,
      wind,
      visibility: Math.max(0, visibility / 1000),
      seeing,
      transparency,
      score: clamp(
        Math.round(
          100 -
            cloud * 0.65 -
            humidity * 0.15 -
            wind * 0.5 +
            seeing * 2 +
            transparency * 2,
        ),
        0,
        100,
      ),
      fetchedAt: now.toISOString(),
      seeingSource: model ? "7Timer model" : "Weather estimate",
      cached: false,
    });
  });
  return out;
}
export function forecastFreshness(
  hour: WeatherHour | undefined,
  now = new Date(),
) {
  if (!hour?.fetchedAt || !Number.isFinite(Date.parse(hour.fetchedAt)))
    return "Unknown age";
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(hour.fetchedAt)) / 60000),
  );
  return `${minutes >= 180 ? "Stale" : hour.cached ? "Cached" : "Downloaded"} · ${minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h`} ago`;
}
