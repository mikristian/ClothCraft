import { test } from 'node:test'
import assert from 'node:assert/strict'
import imported from '../data/cloMaleTshirtPattern.json' with { type: 'json' }
import { createTemplateProject } from '../data/templates.js'
import { canonicalizeCloMaleTshirtProject, CLO_CANONICAL_PANELS } from '../data/cloMaleTshirtCanonicalization.js'
import { inspectIndustrialPatterns } from './industrialPatternQA.js'
import { inspectGradedCutlines } from './industrialCutlineQA.js'

const removed = { 'clo-front': 9, 'clo-back': 9, 'clo-right-sleeve': 4, 'clo-left-sleeve': 4 }
const clone = value => structuredClone(value)

test('opt-in canonicalization removes exactly 26 truly duplicate points and preserves complete original indices and provenance', () => {
  const installed = createTemplateProject('clo-male-tshirt')
  const beforeInstalled = clone(installed)
  const beforeSource = clone(imported)
  const { project, removedPointCount, indexMaps, factoryCertified } = canonicalizeCloMaleTshirtProject(installed)
  assert.equal(removedPointCount, 26)
  assert.equal(factoryCertified, false)
  assert.equal(project.canonicalizationProvenance.status, 'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED')
  assert.deepEqual(installed, beforeInstalled, 'installed input remains untouched')
  assert.deepEqual(imported, beforeSource, 'original imported JSON remains untouched')
  for (const id of CLO_CANONICAL_PANELS) {
    const original = installed.pieces.find(piece => piece.id === id)
    const canonical = project.pieces.find(piece => piece.id === id)
    const map = indexMaps[id]
    assert.equal(map.originalPointCount - map.canonicalPointCount, removed[id], id)
    assert.equal(map.removedOriginalIndices.length, removed[id], id)
    assert.equal(map.originalToCanonical.length, original.points.length, id)
    assert.equal(map.canonicalToOriginal.length, canonical.points.length, id)
    for (let i = 0; i < original.points.length; i++) {
      assert.deepEqual(canonical.points[map.originalToCanonical[i]], original.points[i], `${id} source vertex ${i}`)
    }
    assert.deepEqual(map.collapsedOriginalEdgeIndices.length, removed[id])
  }
  for (const id of ['clo-neck-a', 'clo-neck-b', 'clo-neck-c']) {
    assert.deepEqual(project.pieces.find(piece => piece.id === id), installed.pieces.find(piece => piece.id === id))
  }
  assert.deepEqual(createTemplateProject('clo-male-tshirt').pieces, beforeInstalled.pieces,
    'opt-in helper does not affect installed template behavior')
})

test('strict industrial and CUT/STITCH QA pass M/L/XL/XXL but retain XS/S crossing blockers', () => {
  const { project } = canonicalizeCloMaleTshirtProject(createTemplateProject('clo-male-tshirt'))
  for (const size of ['M', 'L', 'XL', 'XXL']) {
    const industrial = inspectIndustrialPatterns(project, { sizes: [size] })
    const contours = inspectGradedCutlines(project, { sizes: [size] })
    assert.equal(industrial.blockers, 0, `${size} industrial: ${JSON.stringify(industrial.issues.slice(0, 3))}`)
    assert.equal(contours.blockers, 0, `${size} CUT/STITCH: ${JSON.stringify(contours.issues.slice(0, 3))}`)
  }
  for (const size of ['XS', 'S']) {
    const contours = inspectGradedCutlines(project, { sizes: [size] })
    assert.equal(contours.status, 'blocked', `${size} remains unapproved`)
    assert(contours.issues.some(issue => issue.code.includes('SELF_INTERSECTION')), `${size} retains actual contour crossing`)
    assert(!contours.issues.some(issue => issue.code.includes('DEGENERATE_EDGE')), `${size} duplicate edges removed`)
  }
})

test('rejects all referenced edges and markings rather than silently breaking indices', () => {
  const input = createTemplateProject('clo-male-tshirt')
  const cases = [
    doc => { doc.seams.push({ id: 'blocked', a: { pieceId: 'clo-front', edgeIndex: 29 }, b: { pieceId: 'clo-back', edgeIndex: 0 } }) },
    doc => { doc.pieces[0].curves = { 29: { cx: -5, cy: 30 } } },
    doc => { doc.pieces[0].notches = [{ id: 'n', edgeIndex: 29, t: 0.5 }] },
    doc => { doc.pieces[0].internalLines = [{ id: 'mark', a: { x: 0, y: 0 }, b: { x: 2, y: 2 } }] },
    doc => { doc.pieces[0].edgeSeamAllowances = { 29: 1 } },
    doc => { doc.pieces[0].points[29].gradeRule = { enabled: true, dxPerSize: 1, dyPerSize: 0 } },
    doc => { doc.customMeasurements.push({ id: 'pom', pieceId: 'clo-front', a: { x: 0, y: 0 }, b: { x: 1, y: 1 } }) },
  ]
  for (const mutate of cases) {
    const doc = clone(input)
    mutate(doc)
    const snapshot = clone(doc)
    assert.throws(() => canonicalizeCloMaleTshirtProject(doc), /Cannot canonicalize/)
    assert.deepEqual(doc, snapshot, 'negative probe never mutates caller')
  }
})
