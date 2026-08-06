import { SpaceWeatherSnapshot } from "@/services/spaceWeather";
import { WeatherHour } from "@/services/weather";
import { SmartTargetScore } from "./smartPlanning";

export type AlertCategory = "Clear sky" | "Aurora" | "Target" | "Equipment";
export interface IntelligentAlert {
  id: string;
  category: AlertCategory;
  priority: "High" | "Medium" | "Info";
  title: string;
  message: string;
}

export function buildIntelligentAlerts(
  weather: WeatherHour[],
  spaceWeather: SpaceWeatherSnapshot | null,
  targets: SmartTargetScore[],
): IntelligentAlert[] {
  const alerts: IntelligentAlert[] = [];
  const clear = weather.find((hour) => hour.score >= 72 && hour.cloud <= 25);
  if (clear)
    alerts.push({ id: "clear", category: "Clear sky", priority: "High", title: "Strong clear-sky window", message: `${new Date(clear.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}: ${Math.round(clear.cloud)}% cloud, seeing ${clear.seeing}/8 and transparency ${clear.transparency}/8.` });
  const dew = weather.find((hour) => hour.temperature - hour.dewPoint <= 2);
  if (dew)
    alerts.push({ id: "dew", category: "Equipment", priority: "High", title: "Dew risk", message: `Temperature approaches the dew point near ${new Date(dew.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Prepare heaters and lens shields.` });
  const wind = weather.find((hour) => hour.wind >= 25);
  if (wind)
    alerts.push({ id: "wind", category: "Equipment", priority: "Medium", title: "Wind may affect guiding", message: `${Math.round(wind.wind)} km/h is forecast. Shelter the rig and shorten exposures if stars elongate.` });
  if (spaceWeather && (spaceWeather.kp >= 5 || (spaceWeather.auroraProbability ?? 0) >= 20))
    alerts.push({ id: "aurora", category: "Aurora", priority: "High", title: "Aurora opportunity", message: `Kp ${spaceWeather.kp.toFixed(1)} with ${Math.round(spaceWeather.auroraProbability ?? 0)}% local model probability. Check the northern horizon.` });
  const best = targets[0];
  if (best)
    alerts.push({ id: "target", category: "Target", priority: best.score >= 75 ? "High" : "Info", title: `${best.target.name} reaches a useful window`, message: `Best near ${best.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}, altitude ${Math.round(best.altitude)}° and smart score ${best.score}/100.` });
  if (!alerts.length)
    alerts.push({ id: "quiet", category: "Clear sky", priority: "Info", title: "No urgent alerts", message: "Conditions are mixed or feeds are unavailable. Recheck before setting up." });
  return alerts;
}
