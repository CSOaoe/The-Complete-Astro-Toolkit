import { validComposition } from "./compositions";
export const BACKUP_KEYS = [
  "projects",
  "equipment",
  "favourites",
  "observer",
  "sessions",
  "horizon",
  "calibration",
  "theme",
  "power-plan",
  "imaging-campaigns",
  "alert-categories",
  "compositions",
  "tool-favourites",
  "tool-recents",
  "weather-observations",
].map((k) => `@astrotoolkit/${k}`);
export interface PortableBackup {
  format: "AstroToolkit";
  version: 1;
  createdAt: string;
  data: Record<string, string>;
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
function rows(value: unknown, text: string[], numbers: string[] = []) {
  return (
    Array.isArray(value) &&
    value.length <= 50000 &&
    value.every(
      (v) =>
        record(v) &&
        text.every((k) => typeof v[k] === "string") &&
        numbers.every((k) => typeof v[k] === "number" && Number.isFinite(v[k])),
    )
  );
}
export function validateBackupValue(key: string, v: unknown): boolean {
  const name = key.replace("@astrotoolkit/", "");
  if (
    [
      "favourites",
      "tool-favourites",
      "tool-recents",
      "alert-categories",
    ].includes(name) ||
    name.startsWith("session-checklist/")
  )
    return strings(v);
  if (name === "theme") return ["light", "dark", "red"].includes(v as string);
  if (name === "equipment")
    return (
      record(v) &&
      rows(
        v.telescopes,
        ["id", "name"],
        ["aperture", "focalLength", "focalRatio"],
      ) &&
      rows(
        v.cameras,
        ["id", "name"],
        [
          "sensorWidth",
          "sensorHeight",
          "pixelSize",
          "resolutionWidth",
          "resolutionHeight",
        ],
      ) &&
      rows(v.filters, ["id", "name", "filterType"], ["bandwidth"]) &&
      rows(v.rigs, ["id", "name", "telescopeId", "cameraId"]) &&
      (v.rigs as Record<string, unknown>[]).every((r) => strings(r.filterIds))
    );
  if (name === "observer")
    return (
      record(v) &&
      typeof v.label === "string" &&
      typeof v.updatedAt === "string" &&
      ["default", "manual", "device"].includes(v.source as string) &&
      typeof v.latitude === "number" &&
      Math.abs(v.latitude) <= 90 &&
      typeof v.longitude === "number" &&
      Math.abs(v.longitude) <= 180
    );
  if (name === "projects")
    return rows(
      v,
      [
        "id",
        "target",
        "telescope",
        "camera",
        "filter",
        "notes",
        "status",
        "createdAt",
      ],
      ["exposureLength", "exposureCount"],
    );
  if (name === "sessions")
    return rows(
      v,
      [
        "id",
        "date",
        "targetId",
        "targetName",
        "startTime",
        "locationName",
        "rigName",
        "notes",
        "status",
        "createdAt",
      ],
      ["durationMinutes"],
    );
  if (name === "horizon")
    return (
      record(v) &&
      typeof v.enabled === "boolean" &&
      typeof v.label === "string" &&
      typeof v.updatedAt === "string" &&
      rows(v.points, [], ["azimuthDegrees", "elevationDegrees"])
    );
  if (name === "calibration")
    return rows(
      v,
      ["id", "type", "camera", "filter", "createdAt", "notes"],
      ["gain", "exposureSeconds", "binning", "frameCount"],
    );
  if (name === "imaging-campaigns")
    return rows(
      v,
      ["id", "targetId", "targetName", "rigId", "createdAt"],
      ["requiredHours", "capturedHours", "nightsToPlan"],
    );
  if (name === "compositions")
    return Array.isArray(v) && v.length <= 50000 && v.every(validComposition);
  if (name === "weather-observations")
    return rows(
      v,
      ["id", "time", "site", "notes"],
      ["latitude", "longitude", "cloud", "seeing"],
    );
  if (name === "power-plan")
    return (
      record(v) &&
      Object.values(v).every(
        (x) => typeof x === "string" || typeof x === "number",
      )
    );
  return false;
}
export function isBackupKey(key: string) {
  return (
    BACKUP_KEYS.includes(key) ||
    /^@astrotoolkit\/session-checklist\/[a-zA-Z0-9_-]+$/.test(key)
  );
}
export function parseBackup(text: string): PortableBackup {
  if (text.length > 10_000_000)
    throw new Error("Backup exceeds the 10 MB limit.");
  const b: unknown = JSON.parse(text);
  if (
    !record(b) ||
    b.format !== "AstroToolkit" ||
    b.version !== 1 ||
    typeof b.createdAt !== "string" ||
    !Number.isFinite(Date.parse(b.createdAt)) ||
    !record(b.data)
  )
    throw new Error("This is not a supported AstroToolkit backup.");
  for (const [key, raw] of Object.entries(b.data)) {
    if (!isBackupKey(key) || typeof raw !== "string")
      throw new Error("Backup contains an unsupported setting.");
    const value = key.endsWith("/theme") ? raw : JSON.parse(raw);
    if (!validateBackupValue(key, value))
      throw new Error(
        `Invalid backup data: ${key.replace("@astrotoolkit/", "")}`,
      );
  }
  if (
    !["equipment", "observer", "projects", "sessions", "favourites"].every(
      (k) => `@astrotoolkit/${k}` in (b.data as object),
    )
  )
    throw new Error("The backup is missing essential observing data.");
  return b as unknown as PortableBackup;
}
