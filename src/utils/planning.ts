import { Body, Equator, Observer } from "astronomy-engine";
import { ObserverLocation } from "@/types";

export function angularSeparation(
  ra1Hours: number,
  dec1Degrees: number,
  ra2Hours: number,
  dec2Degrees: number,
) {
  const ra1 = (ra1Hours * Math.PI) / 12;
  const ra2 = (ra2Hours * Math.PI) / 12;
  const dec1 = (dec1Degrees * Math.PI) / 180;
  const dec2 = (dec2Degrees * Math.PI) / 180;
  const cosine =
    Math.sin(dec1) * Math.sin(dec2) +
    Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2);
  return (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;
}

export function moonDistance(
  raHours: number,
  decDegrees: number,
  date: Date,
  location: Pick<ObserverLocation, "latitude" | "longitude">,
) {
  const moon = Equator(
    Body.Moon,
    date,
    new Observer(location.latitude, location.longitude, 0),
    true,
    true,
  );
  return angularSeparation(raHours, decDegrees, moon.ra, moon.dec);
}

export function exposureRecommendation(
  readNoiseElectrons: number,
  skyRateElectronsPerSecond: number,
  noiseOverheadPercent: number,
) {
  if (
    ![
      readNoiseElectrons,
      skyRateElectronsPerSecond,
      noiseOverheadPercent,
    ].every(Number.isFinite) ||
    readNoiseElectrons <= 0 ||
    skyRateElectronsPerSecond <= 0 ||
    noiseOverheadPercent <= 0
  )
    throw new Error("Exposure inputs must be positive.");
  const ratio = 1 + noiseOverheadPercent / 100;
  return (
    readNoiseElectrons ** 2 / (skyRateElectronsPerSecond * (ratio ** 2 - 1))
  );
}

export function exposurePlan(subSeconds: number, totalHours: number) {
  if (
    !Number.isFinite(subSeconds) ||
    !Number.isFinite(totalHours) ||
    subSeconds <= 0 ||
    totalHours <= 0
  )
    throw new Error("Plan inputs must be positive.");
  const count = Math.ceil((totalHours * 3600) / subSeconds);
  return { count, totalSeconds: count * subSeconds };
}

export type PixInsightAnswers = {
  data: "OSC" | "Mono";
  target: "Nebula" | "Galaxy" | "Cluster";
  narrowband: boolean;
  gradients: boolean;
  noise: boolean;
  stars: boolean;
};
export function pixInsightWorkflow(input: PixInsightAnswers) {
  const steps = [
    "WeightedBatchPreprocessing — calibrate, register and integrate all subframes",
    "ImageInspection — reject poor frames and confirm registration",
  ];
  if (input.gradients)
    steps.push(
      "DynamicBackgroundExtraction — build careful samples away from target structure",
    );
  steps.push(
    input.data === "Mono"
      ? "ChannelCombination — combine linear L/R/G/B or narrowband masters"
      : "SpectrophotometricColorCalibration — solve and calibrate OSC colour",
  );
  if (input.narrowband)
    steps.push(
      "Narrowband combination — map Ha/OIII/SII with PixelMath before stretching",
    );
  if (input.noise)
    steps.push(
      "BlurXTerminator or Deconvolution, then NoiseXTerminator/MultiscaleLinearTransform while linear",
    );
  if (input.stars)
    steps.push(
      "StarXTerminator — separate stars for independent stretch and colour control",
    );
  steps.push(
    input.target === "Galaxy"
      ? "GeneralizedHyperbolicStretch — protect the core and reveal faint arms"
      : input.target === "Nebula"
        ? "GeneralizedHyperbolicStretch — reveal faint nebulosity without clipping highlights"
        : "HistogramTransformation — controlled stretch with star protection",
  );
  steps.push(
    "CurvesTransformation — refine contrast, saturation and colour balance",
    "Final inspection — check clipping, halos, noise and export in the required colour space",
  );
  return steps;
}
