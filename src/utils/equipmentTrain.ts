export interface TrainComponent {
  id: string;
  name: string;
  thicknessMm: number;
}

export interface TrainResult {
  usedMm: number;
  remainingMm: number;
  status: "Matched" | "Close" | "Needs spacing" | "Too long";
  guidance: string;
}

export function analyseEquipmentTrain(
  requiredMm: number,
  components: TrainComponent[],
): TrainResult {
  const usedMm = components.reduce(
    (total, component) => total + Math.max(0, component.thicknessMm || 0),
    0,
  );
  const remainingMm = requiredMm - usedMm;
  const absolute = Math.abs(remainingMm);
  if (absolute <= 0.5)
    return {
      usedMm,
      remainingMm,
      status: "Matched",
      guidance: "The optical train is within ±0.5 mm of the target.",
    };
  if (absolute <= 2)
    return {
      usedMm,
      remainingMm,
      status: "Close",
      guidance:
        remainingMm > 0
          ? `Add about ${remainingMm.toFixed(1)} mm of fine spacing.`
          : `Remove about ${absolute.toFixed(1)} mm of spacing.`,
    };
  if (remainingMm > 0)
    return {
      usedMm,
      remainingMm,
      status: "Needs spacing",
      guidance: `Add ${remainingMm.toFixed(1)} mm using threaded extensions and fine shims.`,
    };
  return {
    usedMm,
    remainingMm,
    status: "Too long",
    guidance: `Shorten the train by ${absolute.toFixed(1)} mm before adding shims.`,
  };
}

export function samplingAssessment(pixelScale: number) {
  if (pixelScale < 0.7)
    return "Very fine sampling — excellent guiding and seeing will be important.";
  if (pixelScale <= 2.5)
    return "Balanced sampling for typical deep-sky imaging conditions.";
  return "Coarse sampling — well suited to wide fields, but small detail may be undersampled.";
}
