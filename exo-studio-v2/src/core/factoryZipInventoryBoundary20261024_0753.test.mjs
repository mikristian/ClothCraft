import test from 'node:test'
import assert from 'node:assert/strict'
import {unzipSync, zipSync} from 'fflate'
import {createTeeTemplate} from '../data/templates.js'
import {buildGuardedFactoryManifestZip20261024_0053} from './guardedFactoryManifestZip20261024_0053.mjs'
import {auditFactoryZipResourceBudget20261024_0600} from './factoryZipResourceBudget20261024_0600.mjs'
import {auditFactoryPackageManifestBrowser20261024_0053} from './factoryPackageManifestBrowser20261024_0053.mjs'

const MAX_RESOURCE_ENTRIES = 80

function foundationArchive() {
  const project = createTeeTemplate()
  const result = buildGuardedFactoryManifestZip20261024_0053(project)
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics ?? result.reason))
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.factoryCertified, false)
  return result
}

test('generated factory ZIP inventory is exact, bounded and not manufacturing-approved', () => {
  const archive = foundationArchive()
  const originalBytes = archive.bytes.slice()
  const entries = unzipSync(archive.bytes)
  const names = Object.keys(entries)
  assert.equal(names.length, archive.fileCount, 'serialized entries must match the generator inventory')
  assert.ok(names.length <= MAX_RESOURCE_ENTRIES, 'the independent resource guard must have entry headroom')
  assert.ok(names.includes('manifest.json'), 'manifest must be present')
  for (const size of ['xs', 's', 'm', 'l', 'xl', 'xxl']) {
    assert.ok(names.includes(`patterns/foundation-tee-first-fit-test-${size}.dxf`), `missing ${size} CUT DXF`)
  }
  const audit = auditFactoryZipResourceBudget20261024_0600(archive.bytes)
  assert.equal(audit.ok, true, JSON.stringify(audit.diagnostics))
  assert.equal(audit.manufacturingApproved, false)
  assert.deepEqual(archive.bytes, originalBytes, 'verification must not mutate source bytes')
})

test('resource entry ceiling accepts exactly 80 entries and refuses 81', () => {
  const archive = foundationArchive()
  const entries = unzipSync(archive.bytes)
  const count = Object.keys(entries).length
  assert.ok(count <= MAX_RESOURCE_ENTRIES, 'base package already exceeds resource policy')
  const additions = Array.from({length: MAX_RESOURCE_ENTRIES + 1 - count}, (_, i) =>
    [`inventory-probe-${i + 1}.txt`, new TextEncoder().encode(`probe ${i + 1}`)])
  const atLimit = zipSync({...entries, ...Object.fromEntries(additions.slice(0, -1))}, {level: 0})
  const aboveLimit = zipSync({...entries, ...Object.fromEntries(additions)}, {level: 0})
  assert.equal(Object.keys(unzipSync(atLimit)).length, MAX_RESOURCE_ENTRIES)
  assert.equal(Object.keys(unzipSync(aboveLimit)).length, MAX_RESOURCE_ENTRIES + 1)
  const accepted = auditFactoryZipResourceBudget20261024_0600(atLimit)
  assert.equal(accepted.ok, true, JSON.stringify(accepted.diagnostics))
  assert.equal(accepted.manufacturingApproved, false)
  const manifestRefusal = auditFactoryPackageManifestBrowser20261024_0053(unzipSync(atLimit))
  assert.equal(manifestRefusal.ok, false, 'resource acceptance must not authorize extra package files')
  assert.equal(manifestRefusal.manufacturingApproved, false)
  assert.ok(manifestRefusal.diagnostics.some(d => d.code === 'INVENTORY'), JSON.stringify(manifestRefusal.diagnostics))
  const refused = auditFactoryZipResourceBudget20261024_0600(aboveLimit)
  assert.equal(refused.ok, false)
  assert.equal(refused.manufacturingApproved, false)
  assert.ok(refused.diagnostics.some(d => d.code === 'RESOURCE_ENTRY_BUDGET'), JSON.stringify(refused.diagnostics))
})
