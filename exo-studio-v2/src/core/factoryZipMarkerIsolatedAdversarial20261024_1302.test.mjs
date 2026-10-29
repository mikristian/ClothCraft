import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'
import { sha256Bytes } from './sha256Bytes.js'
import { auditFactoryZipMarkerIsolated20261024_1302 as audit, ISOLATED_MARKER_LIMITS_1302 as limits } from './factoryZipMarkerIsolated20261024_1302.mjs'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const fixture = () => buildFactoryPackageFiles(createTeeTemplate())
const codes = result => result.diagnostics.map(d => d.code)
const unapproved = result => {
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.physicalRegistrationVerified, false)
}
const rehash = files => {
  const manifest = JSON.parse(decoder.decode(files['manifest.json']))
  const paths = Object.keys(files).filter(p => p !== 'manifest.json')
  manifest.files = [...paths, 'manifest.json'].sort()
  manifest.sha256 = Object.fromEntries(paths.map(p => [p, sha256Bytes(files[p])]))
  files['manifest.json'] = encoder.encode(JSON.stringify(manifest))
}

test('real six-size package passes isolated marker audit but cannot approve manufacturing', async () => {
  const files = fixture()
  const prior = structuredClone(files)
  const result = await audit(files)
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics))
  assert.deepEqual(result.diagnostics, [])
  unapproved(result)
  assert.deepEqual(files, prior)
})

test('rehashing deliberately altered PDF media box is detected in child, preserving caller files', async () => {
  const files = fixture()
  const path = Object.keys(files).find(p => p.startsWith('markers/') && p.endsWith('.pdf'))
  assert.ok(path)
  const original = decoder.decode(files[path])
  const forged = original.replace(/(\/MediaBox \[0 0 )([\d.]+)/, (_, prefix, n) => prefix + (Number(n) + 3))
  assert.notEqual(forged, original)
  files[path] = encoder.encode(forged)
  rehash(files)
  const prior = structuredClone(files)
  const result = await audit(files)
  assert.equal(result.ok, false, JSON.stringify(result))
  assert.ok(codes(result).includes('MARKER_PDF_PARITY'), JSON.stringify(result.diagnostics))
  unapproved(result)
  assert.deepEqual(files, prior)
})

test('nested project accessors are rejected without executing getter', async () => {
  const files = fixture()
  const prior = structuredClone(files)
  const project = createTeeTemplate()
  let getterCalls = 0
  Object.defineProperty(project.pieces[0], 'points', { enumerable: true, get() { getterCalls++; throw Error('unsafe getter executed') } })
  const result = await audit(files, project)
  assert.equal(result.ok, false)
  assert.deepEqual(codes(result), ['ISOLATED_INPUT_REJECTED'])
  assert.equal(getterCalls, 0)
  unapproved(result)
  assert.deepEqual(files, prior)
})

test('input is snapshotted before async child: subsequent file edits do not alter verdict', async () => {
  const files = fixture()
  const cleanSnapshot = structuredClone(files)
  const pending = audit(files)
  files['garment-source.json'].fill(0)
  const initial = await pending
  assert.equal(initial.ok, true, JSON.stringify(initial.diagnostics))
  unapproved(initial)
  const corrupted = await audit(files)
  assert.equal(corrupted.ok, false)
  unapproved(corrupted)
  assert.notDeepEqual(files, cleanSnapshot)
})

test('invalid options-like inputs and cyclic projects fail closed; fixed runtime limits documented', async () => {
  const files = fixture()
  const cyclic = { name: 'cycle' }
  cyclic.self = cyclic
  const invalid = await audit(files, cyclic)
  assert.equal(invalid.ok, false)
  assert.deepEqual(codes(invalid), ['ISOLATED_INPUT_REJECTED'])
  unapproved(invalid)
  assert.equal(limits.timeoutMs, 12000)
  assert.ok(Number.isInteger(limits.heapMb) && limits.heapMb >= 64 && limits.heapMb <= 512)
  assert.equal(typeof limits.maxOutputBytes, 'number')
})
