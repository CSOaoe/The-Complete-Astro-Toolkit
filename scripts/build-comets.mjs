import { writeFile } from "node:fs/promises";

const fields = [
  "spkid",
  "pdes",
  "full_name",
  "prefix",
  "class",
  "e",
  "q",
  "i",
  "om",
  "w",
  "tp",
  "epoch",
  "H",
];
const params = new URLSearchParams({
  fields: fields.join(","),
  "sb-kind": "c",
  "sb-xfrag": "1",
  limit: "5000",
});
const endpoint = `https://ssd-api.jpl.nasa.gov/sbdb_query.api?${params}`;
const response = await fetch(endpoint, {
  headers: { "User-Agent": "AstroToolkit catalogue builder" },
});

if (!response.ok) {
  throw new Error(`JPL SBDB request failed: ${response.status} ${response.statusText}`);
}

const payload = await response.json();
if (
  payload.signature?.version !== "1.0" ||
  !payload.signature?.source?.includes("NASA/JPL SBDB")
) {
  throw new Error("Unexpected JPL SBDB response signature");
}

const column = Object.fromEntries(payload.fields.map((field, index) => [field, index]));
const numberOrNull = (value) => {
  const parsed = Number(value);
  return value === null || value === "" || !Number.isFinite(parsed) ? null : parsed;
};

const comets = payload.data
  .map((row) => ({
    s: String(row[column.spkid]),
    d: String(row[column.pdes] ?? "").trim(),
    n: String(row[column.full_name] ?? row[column.pdes] ?? "").trim(),
    p: String(row[column.prefix] ?? "").trim(),
    c: String(row[column.class] ?? "COM").trim(),
    e: numberOrNull(row[column.e]),
    q: numberOrNull(row[column.q]),
    i: numberOrNull(row[column.i]),
    o: numberOrNull(row[column.om]),
    w: numberOrNull(row[column.w]),
    t: numberOrNull(row[column.tp]),
    x: numberOrNull(row[column.epoch]),
    h: numberOrNull(row[column.H]),
  }))
  .filter(
    (comet) =>
      comet.n &&
      comet.e !== null &&
      comet.q !== null &&
      comet.i !== null &&
      comet.o !== null &&
      comet.w !== null &&
      comet.t !== null,
  );

await writeFile(
  new URL("../src/data/comets.generated.json", import.meta.url),
  `${JSON.stringify(comets)}\n`,
  "utf8",
);

console.log(
  `Wrote ${comets.length.toLocaleString()} comets from ${payload.signature.source} v${payload.signature.version}.`,
);
