import test from 'node:test'
import assert from 'node:assert/strict'
import { zipSync, strFromU8, strToU8 } from 'fflate'
import { createTeeTemplate } from '../data/templates.js'
import { sha256Bytes } from './sha256Bytes.js'
import { buildAccuMarkGuardedFactoryPackage20261023 } from './accumarkGuardedFactoryPackage20261023.js'
import { requireAccuMarkGuardedFactoryPostZipParity20261024 as verify } from './accumarkGuardedFactoryPostZipGate20261024.mjs'

const project = createTeeTemplate()
const original = structuredClone(project)
const built = buildAccuMarkGuardedFactoryPackage20261023(project, { zip: true })

test('serialized six-size download is independently extracted and source-parity checked', () => {
  assert.equal(built.ok, true, built.reason)
  assert.deepEqual(verify(built.zip, built.files, project), {
    ok: true, manufacturingApproved: false, physicalRegistrationVerified: false,
  })
  assert.deepEqual(project, original)
})

test('post-ZIP check rejects changed, truncated, oversized, and extra-entry archives', () => {
  assert.equal(built.ok, true, built.reason)
  const changed = Uint8Array.from(built.zip)
  changed[0] ^= 0xff
  assert.throws(() => verify(changed, built.files, project), /ZIP .*refused/)
  assert.throws(() => verify(built.zip.subarray(0, built.zip.length - 8), built.files, project), /ZIP .*refused/)
  assert.throws(() => verify(new Uint8Array(16 * 1024 * 1024 + 1), built.files, project), /oversized archive/)
  const extra = zipSync({ ...built.files, 'extra.txt': strToU8('unauthorized') }, { level: 6 })
  assert.throws(() => verify(extra, built.files, project), /inventory differs/)
})

test('post-ZIP check rejects an archive whose payload differs from its expected file map', () => {
  assert.equal(built.ok, true, built.reason)
  const changed = { ...built.files }
  const path = Object.keys(changed).find(key => key.endsWith('.svg') && key.startsWith('markers/'))
  assert.ok(path)
  changed[path] = Uint8Array.from(changed[path])
  changed[path][0] ^= 1
  assert.throws(() => verify(built.zip, changed, project), /extracted bytes differ/)
})

test('forged matching local and central CRC fields are rejected despite identical extracted files', () => {
  assert.equal(built.ok, true, built.reason)
  const altered = Uint8Array.from(built.zip)
  const view = new DataView(altered.buffer)
  let eocd = altered.length - 22
  while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--
  assert.ok(eocd >= 0)
  const central = view.getUint32(eocd + 16, true)
  const local = view.getUint32(central + 42, true)
  const forgedCrc = view.getUint32(central + 16, true) ^ 1
  view.setUint32(central + 16, forgedCrc, true)
  view.setUint32(local + 14, forgedCrc, true)
  assert.throws(() => verify(altered, built.files, project), /CRC_MISMATCH/)
})

test('forged and rehashed cutting geometry is rejected even if extracted bytes match forged source map', () => {
  assert.equal(built.ok, true, built.reason)
  const forged = { ...built.files }
  const path = Object.keys(forged).find(key => key.startsWith('markers/') && key.endsWith('.svg'))
  assert.ok(path)
  const source = strFromU8(forged[path])
  const edited = source.replace(/(<polygon\s+[^>]*points=")([\d.]+),/, (_, prefix, x) => `${prefix}${Number(x) + 0.75},`)
  assert.notEqual(edited, source)
  forged[path] = strToU8(edited)
  const manifest = JSON.parse(strFromU8(forged['manifest.json']))
  manifest.sha256[path] = sha256Bytes(forged[path])
  forged['manifest.json'] = strToU8(JSON.stringify(manifest))
  const zip = zipSync(forged, { level: 6 })
  assert.throws(() => verify(zip, forged, project), /source-derived parity refused: MARKER_SVG_PARITY/)
})

test('post-ZIP check rejects an otherwise valid archive for the wrong authored source', () => {
  assert.equal(built.ok, true, built.reason)
  const other = structuredClone(project)
  other.markerSettings.fabricWidthCm += 10
  assert.throws(() => verify(built.zip, built.files, other), /source-derived parity refused/)
})
