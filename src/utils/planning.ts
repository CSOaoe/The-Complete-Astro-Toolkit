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

export type ProcessingSoftware = "PixInsight" | "Siril" | "AffinityPhoto" | "Photoshop";
export type PostProcessAnswers = {
  software: ProcessingSoftware;
  data: "OSC" | "Mono";
  target: "Nebula" | "Galaxy" | "Cluster";
  narrowband: boolean;
  gradients: boolean;
  noise: boolean;
  stars: boolean;
};
export function postProcessWorkflow(input: PostProcessAnswers) {
  const recipes: Record<ProcessingSoftware, string[]> = {
    PixInsight: [
      "WeightedBatchPreprocessing — calibrate, register and integrate the subframes",
      input.gradients ? "DynamicBackgroundExtraction — remove gradients with samples clear of target structure" : "ImageInspection — reject weak frames and verify registration",
      input.data === "Mono" ? "ChannelCombination — assemble the mono masters" : "SpectrophotometricColorCalibration — solve and calibrate colour",
      input.narrowband ? "PixelMath — build the narrowband palette while the data is linear" : "Linear colour and background refinement",
      input.noise ? "Deconvolution and MultiscaleLinearTransform — sharpen and reduce noise while linear" : "Controlled linear detail refinement",
      input.stars ? "Star separation — process stars and background independently" : "Protect stars through the stretch",
      "GeneralizedHyperbolicStretch — reveal faint signal while protecting highlights",
      "CurvesTransformation — finish contrast, saturation and colour balance",
    ],
    Siril: [
      "Conversion and preprocessing — calibrate lights with matching masters",
      "Registration and stacking — use weighted rejection and inspect the result",
      input.gradients ? "Background Extraction — correct gradients before stretching" : "Background neutralisation and crop",
      input.data === "Mono" ? "RGB composition — combine registered mono masters" : "Photometric Colour Calibration — calibrate OSC colour",
      input.narrowband ? "Pixel Math — mix the narrowband channels into the chosen palette" : "Green noise removal and colour balance",
      input.noise ? "Linear denoise — reduce chroma and luminance noise conservatively" : "Linear detail check",
      input.stars ? "StarNet integration — create starless and star layers" : "Protect stars during stretch",
      "Generalised Hyperbolic Stretch — build contrast in controlled stages",
      "Final saturation, star recombination and export",
    ],
    AffinityPhoto: [
      "Develop or open the integrated 16/32-bit master and crop stacking edges",
      input.gradients ? "Remove gradients with live filters and masked background corrections" : "Set black point and neutral background",
      input.data === "Mono" ? "Load channel masters and assign them to RGB channels" : "Balance OSC colour with white balance and curves",
      input.narrowband ? "Use channel equations or blend modes to construct the narrowband palette" : "Build colour contrast with selective colour adjustments",
      input.noise ? "Apply masked denoise before the strongest stretch" : "Inspect faint signal at 100%",
      input.stars ? "Create a protected star layer for separate colour and size control" : "Mask bright stars before contrast work",
      "Stretch with Curves and Levels in several small moves",
      "Finish local contrast, saturation, star control and export",
    ],
    Photoshop: [
      "Open the integrated 16-bit master as a Smart Object and crop stacking edges",
      input.gradients ? "Use masked adjustment layers to flatten gradients" : "Set a neutral background and black point",
      input.data === "Mono" ? "Load mono masters into RGB channels and align precisely" : "Correct OSC colour with Camera Raw and Curves",
      input.narrowband ? "Use Apply Image or channel calculations to build the narrowband palette" : "Refine colour with selective colour and saturation masks",
      input.noise ? "Reduce noise with a masked Camera Raw or dedicated denoise layer" : "Inspect the linear master for residual noise",
      input.stars ? "Keep stars on a separate layer for independent colour and size control" : "Use luminosity masks to protect stars",
      "Stretch gradually with Curves while preserving highlights",
      "Finish contrast, colour, sharpening and web/print export",
    ],
  };
  return [...recipes[input.software], `Final ${input.target.toLowerCase()} inspection — check clipping, halos, colour and background neutrality`];
}
