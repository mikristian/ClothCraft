import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {createTeeTemplate} from '../data/templates.js'
import {buildGuardedFactoryPackageFiles20261023_2159} from './guardedFactoryCutPackage20261023_2159.mjs'
import {auditFactoryPackageManifest20261024_0000} from './factoryPackageManifestAudit20261024_0000.mjs'

const decoder = new TextDecoder('utf-8', {fatal:true})
const encoder = new TextEncoder()
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const readManifest = files => JSON.parse(decoder.decode(files['manifest.json']))
const saveManifest = (files, manifest) => { files['manifest.json'] = encoder.encode(JSON.stringify(manifest)) }
const cloneFiles = files => Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, bytes.slice()]))
const findDxf = files => Object.keys(files).find(path => /^patterns\/[^/]+\.dxf$/i.test(path))

// Build a real six-size export to avoid synthetic fixtures that omit mandatory assets.
const project = createTeeTemplate()
const expectedSizes = [...project.grading.sizes]
const baseline = buildGuardedFactoryPackageFiles20261023_2159(project)
const audit = files => auditFactoryPackageManifest20261024_0000(files, project)

function refuses(name, mutate) {
  test(name, () => {
    const files = cloneFiles(baseline)
    mutate(files)
    const result = audit(files)
    assert.equal(result?.ok, false, `${name} must fail closed`)
    assert.ok(Array.isArray(result?.diagnostics) && result.diagnostics.length > 0, 'actionable diagnostics')
    assert.notEqual(result?.manufacturingApproved, true)
    assert.notEqual(result?.factoryCertified, true)
  })
}

test('accepts byte-identical factory package containing six uniquely named size DXFs', () => {
  const result = audit(cloneFiles(baseline))
  assert.equal(result?.ok, true, JSON.stringify(result?.diagnostics))
  assert.notEqual(result?.manufacturingApproved, true)
  assert.notEqual(result?.factoryCertified, true)
  const manifest = readManifest(baseline)
  assert.deepEqual(manifest.files, Object.keys(baseline).sort())
  assert.equal(Object.keys(baseline).filter(path => /^patterns\/[^/]+\.dxf$/i.test(path)).length, 6)
  for (const [path, bytes] of Object.entries(baseline)) {
    if (path !== 'manifest.json') assert.equal(manifest.sha256[path], hash(bytes))
  }
})

refuses('rejects an unlisted extra archive path', files => { files['hidden-payload.txt'] = encoder.encode('extra') })
test('allows an additional safe file when declared and correctly hashed', () => {
  const files = cloneFiles(baseline)
  files['supplementary-notes.txt'] = encoder.encode('development reference')
  const manifest = readManifest(files)
  manifest.files.push('supplementary-notes.txt')
  manifest.files.sort()
  manifest.sha256['supplementary-notes.txt'] = hash(files['supplementary-notes.txt'])
  saveManifest(files, manifest)
  const result = audit(files)
  assert.equal(result?.ok, true, JSON.stringify(result?.diagnostics))
  assert.equal(result?.manufacturingApproved, false)
})
refuses('rejects tampered DXF bytes', files => { files[findDxf(files)][0] ^= 1 })
refuses('rejects forged manifest SHA-256', files => {
  const manifest = readManifest(files)
  manifest.sha256[findDxf(files)] = '0'.repeat(64)
  saveManifest(files, manifest)
})
refuses('rejects malformed manifest JSON', files => { files['manifest.json'] = encoder.encode('{"files":') })
refuses('rejects missing manufacturing file', files => { delete files[findDxf(files)] })
refuses('rejects altered manifest project metadata', files => {
  const manifest = readManifest(files)
  manifest.project.revision = `tampered-${manifest.project.revision}`
  saveManifest(files, manifest)
})
refuses('rejects altered manifest grading sizes', files => {
  const manifest = readManifest(files)
  manifest.grading.sizes = [...manifest.grading.sizes].reverse()
  saveManifest(files, manifest)
})
refuses('rejects rehashed authored geometry changed without changing project identity', files => {
  const source = JSON.parse(decoder.decode(files['garment-source.json']))
  assert.ok(source.pieces[0].points.length > 0)
  source.pieces[0].points[0].x += 0.125
  files['garment-source.json'] = encoder.encode(JSON.stringify(source))
  const manifest = readManifest(files)
  manifest.sha256['garment-source.json'] = hash(files['garment-source.json'])
  saveManifest(files, manifest)
  assert.equal(manifest.project.id, project.id)
  assert.equal(manifest.project.name, project.name)
  assert.equal(manifest.project.revision, project.revision)
  assert.equal(manifest.sha256['garment-source.json'], hash(files['garment-source.json']))
})
refuses('rejects prototype pollution key in manifest SHA map', files => {
  const manifest = readManifest(files)
  manifest.sha256 = JSON.parse(`{"__proto__":"${'0'.repeat(64)}",${Object.entries(manifest.sha256).map(([path, digest]) => `${JSON.stringify(path)}:${JSON.stringify(digest)}`).join(',')}}`)
  saveManifest(files, manifest)
})
refuses('rejects prototype pollution path in archive file map', files => {
  Object.defineProperty(files, '__proto__', {value: encoder.encode('injected'), enumerable:true, configurable:true, writable:true})
})
refuses('rejects case-colliding archive names', files => {
  files['README.TXT'] = files['README.txt'].slice()
})
refuses('rejects traversal archive paths', files => {
  files['../escape.txt'] = encoder.encode('escape')
})
