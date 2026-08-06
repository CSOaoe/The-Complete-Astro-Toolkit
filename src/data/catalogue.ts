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

export const catalogueFamilies = [
  { id: "All", label: "All catalogues" },
  { id: "Messier", label: "Messier" },
  { id: "Caldwell", label: "Caldwell" },
  { id: "NGC", label: "NGC" },
  { id: "IC", label: "IC" },
  { id: "Sharpless", label: "Sharpless" },
  { id: "RCW", label: "RCW" },
  { id: "PGC", label: "PGC" },
  { id: "UGC", label: "UGC" },
  { id: "ESO", label: "ESO" },
  { id: "PK", label: "PK" },
  { id: "Collinder", label: "Collinder" },
  { id: "Comets", label: "Comets" },
] as const;

export type CatalogueFamily = (typeof catalogueFamilies)[number]["id"];

export function normalizeCatalogueQuery(value: string) {
  const compact = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return compact
    .replace(/^messier(?:catalogue)?(?:number)?/, "m")
    .replace(/^caldwell(?:catalogue)?(?:number)?/, "c")
    .replace(/^sharpless(?:catalogue)?(?:number)?/, "sh2")
    .replace(/^sharpless2/, "sh2")
    .replace(/^collinder(?:catalogue)?(?:number)?/, "col");
}

const crossCatalogueDesignations: Record<string, string[]> = {
  ic59: ["Sh2-185", "Sharpless 185"],
  ic63: ["Sh2-185", "Sharpless 185"],
};

function designationsFor(catalogue: string) {
  return [
    catalogue,
    ...(crossCatalogueDesignations[normalizeCatalogueQuery(catalogue)] ?? []),
  ];
}

function queryMatches(query: string, values: string[]) {
  const plainNeedle = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!plainNeedle) return true;
  const designationNeedle = normalizeCatalogueQuery(query);
  return values.some((value) => {
    const plainValue = value.toLowerCase().replace(/\s+/g, " ");
    return (
      plainValue.includes(plainNeedle) ||
      normalizeCatalogueQuery(value).includes(designationNeedle)
    );
  });
}

function familyMatches(
  family: CatalogueFamily,
  designations: string[],
  objectKind: CatalogueObject["objectKind"],
) {
  if (family === "All") return true;
  if (family === "Comets") return objectKind === "comet";
  if (objectKind === "comet") return false;
  const prefixes: Record<Exclude<CatalogueFamily, "All" | "Comets">, string[]> = {
    Messier: ["m"],
    Caldwell: ["c"],
    NGC: ["ngc"],
    IC: ["ic"],
    Sharpless: ["sh2"],
    RCW: ["rcw"],
    PGC: ["pgc"],
    UGC: ["ugc"],
    ESO: ["eso"],
    PK: ["pk"],
    Collinder: ["col"],
  };
  return designations.some((designation) => {
    const normalized = normalizeCatalogueQuery(designation);
    return prefixes[family].some((prefix) => normalized.startsWith(prefix));
  });
}
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
  family: CatalogueFamily = "All",
): CatalogueObject[] {
  const results: CatalogueObject[] = [];
  if (category !== "Comets" && family !== "Comets") {
    for (const target of targets) {
      const item = fromCurated(target);
      if (
        categoryMatches(item.type, category) &&
        familyMatches(family, target.identifiers, item.objectKind) &&
        queryMatches(query, [item.name, ...target.identifiers, item.constellation, item.type])
      )
        results.push(item);
    }
    for (const row of rows) {
      if (results.length >= limit) break;
      if (
        curatedCatalogues.has(row.c.replace(/\s/g, "").toLowerCase()) ||
        !categoryMatches(row.t, category) ||
        !familyMatches(family, designationsFor(row.c), "deep-sky")
      )
        continue;
      if (queryMatches(query, [...designationsFor(row.c), row.n, row.k, row.t]))
        results.push(fromRow(row));
    }
  }
  if (
    (category === "All" || category === "Comets") &&
    (family === "All" || family === "Comets") &&
    results.length < limit
  ) {
    const date = new Date();
    for (const row of cometRows) {
      if (results.length >= limit) break;
      if (queryMatches(query, [row.d, row.n, row.c, "comet"]))
        results.push(fromComet(row, date));
    }
  }
  return results.slice(0, limit);
}

export function catalogueObjectMatchesQuery(item: CatalogueObject, query: string) {
  return queryMatches(query, [
    item.name,
    item.catalogue,
    item.constellation,
    item.type,
    ...(item.curated?.identifiers ?? []),
  ]);
}

export function catalogueObjectMatchesFamily(
  item: CatalogueObject,
  family: CatalogueFamily,
) {
  return familyMatches(
    family,
    [item.catalogue, ...(item.curated?.identifiers ?? [])],
    item.objectKind,
  );
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
