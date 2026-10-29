import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseSeamlyUpstreamDxfReference} from './seamlyUpstreamDxfReference20261023.js'

const fixture = readFileSync(new URL('../../research/oss/pattern-cad/runtime/verified-exports/male-shirt-engine-aama_pieces.dxf', import.meta.url), 'utf8')

test('real standalone Seamly AAMA block geometry appears only as unapproved, read-only references', () => {
  const result = parseSeamlyUpstreamDxfReference(fixture, {unit: 'mm', filename: 'male-shirt-engine-aama_pieces.dxf'})
  assert.equal(result.mode, 'reference-only')
  assert.equal(result.source.originalDxfText, fixture)
  assert.equal(result.source.originalByteLength, Buffer.byteLength(fixture))
  assert.equal(result.outlines.length, 34)
  assert.equal(result.source.blockNames.length, 17)
  assert.deepEqual(result.source.originalLayerLabels.sort(), ['1', '8'])
  assert.ok(result.outlines.some(row => row.blockName === 'FRONTPANEL'))
  assert.ok(result.outlines.every(row => row.points.length >= 3 && row.closed && !row.editable && !row.isPhysicalCut && !row.isStitchLine && !row.manufacturingApproved))
  assert.equal(result.manufacturingApproved, false)
  assert.equal(result.factoryExportAllowed, false)
  assert.equal(result.semanticAssessment.physicalCutKnown, false)
  assert.equal(result.semanticAssessment.stitchLineKnown, false)
})

test('unit choice is mandatory and exact, with no fallback from measurement flag', () => {
  assert.throws(() => parseSeamlyUpstreamDxfReference(fixture), /Explicit source unit/)
  const mm = parseSeamlyUpstreamDxfReference(fixture, {unit: 'mm'})
  const cm = parseSeamlyUpstreamDxfReference(fixture, {unit: 'cm'})
  assert.equal(cm.outlines[0].points[0].x, mm.outlines[0].points[0].x * 10)
  assert.equal(cm.source.millimetersPerSourceUnit, 10)
  assert.equal(mm.source.declaredInsUnits, null)
})

test('rejects unknown block references, malformed coordinate sets and unsupported geometry', () => {
  const unknown = fixture.replace(/\nFULLSLEEVE\n/, '\nMISSINGPIECE\n')
  assert.throws(() => parseSeamlyUpstreamDxfReference(unknown, {unit: 'mm'}), /Missing DXF block/)
  const distorted = fixture.replace('1149.806146210769', 'not-a-number')
  assert.throws(() => parseSeamlyUpstreamDxfReference(distorted, {unit: 'mm'}), /Invalid vertex x/)
  const scaled = fixture.replace(/\nINSERT\n/, '\nCIRCLE\n')
  assert.throws(() => parseSeamlyUpstreamDxfReference(scaled, {unit: 'mm'}), /Unsupported top-level DXF geometry/)
})
