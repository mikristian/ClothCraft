import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {unzipSync, strFromU8} from 'fflate'
import {auditAccuMarkCadInterchangeReceiving20261024 as audit} from './accumarkCadInterchangeReceivingQA20261024.mjs'

// Independent Seamly2D-generated 48/52 source geometry, not a licensed
// receiver's export and never evidence of manufacturing authorization.
const packet = readFileSync('research/oss/pattern-cad/runtime/verified-exports/seamly-48-52-cad-receiver-evaluation-NOT-APPROVED.zip')
const files = unzipSync(packet)
const size48 = strFromU8(files['graded-aama/seamly-size-48.dxf'])
const size52 = strFromU8(files['graded-aama/seamly-size-52.dxf'])

test('string-keyed receiver Map covers both sizes without false missing DXF', async () => {
  const result = await audit(packet, {receiverDxfs: new Map([['48', size48], ['52', size52]])})
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.deepEqual(result.sizes.map(s => [s.sizeCm, s.receiverCompared]), [[48, true], [52, true]])
  assert.equal(result.receiverGeometryCompared, true)
  assert.equal(result.receivingCadVerified, false)
  assert.equal(result.cuttingAuthorized, false)
})

test('mixed canonical numeric and string Map keys cover all grades', async () => {
  const result = await audit(packet, {receiverDxfs: new Map([[48, size48], ['52', size52]])})
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.receivingCadVerified, false)
})

test('duplicate numeric and string representation of same size is blocked', async () => {
  const result = await audit(packet, {receiverDxfs: new Map([[48, size48], ['48', size48], [52, size52]])})
  assert.equal(result.ok, false)
  assert(result.issues.some(issue => issue.code === 'RECEIVER_DUPLICATE'))
  assert.equal(result.receivingCadVerified, false)
})

test('noncanonical, extra and missing receiver size identities fail closed', async () => {
  for (const [map, code] of [
    [new Map([['048', size48], ['52', size52]]), 'RECEIVER_INPUT'],
    [new Map([[48, size48], [52, size52], [50, size48]]), 'RECEIVER_INPUT'],
    [new Map([[48, size48]]), 'RECEIVER_MISSING'],
    [new Map([[{size: 48}, size48], [52, size52]]), 'RECEIVER_INPUT'],
  ]) {
    const result = await audit(packet, {receiverDxfs: map})
    assert.equal(result.ok, false, JSON.stringify(result.issues))
    assert(result.issues.some(issue => issue.code === code), JSON.stringify(result.issues))
    assert.equal(result.manufacturingApproved, false)
  }
})

test('receiver Map subclass cannot intercept size lookup', async () => {
  class AdversarialMap extends Map {
    get() { throw Error('untrusted getter invoked') }
    entries() { throw Error('untrusted entries invoked') }
  }
  const result = await audit(packet, {receiverDxfs: new AdversarialMap([['48', size48], ['52', size52]])})
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal(result.receivingCadVerified, false)
})

test('string-keyed Map still detects genuine per-size geometry loss', async () => {
  const altered = size48.replace(/\n\s*10\s*\n\s*(-?\d+\.\d+)/,
    (_match, value) => '\n 10\n' + String(Number(value) + 5))
  assert.notEqual(altered, size48)
  const result = await audit(packet, {receiverDxfs: new Map([['48', altered], ['52', size52]])})
  assert.equal(result.ok, false)
  assert(result.issues.some(issue => issue.code === 'GEOMETRY_LOSS' || issue.code === 'DXF_PARSE_OR_COMPARE'))
  assert.equal(result.receiverGeometryCompared, false)
  assert.equal(result.receivingCadVerified, false)
})
