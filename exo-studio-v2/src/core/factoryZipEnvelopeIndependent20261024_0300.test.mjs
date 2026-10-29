import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, strToU8} from 'fflate'
import {auditFactoryZipEnvelope20261024_0154 as audit} from './factoryZipEnvelope20261024_0154.mjs'

const make = names => zipSync(Object.fromEntries(names.map(name => [name, strToU8('safe')])), {level: 0})
const view = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
const verdict = bytes => {
  const result = audit(bytes)
  assert.equal(result.manufacturingApproved, false)
  return result
}

test('normalization-equivalent Unicode filenames currently bypass duplicate-path check', () => {
  const names = ['caf\u00e9.dxf', 'cafe\u0301.dxf']
  assert.equal(names[0].normalize('NFC'), names[1].normalize('NFC'))
  const result = verdict(make(names))
  // Captures a current validation gap, pending a fail-closed canonical-path policy.
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics))
})

test('payload CRC mismatch currently passes envelope because it does not read or checksum payload data', () => {
  const bytes = make(['part.dxf'])
  assert.equal(verdict(bytes).ok, true)
  bytes[30 + 'part.dxf'.length] ^= 0x01
  const result = verdict(bytes)
  // Regression evidence for the envelope/integrity boundary; requires a separate CRC/content guard.
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics))
})

test('contradictory local and central external file attributes currently pass the envelope', () => {
  const bytes = make(['part.dxf'])
  const v = view(bytes)
  const end = bytes.length - 22
  const central = v.getUint32(end + 16, true)
  assert.equal(v.getUint32(central, true), 0x02014b50)
  // Mark the entry as a Unix symbolic link using central-directory creator and mode bits.
  v.setUint16(central + 4, (3 << 8) | 20, true)
  v.setUint32(central + 38, (0o120777 << 16) >>> 0, true)
  const result = verdict(bytes)
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics))
})
