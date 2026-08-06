import generated from "./catalogue.generated.json";
import generatedComets from "./comets.generated.json";
import { targets } from "./targets";
import { CatalogueObject, DeepSkyTarget } from "../types";
import { cometEquatorialPosition } from "../utils/comets";

interface CompactObject {
  i: string;
  c: string;
  n: string;
  t: string;
  k: string;
  r: number;
  d: number;
  m: number | null;
  a: number | null;
  b: number | null;
  p: number | null;
}
interface CompactComet {
  s: string;
  d: string;
  n: string;
  p: string;
  c: string;
  e: number;
  q: number;
  i: number;
  o: number;
  w: number;
  t: number;
  x: number | null;
  h: number | null;
}
const rows = generated as CompactObject[];
const cometRows = generatedComets as CompactComet[];
const curatedCatalogues = new Set(
  targets.flatMap((target) =>
    target.identifiers.map((id) => id.replace(/\s/g, "").toLowerCase()),
  ),
);

function parseRa(value: string) {
  const p = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [0];
  return p[0] + (p[1] ?? 0) / 60 + (p[2] ?? 0) / 3600;
}
function parseDec(value: string) {
  const p = value.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [0];
  const sign = value.includes("−") || value.includes("-") ? -1 : 1;
  return sign * (p[0] + (p[1] ?? 0) / 60 + (p[2] ?? 0) / 3600);
}
function fromCurated(target: DeepSkyTarget): CatalogueObject {
  return {
    id: target.id,
    name: target.name,
    catalogue: target.catalogue,
    type: target.type,
    constellation: target.constellation,
    raHours: parseRa(target.ra),
    decDegrees: parseDec(target.dec),
    magnitude: null,
    majorAxis: parseFloat(target.apparentSize) || null,
    minorAxis: null,
    positionAngle: null,
    objectKind: "deep-sky",
    curated: target,
  };
}
function fromRow(row: CompactObject): CatalogueObject {
  return {
    id: row.i,
    name: row.n || row.c,
    catalogue: row.c,
    type: row.t,
    constellation: row.k || "Unknown",
    raHours: row.r,
    decDegrees: row.d,
    magnitude: row.m,
    majorAxis: row.a,
    minorAxis: row.b,
    positionAngle: row.p,
    objectKind: "deep-sky",
  };
}

const cometClasses: Record<string, string> = {
  COM: "Long-period comet",
  JFC: "Jupiter-family comet",
  HTC: "Halley-type comet",
  ETc: "Encke-type comet",
  CEN: "Centaur comet",
  HYP: "Hyperbolic comet",
  PAR: "Parabolic comet",
};

function fromComet(row: CompactComet, date = new Date()): CatalogueObject {
  const orbitalElements = {
    eccentricity: row.e,
    perihelionDistanceAu: row.q,
    inclinationDegrees: row.i,
    ascendingNodeDegrees: row.o,
    argumentOfPerihelionDegrees: row.w,
    perihelionJulianDate: row.t,
    epochJulianDate: row.x,
  };
  const position = cometEquatorialPosition(orbitalElements, date);
  return {
    id: `comet-${row.s}`,
    name: row.n,
    catalogue: row.d || row.n,
    type: cometClasses[row.c] ?? "Comet",
    constellation: "Moving target",
    raHours: position.raHours,
    decDegrees: position.decDegrees,
    magnitude: null,
    majorAxis: null,
    minorAxis: null,
    positionAngle: null,
    objectKind: "comet",
    orbitClass: row.c,
    absoluteMagnitude: row.h,
    orbitalElements,
    positionDate: date.toISOString(),
  };
}

function categoryMatches(type: string, category: string) {
  if (category === "All") return true;
  if (category === "Comets") return false;
  if (category === "Galaxies") return type.includes("Galaxy");
  if (category === "Clusters")
    return type.includes("Cluster") || type.includes("Association");
  if (category === "Planetary") return type.includes("Planetary");
  return (
    type.includes("Nebula") ||
    type.includes("Region") ||
    type.includes("Remnant")
  );
}

export const cometCount = cometRows.length;
export const catalogueCount = rows.length + targets.length + cometRows.length;

export function skyAtlasObjects(limit = 700): CatalogueObject[] {
  const curated = targets.map(fromCurated);
  const bright = rows
    .filter((row) => row.m !== null && row.m <= 9)
    .sort((a, b) => (a.m ?? 99) - (b.m ?? 99))
    .slice(0, Math.max(0, limit - curated.length))
    .map(fromRow);
  return [...curated, ...bright];
}

export function searchCatalogue(
  query: string,
  category = "All",
  limit = 100,
): CatalogueObject[] {
  const needle = query.trim().toLowerCase();
  const results: CatalogueObject[] = [];
  if (category !== "Comets") {
    for (const target of targets) {
      const item = fromCurated(target);
      const haystack =
        `${item.name} ${target.identifiers.join(" ")} ${item.constellation}`.toLowerCase();
      if (
        categoryMatches(item.type, category) &&
        (!needle || haystack.includes(needle))
      )
        results.push(item);
    }
    for (const row of rows) {
      if (results.length >= limit) break;
      if (
        curatedCatalogues.has(row.c.replace(/\s/g, "").toLowerCase()) ||
        !categoryMatches(row.t, category)
      )
        continue;
      const haystack = `${row.c} ${row.n} ${row.k} ${row.t}`.toLowerCase();
      if (!needle || haystack.includes(needle)) results.push(fromRow(row));
    }
  }
  if ((category === "All" || category === "Comets") && results.length < limit) {
    const date = new Date();
    for (const row of cometRows) {
      if (results.length >= limit) break;
      const haystack = `${row.d} ${row.n} ${row.c} comet`.toLowerCase();
      if (!needle || haystack.includes(needle)) results.push(fromComet(row, date));
    }
  }
  return results.slice(0, limit);
}

export function getCatalogueObject(id: string): CatalogueObject | undefined {
  const curated = targets.find((target) => target.id === id);
  if (curated) return fromCurated(curated);
  const row = rows.find((item) => item.i === id);
  if (row) return fromRow(row);
  if (id.startsWith("comet-")) {
    const comet = cometRows.find((item) => `comet-${item.s}` === id);
    return comet ? fromComet(comet) : undefined;
  }
  return undefined;
}

export function formatRa(hours: number) {
  const h = Math.floor(hours);
  const minutesFloat = (hours - h) * 60;
  const m = Math.floor(minutesFloat);
  const s = Math.round((minutesFloat - m) * 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}
export function formatDec(degrees: number) {
  const sign = degrees < 0 ? "−" : "+";
  const absolute = Math.abs(degrees);
  const d = Math.floor(absolute);
  const minutesFloat = (absolute - d) * 60;
  const m = Math.floor(minutesFloat);
  const s = Math.round((minutesFloat - m) * 60);
  return `${sign}${String(d).padStart(2, "0")}° ${String(m).padStart(2, "0")}′ ${String(s).padStart(2, "0")}″`;
}
