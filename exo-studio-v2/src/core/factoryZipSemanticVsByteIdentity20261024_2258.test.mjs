import test from 'node:test'
import assert from 'node:assert/strict'
import {zipSync, unzipSync} from 'fflate'
import {createTeeTemplate} from '../data/templates.js'
import {buildGuardedFactoryManifestZip20261024_0053} from './guardedFactoryManifestZip20261024_0053.mjs'
import {buildAccuMarkGuardedFactoryPackage20261023} from './accumarkGuardedFactoryPackage20261023.js'
import {requireAccuMarkGuardedFactoryPostZipParity20261024} from './accumarkGuardedFactoryPostZipGate20261024.mjs'

const build = () => {
  const project = createTeeTemplate()
  const archive = buildGuardedFactoryManifestZip20261024_0053(project)
  assert.equal(archive.ok, true, archive.reason)
  const original = buildAccuMarkGuardedFactoryPackage20261023(project, {zip: false})
  assert.equal(original.ok, true, original.reason)
  assert.ok(archive.bytes.byteLength <= 16 * 1024 * 1024)
  return {project, archive, source: original.files}
}

test('unchanged serialized factory archive satisfies fixed post-ZIP byte gate', () => {
  const {project, archive, source} = build()
  assert.deepEqual(requireAccuMarkGuardedFactoryPostZipParity20261024(archive.bytes, source, project), {
    ok: true, manufacturingApproved: false, physicalRegistrationVerified: false,
  })
})

test('repacked valid archive with PDF EOF whitespace mutation fails source byte identity', () => {
  const {project, archive, source} = build()
  const members = unzipSync(archive.bytes)
  const path = Object.keys(members).find(name => name.startsWith('markers/') && name.endsWith('.pdf'))
  assert.ok(path, 'must use an actual factory marker PDF')
  const original = members[path]
  const suffix = new TextDecoder().decode(original.subarray(Math.max(0, original.length - 80)))
  assert.match(suffix, /%%EOF\s*$/, 'mutation must occur after PDF EOF')
  // Whitespace after %%EOF adds no drawing commands or PDF objects.
  members[path] = Uint8Array.from([...original, 0x0a])
  assert.equal(members[path].byteLength, original.byteLength + 1)
  const tampered = zipSync(members, {level: 0})
  assert.ok(tampered.byteLength <= 16 * 1024 * 1024)
  assert.deepEqual(Object.keys(unzipSync(tampered)).sort(), Object.keys(source).sort())
  assert.deepEqual(unzipSync(tampered)[path], members[path], 'repack has valid extractable member content')
  assert.throws(
    () => requireAccuMarkGuardedFactoryPostZipParity20261024(tampered, source, project),
    /extracted bytes differ from source/,
  )
})
