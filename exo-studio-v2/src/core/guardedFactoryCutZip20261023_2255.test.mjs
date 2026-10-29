import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {unzipSync} from 'fflate'
import {createTeeTemplate} from '../data/templates.js'
import {buildGuardedFactoryPackageFiles20261023_2159} from './guardedFactoryCutPackage20261023_2159.mjs'
import {buildGuardedFactoryCutZip20261023_2255} from './guardedFactoryCutZip20261023_2255.mjs'

const decoder = new TextDecoder('utf-8', {fatal: true})
const dxfPaths = files => Object.keys(files).filter(path => /^patterns\/[^/]+\.dxf$/i.test(path)).sort()

function overlappingCutProject() {
  const base = createTeeTemplate()
  const rectangle = (id, name) => ({
    ...structuredClone(base.pieces[0]), id, name,
    points: [{x: 0, y: 0}, {x: 20, y: 0}, {x: 20, y: 20}, {x: 0, y: 20}],
    curves: {}, seamAllowance: 6, edgeSeamAllowances: {},
    notches: [], internalLines: [], buttonholes: [],
  })
  return {...base, productionSpec: undefined, pieces: [rectangle('cut-a', 'Cut A'), rectangle('cut-b', 'Cut B')], seams: []}
}

test('ZIP retains all six guarded graded DXF files byte for byte and no release approvals', () => {
  const project = createTeeTemplate()
  const snapshot = structuredClone(project)
  const guarded = buildGuardedFactoryPackageFiles20261023_2159(project)
  const result = buildGuardedFactoryCutZip20261023_2255(project)
  assert.ok(result.bytes instanceof Uint8Array)
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.factoryCertified, false)
  const unzipped = unzipSync(result.bytes)
  const paths = dxfPaths(guarded)
  assert.equal(paths.length, 6)
  assert.deepEqual(dxfPaths(unzipped), paths)
  for (const path of paths) assert.deepEqual(unzipped[path], guarded[path], `exact DXF bytes: ${path}`)
  assert.deepEqual(Object.keys(unzipped).sort(), Object.keys(guarded).sort(), 'all guarded files packaged')
  const manifest = JSON.parse(decoder.decode(unzipped['manifest.json']))
  const actualPaths = Object.keys(unzipped).sort()
  assert.deepEqual(manifest.files, actualPaths, 'manifest lists exactly the extracted ZIP paths')
  const payloadPaths = actualPaths.filter(path => path !== 'manifest.json')
  assert.deepEqual(Object.keys(manifest.sha256).sort(), payloadPaths, 'manifest hashes every non-manifest file, with no extra entries')
  for (const path of payloadPaths) {
    const digest = createHash('sha256').update(unzipped[path]).digest('hex')
    assert.equal(manifest.sha256[path], digest, `independent SHA-256 of extracted ${path}`)
  }
  const readiness = JSON.parse(decoder.decode(unzipped['manufacturing-release-readiness.json']))
  assert.equal(readiness.factoryCertified, false)
  assert.equal(readiness.factoryCuttingAuthorized, false)
  assert.equal(readiness.bulkProductionAuthorized, false)
  assert.deepEqual(project, snapshot)
})

test('overlapping physical CUT contours throw before any ZIP is returned', () => {
  const project = overlappingCutProject()
  const snapshot = structuredClone(project)
  assert.throws(() => buildGuardedFactoryCutZip20261023_2255(project), error =>
    error?.code === 'UNSAFE_FACTORY_DXF' && Array.isArray(error.diagnostics) && error.diagnostics.length > 0)
  assert.deepEqual(project, snapshot)
})
