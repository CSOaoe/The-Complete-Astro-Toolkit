import { ObserverLocation } from "@/types";

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
}
interface ForecastResponse {
  hourly: {
    time: string[];
    cloud_cover: number[];
    relative_humidity_2m: number[];
    temperature_2m: number[];
    dew_point_2m: number[];
    wind_speed_10m: number[];
    visibility: number[];
  };
}
interface AstroResponse {
  dataseries?: { timepoint: number; seeing: number; transparency: number }[];
}

export async function fetchAstroWeather(
  location: ObserverLocation,
): Promise<WeatherHour[]> {
  const query = `latitude=${location.latitude}&longitude=${location.longitude}&hourly=cloud_cover,relative_humidity_2m,temperature_2m,dew_point_2m,wind_speed_10m,visibility&forecast_days=3&timezone=auto`;
  const [weatherResponse, astroResponse] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${query}`),
    fetch(
      `https://www.7timer.info/bin/api.pl?lon=${location.longitude}&lat=${location.latitude}&product=astro&output=json`,
    ).catch(() => null),
  ]);
  if (!weatherResponse.ok) throw new Error("Weather service is unavailable.");
  const weather = (await weatherResponse.json()) as ForecastResponse;
  let astro: AstroResponse | null = null;
  if (astroResponse?.ok) {
    try {
      astro = (await astroResponse.json()) as AstroResponse;
    } catch {
      astro = null;
    }
  }
  const now = new Date();
  const start = weather.hourly.time.findIndex(
    (value) => new Date(value).getTime() >= now.getTime() - 3_600_000,
  );
  return weather.hourly.time
    .slice(Math.max(0, start), Math.max(0, start) + 24)
    .map((time, offset) => {
      const index = Math.max(0, start) + offset;
      const astroPoint = astro?.dataseries?.[Math.floor(offset / 3)];
      const cloud = weather.hourly.cloud_cover[index];
      const humidity = weather.hourly.relative_humidity_2m[index];
      const wind = weather.hourly.wind_speed_10m[index];
      const seeing =
        astroPoint?.seeing ??
        Math.max(1, Math.min(8, Math.round(8 - wind / 6 - humidity / 35)));
      const transparency =
        astroPoint?.transparency ??
        Math.max(1, Math.min(8, Math.round(8 - cloud / 18 - humidity / 45)));
      const score = Math.max(
        0,
        Math.round(
          100 -
            cloud * 0.65 -
            humidity * 0.15 -
            wind * 0.5 +
            seeing * 2 +
            transparency * 2,
        ),
      );
      return {
        time,
        cloud,
        humidity,
        temperature: weather.hourly.temperature_2m[index],
        dewPoint: weather.hourly.dew_point_2m[index],
        wind,
        visibility: weather.hourly.visibility[index] / 1000,
        seeing,
        transparency,
        score,
      };
    });
}
