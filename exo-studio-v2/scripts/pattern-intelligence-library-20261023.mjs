#!/usr/bin/env node
/** Read-only reference DXF discovery. Metadata is descriptive, never a manufacturing approval. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const DEFAULT_CATALOG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../download/garment-dxf-library-20261023/reports/library-catalog.json');
const GARMENTS = ['tee', 'shirt', 'tshirt', 'tank', 'racer', 'polo', 'jacket', 'coat', 'skirt', 'dress', 'pant', 'trouser', 'short', 'hoodie', 'sleeve', 'bodice', 'collar', 'block'];

function tokens(value) {
  return String(value ?? '').toLowerCase().replace(/([a-z])(\d)/g, '$1 $2').split(/[^a-z0-9]+/).filter(Boolean);
}
function garmentTerms(filename) {
  const words = tokens(filename);
  const found = GARMENTS.filter(term => words.includes(term));
  if (words.includes('t') && words.includes('shirt')) found.push('tshirt');
  return [...new Set(found)];
}
function sizeOf(filename) {
  const segments = String(filename).split('/');
  const stem = segments.at(-1)?.replace(/\.dxf$/i, '') ?? '';
  const candidates = [stem, ...segments.slice(0, -1).reverse()];
  for (const candidate of candidates) {
    const match = candidate.match(/(?:^|[_\s-])(?:pattern[_-]?|size[_-]?|sz[_-]?)(\d{2,3}|xxxl|xxl|xl|xs|s|m|l)(?=$|[_\s.-])/i);
    if (match) return match[1].toUpperCase();
    const labeled = candidate.match(/(?:^|[_\s-])(?:size|sz)[_\s-]?(\d{2,3}|xxxl|xxl|xl|xs|s|m|l)(?=$|[_\s.-])/i);
    if (labeled) return labeled[1].toUpperCase();
    if (/^\w+(?:-\w+)+-\d{2,3}$/.test(candidate) && garmentTerms(candidate).length) return candidate.match(/-(\d{2,3})$/)[1];
  }
  return null;
}

export function buildIndex(catalog) {
  if (!catalog || !Array.isArray(catalog.files) || catalog.schema !== 'exo.reference-dxf-library.v1') throw new Error('Unsupported or invalid DXF catalog');
  return catalog.files.map((entry, index) => {
    if (!entry || typeof entry.filename !== 'string' || typeof entry.source !== 'string') throw new Error(`Invalid catalog entry ${index}`);
    const filename = entry.filename;
    return {
      id: entry.sha256 || `catalog-${index}`,
      filename, collection: entry.collection, source: entry.source,
      garmentTerms: garmentTerms(filename), size: sizeOf(filename),
      format: entry.format ?? null, geometryEntityTags: entry.geometryEntityTags ?? null,
      bytes: entry.bytes ?? null, sha256: entry.sha256 ?? null,
      licenseStatus: entry.licenseStatus ?? 'unknown; review required',
      factoryApproved: entry.factoryApproved === true,
      envelopeOK: entry.envelopeOK === true, needsFullParser: entry.needsFullParser !== false,
      searchText: tokens([filename, entry.collection, entry.source].join(' ')).join(' '),
    };
  });
}

export function searchIndex(index, { query = '', garment = '', source = '', size = '', collection = '' } = {}) {
  const terms = tokens(query);
  const norm = value => String(value).toLowerCase();
  return index.filter(entry =>
    terms.every(term => entry.searchText.includes(term) || entry.garmentTerms.some(g => g.includes(term))) &&
    (!garment || entry.garmentTerms.some(g => g.includes(norm(garment))) || tokens(entry.filename).includes(norm(garment))) &&
    (!source || norm(entry.source).includes(norm(source))) &&
    (!size || norm(entry.size) === norm(size)) &&
    (!collection || norm(entry.collection).includes(norm(collection)))
  );
}

export async function runCli(argv, write = console.log) {
  const args = { catalog: DEFAULT_CATALOG, limit: 50, json: false };
  const names = new Set(['catalog', 'query', 'garment', 'source', 'size', 'collection', 'limit']);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') {
      write('Usage: node scripts/pattern-intelligence-library-20261023.mjs [--query words] [--garment tee] [--source github.com] [--size 34] [--collection generated_basic_blocks] [--limit 50] [--json] [--catalog path]');
      return 0;
    }
    if (arg === '--json') { args.json = true; continue; }
    const name = arg.startsWith('--') ? arg.slice(2) : '';
    if (!names.has(name) || i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error(`Invalid option or missing value: ${arg}`);
    args[name] = argv[++i];
  }
  const limit = Number(args.limit);
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 100000) throw new Error('--limit must be an integer between 0 and 100000');
  const catalog = JSON.parse(await readFile(args.catalog, 'utf8'));
  const matches = searchIndex(buildIndex(catalog), args);
  const shown = matches.slice(0, limit).map(({ searchText, ...entry }) => entry);
  if (args.json) write(JSON.stringify({ schema: 'exo.pattern-intelligence-index.v1', total: matches.length, shown: shown.length, factoryCertified: false, thirdPartyFixtureLicensesApprovedForTraining: false, results: shown }, null, 2));
  else {
    write(`Found ${matches.length} reference DXF entries (showing ${shown.length}); factory certification: none; respect each licenseStatus.`);
    for (const entry of shown) write(`${entry.filename} | garment=${entry.garmentTerms.join(',') || 'unknown'} | size=${entry.size ?? 'unknown'} | geometryTags=${entry.geometryEntityTags ?? 'unknown'} | source=${entry.source} | license=${entry.licenseStatus}`);
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
