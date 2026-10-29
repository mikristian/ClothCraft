import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {projectToDxf} from './dxf.js'
import {getEdgeSeamAllowance} from './project.js'

function fixture() {
  const project = createTeeTemplate()
  for (const piece of project.pieces) piece.notches = []
  const piece = project.pieces.find(candidate =>
    candidate.points.some((_, edge) => getEdgeSeamAllowance(candidate, edge) > 0.6))
  assert.ok(piece, 'A real sewing piece with sufficient allowance is required')
  const edgeIndex = piece.points.findIndex((_, edge) => getEdgeSeamAllowance(piece, edge) > 0.6)
  const notch = {id:'qa-manufacturing-notch', edgeIndex, t:0.5, type:'single', depthCm:0.3}
  piece.notches.push(notch)
  return {project, piece, notch}
}

const manufacturing = project => projectToDxf(project, 'M', {cutlineMode:'manufacturing'})

test('manufacturing DXF rejects unsupported explicit notch types without mutating the source', () => {
  for (const type of ['triple', 'v-notch', '', 42, {}, false]) {
    const {project, notch} = fixture()
    notch.type = type
    const original = structuredClone(project)
    assert.throws(() => manufacturing(project), /Unsupported manufacturing DXF notch type/)
    assert.deepEqual(project, original)
  }
})

test('legacy missing notch type remains single; valid double remains exportable', () => {
  for (const type of [null, undefined, 'single', 'double']) {
    const {project, notch} = fixture()
    notch.type = type
    const dxf = manufacturing(project)
    assert.match(dxf, /NOTCH_/)
    assert.match(dxf, /CUT_/)
  }
})

test('manufacturing DXF rejects coerced string and boolean edge indices', () => {
  for (const edgeIndex of ['0', '1', true, false, null]) {
    const {project, notch} = fixture()
    notch.edgeIndex = edgeIndex
    assert.throws(() => manufacturing(project), /Invalid manufacturing DXF notch edgeIndex/)
  }
})

test('manufacturing DXF rejects double notches too close to physical edge endpoints', () => {
  for (const t of [0, 0.001, 0.01, 0.99, 0.999, 1]) {
    const {project, notch} = fixture()
    notch.type = 'double'
    notch.t = t
    const original = structuredClone(project)
    assert.throws(() => manufacturing(project), /Unsafe manufacturing double-notch endpoint clearance/)
    assert.deepEqual(project, original)
  }
})

test('drafting DXF preserves legacy double-notch endpoint previews without claiming cutting readiness', () => {
  const {project, notch} = fixture()
  notch.type = 'double'
  notch.t = 0
  assert.doesNotThrow(() => projectToDxf(project, 'M', {cutlineMode:'drafting'}))
  assert.throws(() => manufacturing(project), /Unsafe manufacturing double-notch endpoint clearance/)
})
