import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTemplateProject } from '../data/templates.js'
import { canonicalizeCloMaleTshirtProject } from '../data/cloMaleTshirtCanonicalization.js'
import { studyCloSmallSizeGrades } from './cloSmallSizeGradeStudy.js'

test('canonical CLO size study reports the true XS/S crossings without source mutations', () => {
  const input = createTemplateProject('clo-male-tshirt')
  const baseline = structuredClone(input)
  const { project } = canonicalizeCloMaleTshirtProject(input)
  const canonicalBaseline = structuredClone(project)
  const result = studyCloSmallSizeGrades(project)
  assert.equal(result.factoryCertified, false)
  assert.equal(result.approval, 'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED')
  assert.deepEqual(input, baseline)
  assert.deepEqual(project, canonicalBaseline)
  for (const size of ['XS','S']) {
    const row = result.results.find(entry => entry.size === size)
    assert.equal(row.status, 'blocked')
    assert.equal(row.blockers, 16)
    assert.deepEqual([...new Set(row.pieces.map(entry=>entry.pieceId))].sort(),
      ['clo-front','clo-back','clo-right-sleeve','clo-left-sleeve'].sort())
    assert.equal(row.pieces.length, 8)
    assert.equal(row.pieces.reduce((n, piece) => n + piece.intersections.length, 0), 16)
    assert(row.pieces.every(piece => piece.intersections.length > 0 && piece.intersections.every(hit =>
      hit.type === 'crossing' && Number.isFinite(hit.location.x) && Number.isFinite(hit.location.y))))
  }
  assert.deepEqual(result.results.filter(row=>!['XS','S'].includes(row.size)).map(row=>[row.size,row.status,row.blockers,row.pieces.length]),
    [['M','pass',0,0],['L','pass',0,0],['XL','pass',0,0],['XXL','pass',0,0]])
  assert.equal(result.baseSizePreserved, true)
})

test('the actual crossing edge locations remain visible in XS and S', () => {
  const { project } = canonicalizeCloMaleTshirtProject(createTemplateProject('clo-male-tshirt'))
  const { results } = studyCloSmallSizeGrades(project, { sizes:['XS','S'] })
  for (const row of results) {
    const front = row.pieces.find(piece => piece.pieceId === 'clo-front' && piece.contour === 'STITCH')
    const back = row.pieces.find(piece => piece.pieceId === 'clo-back' && piece.contour === 'STITCH')
    assert.equal(front.intersections.length, 1)
    assert.equal(back.intersections.length, 1)
    assert(Math.abs(front.intersections[0].location.x) < .002)
    assert(Math.abs(back.intersections[0].location.x) < .003)
    assert(Math.abs(front.intersections[0].location.y - (row.size === 'XS' ? 58.48988 : 57.69411)) < .001)
    assert(Math.abs(back.intersections[0].location.y - (row.size === 'XS' ? 68.95938 : 68.8653)) < .001)
  }
})
