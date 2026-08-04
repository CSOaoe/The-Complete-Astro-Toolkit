import { Body, Equator, Horizon, Illumination, Observer } from "astronomy-engine";
import { ObserverLocation } from "@/types";

export const imagingBodies = [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune] as const;
export type ImagingBody = (typeof imagingBodies)[number];

const captureAdvice: Record<ImagingBody, { mode: string; cadence: string; note: string }> = {
  Sun: { mode: "Solar video", cadence: "2–5 ms frames", note: "Use a certified front-aperture solar filter. Never point an unfiltered telescope at the Sun." },
  Moon: { mode: "Lucky imaging", cadence: "5–15 ms frames", note: "Record short high-frame-rate videos and mosaic at native focal length." },
  Mercury: { mode: "High-speed mono", cadence: "2–8 ms frames", note: "Image in bright twilight at high altitude; an IR-pass filter can steady poor seeing." },
  Venus: { mode: "UV/IR lucky imaging", cadence: "1–8 ms frames", note: "UV reveals cloud structure; IR is easier and steadier." },
  Mars: { mode: "RGB lucky imaging", cadence: "3–10 ms frames", note: "Keep each colour sequence short to limit rotational smearing." },
  Jupiter: { mode: "High-speed RGB", cadence: "2–8 ms frames", note: "Use short videos; derotation can combine longer sessions." },
  Saturn: { mode: "High-gain lucky imaging", cadence: "8–25 ms frames", note: "Longer exposures than Jupiter are normal; preserve histogram headroom on the rings." },
  Uranus: { mode: "IR-assisted video", cadence: "20–80 ms frames", note: "Prioritise accurate focus and a long capture for enough good frames." },
  Neptune: { mode: "IR-assisted video", cadence: "30–120 ms frames", note: "Use precise ephemerides and verify the field before increasing focal length." },
};

export function bodyImagingSummary(body: ImagingBody, location: ObserverLocation, date = new Date()) {
  const observer = new Observer(location.latitude, location.longitude, 0);
  const equatorial = Equator(body, date, observer, true, true);
  const horizontal = Horizon(date, observer, equatorial.ra, equatorial.dec, "normal");
  const light = body === Body.Sun ? null : Illumination(body, date);
  return {
    body,
    altitude: horizontal.altitude,
    azimuth: horizontal.azimuth,
    magnitude: light?.mag ?? -26.74,
    illumination: light ? light.phase_fraction * 100 : 100,
    distanceAu: light?.geo_dist ?? 1,
    ...captureAdvice[body],
  };
}

export function bodyAltitudeSeries(body: ImagingBody, location: ObserverLocation, reference = new Date()) {
  const start = new Date(reference); start.setMinutes(0, 0, 0);
  return Array.from({ length: 25 }, (_, index) => {
    const at = new Date(start.getTime() + index * 30 * 60_000);
    return { at, altitude: bodyImagingSummary(body, location, at).altitude };
  });
}
