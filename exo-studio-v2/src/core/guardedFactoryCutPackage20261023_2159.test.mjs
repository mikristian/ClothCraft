import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {buildFactoryPackageFiles} from './factoryPackage.js'
import {
  auditFactoryPackageCutSafety20261023_2159 as audit,
  buildGuardedFactoryPackageFiles20261023_2159 as guardedBuild,
} from './guardedFactoryCutPackage20261023_2159.mjs'

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const encoder = new TextEncoder()
const copyFiles = files => Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, new Uint8Array(bytes)]))
const patternNames = files => Object.keys(files).filter(path => /^patterns\/[^/]+\.dxf$/i.test(path)).sort()

function overlapProject() {
  const base = createTeeTemplate()
  const makeRectangle = (id, name) => ({
    ...structuredClone(base.pieces[0]), id, name,
    points: [{x:0,y:0}, {x:20,y:0}, {x:20,y:20}, {x:0,y:20}],
    curves: {}, seamAllowance:6, edgeSeamAllowances:{},
    notches:[], internalLines:[], buttonholes:[],
  })
  return {...base, productionSpec:undefined, pieces:[makeRectangle('packing-a','Packing A'), makeRectangle('packing-b','Packing B')], seams:[]}
}

function rejected(result, label) {
  assert.equal(result.ok, false, `${label}: ${JSON.stringify(result)}`)
  assert.equal(result.manufacturingApproved, false, label)
}

test('six-size Foundation Tee package has six independently audited physical CUT files', () => {
  const project = createTeeTemplate()
  const original = structuredClone(project)
  assert.deepEqual(project.grading.sizes, sizes)
  const files = buildFactoryPackageFiles(project)
  assert.equal(patternNames(files).length, 6)
  const snapshot = copyFiles(files)
  const result = audit(files, sizes)
  assert.equal(result.ok, true, JSON.stringify(result))
  assert.equal(result.manufacturingApproved, false)
  assert.deepEqual(files, snapshot, 'audit preserves every input byte')
  assert.deepEqual(project, original, 'package building and audit preserve source project')
})

test('guarded builder preserves source and never grants manufacturing approval', () => {
  const project = createTeeTemplate()
  const snapshot = structuredClone(project)
  const files = guardedBuild(project)
  assert.ok(files && typeof files === 'object')
  assert.equal(patternNames(files).length, sizes.length)
  const readiness = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(files['manufacturing-release-readiness.json']))
  assert.equal(readiness.factoryCertified, false)
  assert.equal(readiness.factoryCuttingAuthorized, false)
  assert.equal(readiness.bulkProductionAuthorized, false)
  assert.deepEqual(project, snapshot)
})

test('two 20cm rectangles with 6cm allowances fail independently and produce no guarded package', () => {
  const project = overlapProject()
  const snapshot = structuredClone(project)
  const files = buildFactoryPackageFiles(project)
  rejected(audit(files, sizes), 'overlapping CUT contours')
  assert.throws(() => guardedBuild(project), error =>
    error?.code === 'UNSAFE_FACTORY_DXF' && Array.isArray(error.diagnostics),
  'cannot expose unsafe factory package bytes')
  assert.deepEqual(project, snapshot)
})

test('one missing size DXF blocks whole package', () => {
  const files = copyFiles(buildFactoryPackageFiles(createTeeTemplate()))
  const removed = patternNames(files).find(name => name.endsWith('-xl.dxf'))
  assert.ok(removed, 'fixture must contain XL DXF')
  delete files[removed]
  rejected(audit(files, sizes), 'missing XL')
})

test('malformed UTF-8 bytes block the entire package', () => {
  const files = copyFiles(buildFactoryPackageFiles(createTeeTemplate()))
  const [dxf] = patternNames(files)
  assert.ok(dxf)
  files[dxf] = Uint8Array.from([0xc3,0x28,0xff,0xfe])
  rejected(audit(files, sizes), 'malformed UTF-8')
})

test('zero physical CUT entities are rejected even when DXF envelope remains syntactically plausible', () => {
  const files = copyFiles(buildFactoryPackageFiles(createTeeTemplate()))
  const [dxf] = patternNames(files)
  const text = new TextDecoder('utf-8', {fatal:true}).decode(files[dxf])
  const withoutCut = text.replace(/CUT_/g, 'OTHER_')
  assert.notEqual(text, withoutCut, 'fixture must contain CUT entities')
  files[dxf] = encoder.encode(withoutCut)
  rejected(audit(files, sizes), 'zero physical CUT')
})

test('malformed DXF section envelope is rejected while remaining files stay intact', () => {
  const files = copyFiles(buildFactoryPackageFiles(createTeeTemplate()))
  const [dxf] = patternNames(files)
  const text = new TextDecoder('utf-8', {fatal:true}).decode(files[dxf])
  assert.match(text, /\bENDSEC\b/)
  const broken = text.replace(/\bENDSEC\b/, 'BROKEN_SECTION_TERMINATOR')
  files[dxf] = encoder.encode(broken)
  rejected(audit(files, sizes), 'malformed DXF envelope')
})
