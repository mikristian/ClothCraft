import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { buildFactoryPackageFiles } from './factoryPackage.js'

const reject = (name, mutate) => test(name, () => {
  const project = createTeeTemplate()
  mutate(project)
  const before = structuredClone(project)
  assert.throws(() => buildFactoryPackageFiles(project), /Factory package refused:/)
  assert.deepEqual(project, before)
})

reject('shared files builder rejects invalid sewing edge 999 before emitting files', project => {
  project.seams[0].a.edgeIndex = 999
})

reject('shared files builder rejects overlapping physical CUT contours across sizes', project => {
  const rect = (piece, id) => ({ ...piece, id, name: id,
    points: [{x:0,y:0},{x:20,y:0},{x:20,y:20},{x:0,y:20}],
    curves: {}, seamAllowance: 6, edgeSeamAllowances: {}, notches: [], internalLines: [], buttonholes: [] })
  project.pieces = [rect(project.pieces[0], 'a'), rect(project.pieces[0], 'b')]
  project.seams = []
})

test('shared files builder preserves six-size and single-size legacy templates', () => {
  for (const single of [false, true]) {
    const project = createTeeTemplate()
    if (single) project.grading.sizes = [project.grading.baseSize]
    const before = structuredClone(project)
    const files = buildFactoryPackageFiles(project)
    assert.equal(Object.keys(files).filter(path => path.startsWith('patterns/') && path.endsWith('.dxf')).length, project.grading.sizes.length)
    assert.deepEqual(project, before)
  }
})
