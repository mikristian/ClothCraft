import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildIndex, searchIndex, runCli, DEFAULT_CATALOG } from './pattern-intelligence-library-20261023.mjs';

test('real catalog searchable by garment, provenance, and size without granting rights', async () => {
  const catalog = JSON.parse(await readFile(DEFAULT_CATALOG, 'utf8'));
  const index = buildIndex(catalog);
  assert.equal(index.length, 331);
  assert.equal(index.filter(x => x.collection === 'github_original_references').length, 10);
  assert.equal(index.filter(x => x.collection === 'github_derived_garmentcode').length, 36);
  const skirt34 = searchIndex(index, { garment: 'skirt', size: '34', source: 'pattern-making-skill' });
  assert.ok(skirt34.length >= 1);
  assert.ok(skirt34.every(x => x.size === '34' && x.garmentTerms.includes('skirt')));
  const tee = searchIndex(index, { query: 'classic tee', source: 'ksons/astm-parser' });
  assert.equal(tee.length, 1);
  assert.equal(tee[0].factoryApproved, false);
  assert.match(tee[0].licenseStatus, /no training or redistribution approval/);
  assert.equal(searchIndex(index, { garment: 'jacket', size: '34' }).length >= 1, true);
});

test('CLI JSON results carry provenance and certification warning', async () => {
  const output = [];
  const exit = await runCli(['--garment', 'skirt', '--size', '34', '--limit', '1', '--json'], value => output.push(value));
  assert.equal(exit, 0);
  const json = JSON.parse(output.join('\n'));
  assert.equal(json.shown, 1);
  assert.equal(json.factoryCertified, false);
  assert.equal(json.thirdPartyFixtureLicensesApprovedForTraining, false);
  assert.equal(json.results[0].size, '34');
  assert.equal(typeof json.results[0].source, 'string');
  assert.equal(typeof json.results[0].licenseStatus, 'string');
  assert.equal('searchText' in json.results[0], false);
});

test('invalid catalog and unsupported CLI options fail closed', async () => {
  assert.throws(() => buildIndex({ files: [] }), /Unsupported/);
  await assert.rejects(runCli(['--limit', '-1']), /--limit/);
  await assert.rejects(runCli(['--unknown', 'x']), /Invalid option/);
});
