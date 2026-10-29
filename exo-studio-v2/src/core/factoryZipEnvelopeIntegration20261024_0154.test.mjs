import test from 'node:test'
import assert from 'node:assert/strict'
import {unzipSync} from 'fflate'
import {createTeeTemplate} from '../data/templates.js'
import {buildGuardedFactoryManifestZip20261024_0053} from './guardedFactoryManifestZip20261024_0053.mjs'
import {auditFactoryPackageManifestBrowser20261024_0053} from './factoryPackageManifestBrowser20261024_0053.mjs'
import {auditFactoryZipEnvelope20261024_0154} from './factoryZipEnvelope20261024_0154.mjs'

test('real six-size Foundation Tee ZIP passes independent raw envelope and extracted manifest checks without manufacturing approval', () => {
  const project = createTeeTemplate()
  const before = structuredClone(project)
  const built = buildGuardedFactoryManifestZip20261024_0053(project)
  assert.equal(built.ok, true, built.reason || JSON.stringify(built.diagnostics))
  assert.equal(built.manufacturingApproved, false)
  assert.equal(built.factoryCertified, false)
  const raw = auditFactoryZipEnvelope20261024_0154(built.bytes)
  assert.deepEqual(raw, {ok:true, diagnostics:[], manufacturingApproved:false})
  const extracted = unzipSync(built.bytes)
  assert.equal(Object.keys(extracted).filter(path => path.startsWith('patterns/') && path.endsWith('.dxf')).length, 6)
  const manifest = auditFactoryPackageManifestBrowser20261024_0053(extracted, project)
  assert.equal(manifest.ok, true, JSON.stringify(manifest.diagnostics))
  assert.equal(manifest.manufacturingApproved, false)
  assert.deepEqual(project, before)
})
