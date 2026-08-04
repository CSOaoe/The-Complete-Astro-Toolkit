import { decode } from "jpeg-js";

export interface ImageQualityResult {
  score: number;
  verdict: "KEEP" | "CHECK" | "REJECT";
  starCount: number;
  fwhmPixels: number;
  eccentricity: number;
  clippedPercent: number;
  backgroundLevel: number;
  backgroundNoise: number;
  hazeScore: number;
  notes: string[];
}

export function analyseRgba(data: Uint8Array, width: number, height: number): ImageQualityResult {
  if (width < 16 || height < 16 || data.length < width * height * 4) throw new Error("Image pixel data is incomplete.");
  const gray = new Float32Array(width * height);
  let sum = 0, sumSquares = 0, clipped = 0;
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 4;
    const value = data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722;
    gray[index] = value; sum += value; sumSquares += value * value;
    if (Math.max(data[offset], data[offset + 1], data[offset + 2]) >= 252) clipped += 1;
  }
  const mean = sum / gray.length;
  const noise = Math.sqrt(Math.max(0, sumSquares / gray.length - mean * mean));
  const threshold = mean + Math.max(18, noise * 2.8);
  const stars: { fwhm: number; eccentricity: number }[] = [];
  for (let y = 5; y < height - 5 && stars.length < 250; y += 2) for (let x = 5; x < width - 5 && stars.length < 250; x += 2) {
    const value = gray[y * width + x];
    if (value < threshold || value < gray[y * width + x - 1] || value < gray[y * width + x + 1] || value < gray[(y - 1) * width + x] || value < gray[(y + 1) * width + x]) continue;
    let weightSum = 0, cx = 0, cy = 0;
    for (let dy = -4; dy <= 4; dy += 1) for (let dx = -4; dx <= 4; dx += 1) { const weight = Math.max(0, gray[(y + dy) * width + x + dx] - mean); weightSum += weight; cx += dx * weight; cy += dy * weight; }
    if (weightSum < 30) continue;
    cx /= weightSum; cy /= weightSum;
    let xx = 0, yy = 0, xy = 0;
    for (let dy = -4; dy <= 4; dy += 1) for (let dx = -4; dx <= 4; dx += 1) { const weight = Math.max(0, gray[(y + dy) * width + x + dx] - mean); xx += (dx - cx) ** 2 * weight; yy += (dy - cy) ** 2 * weight; xy += (dx - cx) * (dy - cy) * weight; }
    xx /= weightSum; yy /= weightSum; xy /= weightSum;
    const trace = xx + yy; const root = Math.sqrt(Math.max(0, ((xx - yy) / 2) ** 2 + xy ** 2));
    const major = Math.max(0.01, trace / 2 + root); const minor = Math.max(0.01, trace / 2 - root);
    stars.push({ fwhm: 2.355 * Math.sqrt((major + minor) / 2), eccentricity: Math.sqrt(Math.max(0, 1 - minor / major)) });
  }
  const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0; };
  const fwhm = median(stars.map((star) => star.fwhm));
  const eccentricity = median(stars.map((star) => star.eccentricity));
  const clippedPercent = (clipped / gray.length) * 100;
  const hazeScore = Math.max(0, Math.min(100, 100 - mean * 0.7 - noise * 0.8));
  let score = 100;
  if (stars.length < 8) score -= 25;
  score -= Math.max(0, fwhm - 2.5) * 7;
  score -= Math.max(0, eccentricity - 0.35) * 70;
  score -= Math.min(25, clippedPercent * 6);
  score -= Math.max(0, 55 - hazeScore) * 0.35;
  score = Math.round(Math.max(0, Math.min(100, score)));
  const notes = [stars.length < 8 ? "Too few clear stars for a confident measurement" : `${stars.length} stars measured`, fwhm > 5 ? "Soft focus or poor seeing detected" : "Focus profile looks usable", eccentricity > 0.6 ? "Elongated stars suggest tracking, tilt or wind" : "Star shapes are reasonably round", clippedPercent > 1 ? "Many pixels are clipped" : "Highlight clipping is controlled", hazeScore < 45 ? "Raised background may indicate haze, Moon or gradients" : "Background contrast is usable"];
  return { score, verdict: score >= 75 ? "KEEP" : score >= 50 ? "CHECK" : "REJECT", starCount: stars.length, fwhmPixels: fwhm, eccentricity, clippedPercent, backgroundLevel: mean, backgroundNoise: noise, hazeScore, notes };
}

export function analyseBase64Jpeg(base64: string) {
  const binary = globalThis.atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const decoded = decode(bytes, { useTArray: true, formatAsRGBA: true });
  return analyseRgba(decoded.data, decoded.width, decoded.height);
}
