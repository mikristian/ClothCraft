import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {buildFactoryPackageFiles} from './factoryPackage.js'
import {sha256Bytes} from './sha256Bytes.js'
import {auditFactoryPackageManifestBrowser20261024_0053 as auditLegacy} from './factoryPackageManifestBrowser20261024_0053.mjs'
import {auditFactoryZipSemanticInventory20261024_0853 as auditSemantic} from './factoryZipSemanticInventory20261024_0853.mjs'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const codes = result => result.diagnostics.map(row => row.code)

function resign(files) {
  const manifest = JSON.parse(decoder.decode(files['manifest.json']))
  const nonManifest = Object.keys(files).filter(path => path !== 'manifest.json')
  manifest.files = [...nonManifest, 'manifest.json'].sort()
  manifest.sha256 = Object.fromEntries(nonManifest.map(path => [path, sha256Bytes(files[path])]))
  files['manifest.json'] = encoder.encode(JSON.stringify(manifest))
}

let fixture
function genuineSixSize() {
  if (!fixture) {
    const project = createTeeTemplate()
    assert.deepEqual(project.grading.sizes.map(size => size.toLowerCase()), ['xs','s','m','l','xl','xxl'])
    const files = buildFactoryPackageFiles(project)
    assert.equal(auditLegacy(files, project).ok, true, 'generated manifest control')
    assert.equal(auditSemantic(files, project).ok, true, 'generated semantic inventory control')
    fixture = {project, files}
  }
  return fixture
}

test('self-consistent rehash hides missing mandatory factory sample approval evidence from legacy validator', () => {
  const {project, files: original} = genuineSixSize()
  const untouched = original['factory-sample-approval-gate.json'].slice()
  const tampered = {...original}
  delete tampered['factory-sample-approval-gate.json']
  resign(tampered)
  const legacy = auditLegacy(tampered, project)
  assert.equal(legacy.ok, true, JSON.stringify(legacy.diagnostics))
  const semantic = auditSemantic(tampered, project)
  assert.equal(semantic.ok, false)
  assert.ok(codes(semantic).includes('MISSING_MANDATORY_ARTIFACT'), JSON.stringify(semantic.diagnostics))
  assert.equal(legacy.manufacturingApproved, false)
  assert.equal(semantic.manufacturingApproved, false)
  assert.deepEqual(original['factory-sample-approval-gate.json'], untouched, 'tampering copy must not change source bytes')
  assert.equal(auditSemantic(original, project).ok, true, 'auditor must not mutate original file record')
})

test('self-consistent rehash hides missing all-size industrial seam walk and plot QA from legacy validator', () => {
  const {project, files: original} = genuineSixSize()
  for (const missing of ['industrial-pattern-seam-walk.csv', 'marker-plot-geometry-qa.json']) {
    const tampered = {...original}
    delete tampered[missing]
    resign(tampered)
    const legacy = auditLegacy(tampered, project)
    assert.equal(legacy.ok, true, `${missing}: ${JSON.stringify(legacy.diagnostics)}`)
    const semantic = auditSemantic(tampered, project)
    assert.equal(semantic.ok, false, missing)
    assert.ok(codes(semantic).includes('MISSING_MANDATORY_ARTIFACT'), `${missing}: ${JSON.stringify(semantic.diagnostics)}`)
    assert.equal(semantic.manufacturingApproved, false)
  }
})
