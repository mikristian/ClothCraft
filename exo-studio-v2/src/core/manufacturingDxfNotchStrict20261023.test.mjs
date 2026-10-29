import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'

const source = () => gradeProject(createTeeTemplate(), 'M')
const factory = project => projectToDxf(project, 'M', {cutlineMode:'manufacturing'})
const withNotch = (notch) => {
  const project = source()
  project.pieces[0].notches = [notch]
  return project
}

test('manufacturing DXF fails closed on out-of-range and malformed explicit notch edges; drafting skips them', () => {
  for (const edgeIndex of [-1, 999, 0.5, 'abc', null, undefined]) {
    const project = withNotch({id:'bad',edgeIndex,t:0.5,depthCm:0.3})
    assert.throws(() => factory(project), /Invalid manufacturing DXF notch edgeIndex/)
    assert.doesNotThrow(() => projectToDxf(project, 'M', {cutlineMode:'drafting'}))
  }
})

test('manufacturing DXF rejects bad fractions and physical notch depth', () => {
  for (const t of [-0.01, 1.01, NaN, Infinity, '0.5', 'oops']) {
    assert.throws(() => factory(withNotch({id:'bad-t',edgeIndex:0,t,depthCm:0.3})), /Invalid manufacturing DXF notch fraction/)
  }
  for (const depthCm of [-1, 0, NaN, Infinity, '0.3']) {
    assert.throws(() => factory(withNotch({id:'bad-depth',edgeIndex:0,t:0.5,depthCm})), /Invalid manufacturing DXF notch depth/)
  }
})

test('manufacturing DXF refuses notches on unsupported edges with no allowance', () => {
  const project = withNotch({id:'no-cut',edgeIndex:0,t:0.5,depthCm:0.3})
  project.pieces[0].seamAllowance = 0
  for (const point of project.pieces[0].points) point.seamAllowance = 0
  assert.throws(() => factory(project), /Unsafe manufacturing notch depth\/allowance/)
})

test('valid explicit notch writes physical NOTCH layer without mutating authored project', () => {
  const project = withNotch({id:'valid',edgeIndex:0,t:0.5,depthCm:0.3,type:'single'})
  const before = structuredClone(project)
  const dxf = factory(project)
  assert.match(dxf, /NOTCH_FRONT/)
  assert.deepEqual(project, before)
})
