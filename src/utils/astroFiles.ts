import { analyseRgba } from "./imageQuality";

export interface AstroFileInspection {
  format: "FITS" | "XISF";
  width: number | null; height: number | null; channels: number | null;
  bitDepth: string; object: string | null; filter: string | null;
  exposureSeconds: number | null; gain: number | null; temperature: number | null;
  dateObserved: string | null; median: number | null; minimum: number | null; maximum: number | null;
  starCount: number | null; fwhmPixels: number | null; eccentricity: number | null; clippedPercent: number | null;
  histogram: number[] | null;
  notes: string[];
}

function valueOf(card: string) { const raw = card.slice(10).split("/")[0].trim(); if (raw.startsWith("'")) return raw.slice(1, raw.lastIndexOf("'")).trim(); const number = Number(raw.replace("D", "E")); return Number.isFinite(number) ? number : raw; }

export function inspectFits(bytes: Uint8Array): AstroFileInspection {
  if (new TextDecoder().decode(bytes.slice(0, 6)) !== "SIMPLE") throw new Error("This does not contain a valid FITS primary header.");
  const header: Record<string, string | number> = {}; let end = 0;
  for (let offset = 0; offset + 80 <= bytes.length; offset += 80) { const card = new TextDecoder("ascii").decode(bytes.slice(offset, offset + 80)); const key = card.slice(0, 8).trim(); if (key === "END") { end = offset + 80; break; } if (card[8] === "=") header[key] = valueOf(card); }
  if (!end) throw new Error("The FITS header has no END card.");
  const dataOffset = Math.ceil(end / 2880) * 2880; const bitpix = Number(header.BITPIX); const count = Math.min(Number(header.NAXIS1 ?? 0) * Number(header.NAXIS2 ?? 0) * Number(header.NAXIS3 ?? 1), 200_000);
  const values: number[] = []; const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const readPixel = (index: number) => { const offset = dataOffset + index * bytesPer; let value = 0; if (bitpix === 8) value = view.getUint8(offset); else if (bitpix === 16) value = view.getInt16(offset, false); else if (bitpix === 32) value = view.getInt32(offset, false); else if (bitpix === -32) value = view.getFloat32(offset, false); else value = view.getFloat64(offset, false); return value * Number(header.BSCALE ?? 1) + Number(header.BZERO ?? 0); };
  const stride = Math.max(1, Math.floor(count / 25_000)); const bytesPer = Math.abs(bitpix) / 8;
  if ([8, 16, 32, -32, -64].includes(bitpix) && dataOffset + count * bytesPer <= bytes.length) for (let index = 0; index < count; index += stride) {
    const value = readPixel(index); if (Number.isFinite(value)) values.push(value);
  }
  values.sort((a, b) => a - b);
  const histogram = values.length ? Array.from({ length: 16 }, () => 0) : null; if (histogram) { const low = values[0]; const span = Math.max(1e-9, values[values.length - 1] - low); for (const value of values) histogram[Math.min(15, Math.floor(((value - low) / span) * 16))] += 1; }
  let quality: ReturnType<typeof analyseRgba> | null = null; const width = Number(header.NAXIS1) || 0; const height = Number(header.NAXIS2) || 0;
  if (width >= 16 && height >= 16 && values.length && dataOffset + width * height * bytesPer <= bytes.length) { const step = Math.max(1, Math.ceil(width / 640)); const previewWidth = Math.floor(width / step); const previewHeight = Math.floor(height / step); const rgba = new Uint8Array(previewWidth * previewHeight * 4); const low = values[Math.floor(values.length * 0.01)]; const high = values[Math.floor(values.length * 0.995)]; for (let y = 0; y < previewHeight; y += 1) for (let x = 0; x < previewWidth; x += 1) { const value = readPixel(y * step * width + x * step); const level = Math.round(Math.max(0, Math.min(255, ((value - low) / Math.max(1e-9, high - low)) * 255))); const offset = (y * previewWidth + x) * 4; rgba[offset] = rgba[offset + 1] = rgba[offset + 2] = level; rgba[offset + 3] = 255; } quality = analyseRgba(rgba, previewWidth, previewHeight); }
  return { format: "FITS", width: width || null, height: height || null, channels: Number(header.NAXIS3) || 1, bitDepth: `BITPIX ${bitpix}`, object: String(header.OBJECT ?? "") || null, filter: String(header.FILTER ?? "") || null, exposureSeconds: Number(header.EXPTIME ?? header.EXPOSURE) || null, gain: Number(header.GAIN ?? header.EGAIN) || null, temperature: Number(header["CCD-TEMP"] ?? header["SET-TEMP"]) || null, dateObserved: String(header["DATE-OBS"] ?? "") || null, median: values.length ? values[Math.floor(values.length / 2)] : null, minimum: values.length ? values[0] : null, maximum: values.length ? values[values.length - 1] : null, starCount: quality?.starCount ?? null, fwhmPixels: quality?.fwhmPixels ?? null, eccentricity: quality?.eccentricity ?? null, clippedPercent: quality?.clippedPercent ?? null, histogram, notes: values.length ? [`Sampled ${values.length.toLocaleString()} pixels locally`, quality ? "Star quality measured from a locally stretched preview" : "Frame is too small for star-shape analysis"] : ["Pixel statistics are unavailable for this FITS data layout"] };
}

export function inspectXisf(bytes: Uint8Array): AstroFileInspection {
  const signature = new TextDecoder("ascii").decode(bytes.slice(0, 8)); if (signature !== "XISF0100") throw new Error("This does not contain a valid XISF signature.");
  const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(8, true); const xml = new TextDecoder().decode(bytes.slice(16, 16 + length));
  const geometry = xml.match(/geometry="(\d+):(\d+)(?::(\d+))?"/); const sample = xml.match(/sampleFormat="([^"]+)"/);
  const property = (id: string) => xml.match(new RegExp(`<Property[^>]+id="${id}"[^>]+value="([^"]+)"`))?.[1] ?? null;
  return { format: "XISF", width: geometry ? Number(geometry[1]) : null, height: geometry ? Number(geometry[2]) : null, channels: geometry ? Number(geometry[3] ?? 1) : null, bitDepth: sample?.[1] ?? "Unknown", object: property("Observation:Object:Name"), filter: property("Instrument:Filter:Name"), exposureSeconds: Number(property("Instrument:ExposureTime")) || null, gain: Number(property("Instrument:Camera:Gain")) || null, temperature: Number(property("Instrument:Sensor:Temperature")) || null, dateObserved: property("Observation:Time:Start"), median: null, minimum: null, maximum: null, starCount: null, fwhmPixels: null, eccentricity: null, clippedPercent: null, histogram: null, notes: ["XISF metadata parsed locally", "Pixel statistics require decoding the image block; compressed XISF previews are not altered or uploaded"] };
}

export function inspectAstroFile(bytes: Uint8Array, name: string) { return name.toLowerCase().endsWith(".xisf") ? inspectXisf(bytes) : inspectFits(bytes); }
