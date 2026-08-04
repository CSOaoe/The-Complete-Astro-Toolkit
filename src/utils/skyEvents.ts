import { Body, Equator, Horizon, Observer, SearchLocalSolarEclipse, SearchLunarEclipse } from "astronomy-engine";
import { ObserverLocation } from "@/types";

export interface MeteorShower { name: string; code: string; peakMonth: number; peakDay: number; zhr: number; radiant: string; speed: number; note: string; }
export const meteorShowers: MeteorShower[] = [
  { name: "Quadrantids", code: "QUA", peakMonth: 0, peakDay: 3, zhr: 80, radiant: "Boötes", speed: 41, note: "Sharp peak; start wide and shoot continuously." },
  { name: "Lyrids", code: "LYR", peakMonth: 3, peakDay: 22, zhr: 18, radiant: "Lyra", speed: 49, note: "Good northern spring shower with occasional bright meteors." },
  { name: "Eta Aquariids", code: "ETA", peakMonth: 4, peakDay: 6, zhr: 50, radiant: "Aquarius", speed: 66, note: "Best before dawn, particularly from southern latitudes." },
  { name: "Southern Delta Aquariids", code: "SDA", peakMonth: 6, peakDay: 30, zhr: 25, radiant: "Aquarius", speed: 41, note: "Broad maximum; useful warm-up for the Perseids." },
  { name: "Perseids", code: "PER", peakMonth: 7, peakDay: 12, zhr: 100, radiant: "Perseus", speed: 59, note: "Use a wide lens and frame away from the radiant for longer trails." },
  { name: "Orionids", code: "ORI", peakMonth: 9, peakDay: 21, zhr: 20, radiant: "Orion", speed: 66, note: "Fast Halley-comet meteors, strongest after midnight." },
  { name: "Leonids", code: "LEO", peakMonth: 10, peakDay: 17, zhr: 15, radiant: "Leo", speed: 71, note: "Very fast meteors; favour short exposures and high ISO." },
  { name: "Geminids", code: "GEM", peakMonth: 11, peakDay: 14, zhr: 120, radiant: "Gemini", speed: 35, note: "Reliable, bright meteors throughout the night." },
];

export function nextMeteorPeak(shower: MeteorShower, from = new Date()) {
  let peak = new Date(from.getFullYear(), shower.peakMonth, shower.peakDay, 2, 0, 0);
  if (peak < from) peak = new Date(from.getFullYear() + 1, shower.peakMonth, shower.peakDay, 2, 0, 0);
  return peak;
}

export function nextEclipses(location: ObserverLocation, from = new Date()) {
  const observer = new Observer(location.latitude, location.longitude, 0);
  const solar = SearchLocalSolarEclipse(from, observer);
  const lunar = SearchLunarEclipse(from);
  const lunarEquator = Equator(Body.Moon, lunar.peak, observer, true, true); const lunarHorizon = Horizon(lunar.peak, observer, lunarEquator.ra, lunarEquator.dec, "normal");
  return {
    solar: { kind: solar.kind, peak: solar.peak.time.date, altitude: solar.peak.altitude, obscuration: solar.obscuration, begin: solar.partial_begin.time.date, end: solar.partial_end.time.date },
    lunar: { kind: lunar.kind, peak: lunar.peak.date, obscuration: lunar.obscuration, penumbralMinutes: lunar.sd_penum * 2, altitude: lunarHorizon.altitude },
  };
}
