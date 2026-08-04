export function criticalFocusZone(focalRatio: number, wavelengthNm = 550) { if (focalRatio <= 0 || wavelengthNm <= 0) throw new Error("Focal ratio and wavelength must be positive."); return 2.44 * (wavelengthNm / 1000) * focalRatio ** 2; }

export function analyseVCurve(positions: number[], hfr: number[]) {
  if (positions.length !== hfr.length || positions.length < 5) throw new Error("Enter at least five matching focuser positions and HFR values.");
  const minimumIndex = hfr.indexOf(Math.min(...hfr)); if (minimumIndex < 2 || minimumIndex > hfr.length - 3) throw new Error("The V-curve needs measurements on both sides of best focus.");
  const fit = (xs: number[], ys: number[]) => { const xMean = xs.reduce((a, b) => a + b, 0) / xs.length; const yMean = ys.reduce((a, b) => a + b, 0) / ys.length; const slope = xs.reduce((sum, x, i) => sum + (x - xMean) * (ys[i] - yMean), 0) / xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0); return { slope, intercept: yMean - slope * xMean }; };
  const left = fit(positions.slice(0, minimumIndex + 1), hfr.slice(0, minimumIndex + 1)); const right = fit(positions.slice(minimumIndex), hfr.slice(minimumIndex));
  const bestPosition = (right.intercept - left.intercept) / (left.slope - right.slope); const predictedHfr = left.slope * bestPosition + left.intercept;
  return { bestPosition, predictedHfr, leftSlope: left.slope, rightSlope: right.slope, symmetry: Math.min(Math.abs(left.slope), Math.abs(right.slope)) / Math.max(Math.abs(left.slope), Math.abs(right.slope)) };
}
