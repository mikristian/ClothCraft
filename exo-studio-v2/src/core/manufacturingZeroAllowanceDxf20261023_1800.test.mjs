import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {projectToDxf} from './dxf.js'

// Parse DXF group codes independently of the application's DXF importer.
function contourLayers(wire) {
  const lines = wire.replace(/\r/g, '').trim().split('\n')
  assert.equal(lines.length % 2, 0, 'complete DXF group-code pairs')
  const pairs = []
  for (let i = 0; i < lines.length; i += 2) pairs.push([Number(lines[i]), lines[i + 1]])
  const layers = []
  let entities = false
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i][0] === 0 && pairs[i][1] === 'SECTION' && pairs[i + 1]?.[1] === 'ENTITIES') {
      entities = true
      continue
    }
    if (pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC') entities = false
    if (!entities || pairs[i][0] !== 0 || pairs[i][1] !== 'POLYLINE') continue
    let layer
    let closed = false
    let vertices = 0
    for (let j = i + 1; j < pairs.length; j++) {
      const [code, value] = pairs[j]
      if (code === 0 && value === 'SEQEND') break
      if (code === 0 && value === 'VERTEX') vertices++
      if (vertices === 0 && code === 8) layer = value
      if (vertices === 0 && code === 70) closed = (Number(value) & 1) !== 0
    }
    layers.push({layer, closed, vertices})
  }
  return layers
}

function singleFront(allowanceCm) {
  const source = createTeeTemplate()
  const project = structuredClone(source)
  project.pieces = [project.pieces.find(piece => piece.name === 'Front')]
  assert.ok(project.pieces[0], 'Foundation Tee front exists')
  project.pieces[0].seamAllowance = allowanceCm
  project.pieces[0].edgeSeamAllowances = {}
  project.pieces[0].notches = []
  return project
}

function assertPairedContours(project) {
  const original = JSON.stringify(project)
  const layers = contourLayers(projectToDxf(project, 'M', {cutlineMode: 'manufacturing'}))
  const cuts = layers.filter(entity => entity.layer === 'CUT_FRONT_M')
  const stitches = layers.filter(entity => entity.layer === 'STITCH_FRONT')
  assert.equal(JSON.stringify(project), original, 'manufacturing export preserves source')
  assert.equal(cuts.length, 1, 'one physical CUT contour')
  assert.ok(cuts[0].closed && cuts[0].vertices >= 3, 'CUT is a closed polygon')
  assert.equal(stitches.length, 1, 'one corresponding STITCH contour, including zero allowance')
  assert.ok(stitches[0].closed && stitches[0].vertices >= 3, 'STITCH is a closed polygon')
}

test('manufacturing DXF must pair CUT and STITCH with zero seam allowance (known failing regression)', () => {
  assertPairedContours(singleFront(0))
})

test('manufacturing DXF pairs CUT and STITCH with positive seam allowance', () => {
  assertPairedContours(singleFront(1))
})
