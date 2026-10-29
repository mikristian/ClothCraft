import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {buildFactoryPackageZip} from './factoryPackage.js'
import {recoverFactorySourceFromZip} from './factorySourceRecovery.js'

const source = createTeeTemplate()
const invalid = (name, change) => test(name, () => {
  const project = structuredClone(source)
  change(project)
  const before = structuredClone(project)
  assert.throws(() => buildFactoryPackageZip(project), /^Error: Factory package refused:/)
  assert.deepEqual(project, before)
})

invalid('legacy ZIP refuses seam edge 999', p => {p.seams[0].a.edgeIndex = 999})
invalid('legacy ZIP refuses duplicate seam ID', p => {p.seams[1].id = p.seams[0].id})
invalid('legacy ZIP refuses duplicate piece ID', p => {p.pieces[1].id = p.pieces[0].id})
invalid('legacy ZIP refuses nonexistent piece ID', p => {p.seams[0].a.pieceId = 'missing-piece'})
invalid('legacy ZIP refuses missing seam ID', p => {delete p.seams[0].id})
invalid('legacy ZIP refuses invalid fractional edge', p => {p.seams[0].a.edgeIndex = 0.5})
invalid('legacy ZIP refuses negative edge', p => {p.seams[0].a.edgeIndex = -1})
invalid('legacy ZIP refuses identical sewing sides', p => {p.seams[0].b = {...p.seams[0].a}})
for (const [label, startT, endT] of [
  ['reversed', 0.9, 0.2], ['zero length', 0.5, 0.5],
  ['negative', -0.1, 0.5], ['overlong', 0.1, 1.1],
  ['NaN', NaN, 0.7], ['Infinity', 0.1, Infinity],
  ['missing end with late start', 1, undefined],
]) invalid(`legacy ZIP refuses ${label} partial interval`, p => {
  p.seams[0].a.startT = startT
  if (endT !== undefined) p.seams[0].a.endT = endT
})
invalid('legacy ZIP refuses nonarray seams', p => {p.seams = {}})
invalid('legacy ZIP refuses nonarray pieces', p => {p.pieces = {}})

test('valid Foundation Tee ZIP remains recoverable without source mutation', () => {
  const project = structuredClone(source)
  const initial = structuredClone(project)
  const recovered = recoverFactorySourceFromZip(buildFactoryPackageZip(project))
  assert.deepEqual(recovered.project, JSON.parse(JSON.stringify(project)))
  assert.deepEqual(project, initial)
})

test('existing single-size ZIP remains recoverable', () => {
  const project = structuredClone(source)
  project.grading = {...project.grading, sizes: [project.grading.baseSize]}
  const recovered = recoverFactorySourceFromZip(buildFactoryPackageZip(project))
  assert.deepEqual(recovered.verifiedSizes, [project.grading.baseSize])
})
