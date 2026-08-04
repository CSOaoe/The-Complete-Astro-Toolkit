export interface GuidingAnalysis { samples: number; raRms: number; decRms: number; totalRms: number; peakError: number; lostFrames: number; raBias: number; decBias: number; unit: "″" | "px"; verdict: string; notes: string[]; }

export function analysePhd2Log(text: string): GuidingAnalysis {
  const lines = text.split(/\r?\n/); const headerIndex = lines.findIndex((line) => /^Frame,Time,/.test(line));
  if (headerIndex < 0) throw new Error("No PHD2 guiding data table was found in this log.");
  const headings = lines[headerIndex].split(",").map((value) => value.replaceAll('"', "").trim());
  const raIndex = headings.findIndex((value) => /RARawDistance|RADistanceRaw/.test(value)); const decIndex = headings.findIndex((value) => /DECRawDistance|DECDistanceRaw/.test(value)); const errorIndex = headings.findIndex((value) => value === "ErrorCode");
  if (raIndex < 0 || decIndex < 0) throw new Error("The log does not include RA and Dec guide distances.");
  const pixelScale = Number(text.match(/Pixel scale\s*=\s*([\d.]+)\s*arc-sec\/px/i)?.[1]) || 1; const unit = pixelScale === 1 && !/Pixel scale\s*=/i.test(text) ? "px" as const : "″" as const;
  const points: { ra: number; dec: number; error: number }[] = [];
  for (const line of lines.slice(headerIndex + 1)) { if (!/^\d+,/.test(line)) continue; const row = line.split(","); const ra = Number(row[raIndex]); const dec = Number(row[decIndex]); if (Number.isFinite(ra) && Number.isFinite(dec)) points.push({ ra, dec, error: Number(row[errorIndex]) || 0 }); }
  if (points.length < 3) throw new Error("The log contains too few guiding samples.");
  const rms = (values: number[]) => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length); const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const raRms = rms(points.map((point) => point.ra)) * pixelScale; const decRms = rms(points.map((point) => point.dec)) * pixelScale; const totalRms = Math.hypot(raRms, decRms); const peakError = Math.max(...points.map((point) => Math.hypot(point.ra, point.dec))) * pixelScale; const lostFrames = points.filter((point) => point.error !== 0).length;
  const notes = [totalRms < 1 ? "Guiding is tight for most imaging scales" : totalRms < 1.8 ? "Guiding is usable but has room for improvement" : "Large guide errors may soften long-focal-length frames", Math.abs(mean(points.map((p) => p.dec))) > 0.4 ? "Persistent Dec bias suggests polar drift or one-direction corrections" : "No strong Dec bias detected", peakError > totalRms * 4 ? "Large excursions suggest wind, cable drag or lost-star events" : "Peak excursions are proportionate to the normal scatter", lostFrames ? `${lostFrames} samples contain a PHD2 error code` : "No error-coded guide samples found"];
  if (unit === "px") notes.unshift("Pixel scale was not found; RMS values are reported in guide-camera pixels");
  return { samples: points.length, raRms, decRms, totalRms, peakError, lostFrames, raBias: mean(points.map((p) => p.ra)) * pixelScale, decBias: mean(points.map((p) => p.dec)) * pixelScale, unit, verdict: totalRms < 1 ? "EXCELLENT" : totalRms < 1.8 ? "USABLE" : "INVESTIGATE", notes };
}
