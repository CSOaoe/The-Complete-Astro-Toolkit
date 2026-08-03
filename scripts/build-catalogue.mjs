import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const source = process.argv[2] ?? '.tmp-dso.csv';
const output = process.argv[3] ?? 'src/data/catalogue.generated.json';
const limit = Number(process.argv[4] ?? 50000);

function parseLine(line) {
  const values = []; let value = ''; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') { if (quoted && line[i + 1] === '"') { value += '"'; i += 1; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { values.push(value); value = ''; }
    else value += char;
  }
  values.push(value); return values;
}

const typeNames = {
  Gxy: 'Galaxy', GxyCld: 'Galaxy Cloud', GxyP: 'Galaxy Pair', GxyTrpl: 'Galaxy Triplet',
  OCl: 'Open Cluster', GCl: 'Globular Cluster', Cl: 'Cluster', 'Cl+N': 'Cluster + Nebula',
  Neb: 'Nebula', EmN: 'Emission Nebula', RfN: 'Reflection Nebula', DrkN: 'Dark Nebula',
  PN: 'Planetary Nebula', SNR: 'Supernova Remnant', HII: 'H II Region', Nova: 'Nova',
  '*Ass': 'Stellar Association', '*Cl': 'Star Cluster', '1Star': 'Star', '2Star': 'Double Star',
  '3Star': 'Triple Star', '*': 'Star', Other: 'Other', NonEx: 'Unverified Object', Dup: 'Duplicate',
};

const [header, ...lines] = readFileSync(source, 'utf8').split(/\r?\n/);
const columns = header.split(',');
const index = Object.fromEntries(columns.map((name, position) => [name, position]));
const catalogPriority = { M: 0, C: 1, NGC: 2, IC: 3, Col: 4, PK: 5, UGC: 6, ESO: 7, PGC: 8 };
const candidates = [];

for (const line of lines) {
  if (!line) continue;
  const row = parseLine(line); const cat = row[index.cat1]; const designation = row[index.id1];
  const ra = Number(row[index.ra]); const dec = Number(row[index.dec]);
  if (!cat || !designation || row[index.dupid] || !Number.isFinite(ra) || !Number.isFinite(dec)) continue;
  const magnitude = Number(row[index.mag]); const priority = catalogPriority[cat] ?? 9;
  candidates.push({
    score: priority * 100 + (Number.isFinite(magnitude) ? Math.min(magnitude, 30) : 40),
    value: {
      i: `h${row[index.id]}`, c: `${cat} ${designation}`, n: row[index.name] || '',
      t: typeNames[row[index.type]] ?? row[index.type] ?? 'Deep-sky object', k: row[index.const] || '',
      r: Number(ra.toFixed(6)), d: Number(dec.toFixed(6)),
      m: Number.isFinite(magnitude) ? Number(magnitude.toFixed(2)) : null,
      a: row[index.r1] ? Number((Number(row[index.r1]) * 2).toFixed(2)) : null,
      b: row[index.r2] ? Number((Number(row[index.r2]) * 2).toFixed(2)) : null,
      p: row[index.angle] ? Number(Number(row[index.angle]).toFixed(1)) : null,
    },
  });
}

candidates.sort((left, right) => left.score - right.score || left.value.c.localeCompare(right.value.c, undefined, { numeric: true }));
const catalogue = candidates.slice(0, limit).map(({ value }) => value);
mkdirSync(output.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
writeFileSync(output, `${JSON.stringify(catalogue)}\n`);
console.log(`Generated ${catalogue.length.toLocaleString()} deep-sky objects at ${output}.`);
