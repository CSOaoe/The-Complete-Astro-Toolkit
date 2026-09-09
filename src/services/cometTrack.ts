import AsyncStorage from "@react-native-async-storage/async-storage";
import { ObserverLocation } from "@/types";
import { parseHorizonsTrack, TrackPoint } from "@/utils/cometTrack";
export interface CometTrack {
  points: TrackPoint[];
  fetchedAt: string;
  cached: boolean;
  designation: string;
  site: string;
}
let queue: Promise<unknown> = Promise.resolve();
export function fetchCometTrack(
  designation: string,
  site: ObserverLocation,
  start: Date,
  hours: number,
): Promise<CometTrack> {
  const task = queue
    .catch(() => undefined)
    .then(async () => {
      if (
        !/^[a-zA-Z0-9 /().-]{1,60}$/.test(designation) ||
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(hours) ||
        hours < 1 ||
        hours > 16
      )
        throw new Error("Select a catalogue comet and 1–16 hours.");
      const end = new Date(start.getTime() + hours * 3600000);
      const key = `@astrotoolkit/comet-track/${designation}/${site.latitude},${site.longitude}/${start.toISOString()}/${hours}`;
      const params = new URLSearchParams({
        format: "json",
        COMMAND: `'DES=${designation};CAP;'`,
        EPHEM_TYPE: "'OBSERVER'",
        CENTER: "'coord@399'",
        COORD_TYPE: "'GEODETIC'",
        SITE_COORD: `'${site.longitude},${site.latitude},0'`,
        START_TIME: `'${start.toISOString().slice(0, 16).replace("T", " ")}'`,
        STOP_TIME: `'${end.toISOString().slice(0, 16).replace("T", " ")}'`,
        STEP_SIZE: "'30 m'",
        QUANTITIES: "'1'",
        ANG_FORMAT: "'DEG'",
        CAL_FORMAT: "'JD'",
        CSV_FORMAT: "'YES'",
        EXTRA_PREC: "'YES'",
      });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(
          `https://ssd.jpl.nasa.gov/api/horizons.api?${params}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`JPL returned ${response.status}.`);
        const body = await response.json();
        if (body.error || typeof body.result !== "string")
          throw new Error(
            "JPL could not resolve this comet. Try another catalogue designation.",
          );
        const track: CometTrack = {
          points: parseHorizonsTrack(body.result),
          fetchedAt: new Date().toISOString(),
          cached: false,
          designation,
          site: site.label,
        };
        await AsyncStorage.setItem(key, JSON.stringify(track)).catch(
          () => undefined,
        );
        return track;
      } catch (error) {
        try {
          const cached = JSON.parse(
            (await AsyncStorage.getItem(key)) ?? "null",
          );
          if (
            cached &&
            Date.now() - Date.parse(cached.fetchedAt) < 86400000 &&
            Array.isArray(cached.points) &&
            cached.points.length > 1
          )
            return { ...cached, cached: true };
        } catch {
          /* Keep network error. */
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    });
  queue = task;
  return task;
}
