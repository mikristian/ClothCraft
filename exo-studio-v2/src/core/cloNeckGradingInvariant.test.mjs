import { test } from 'node:test'
import assert from 'node:assert/strict'
import source from '../data/cloMaleTshirtPattern.json' with { type: 'json' }
import { createTemplateProject } from '../data/templates.js'
import { gradeProject, buildSizeRun } from './grading.js'
import { CLO_MALE_TSHIRT_SOURCE_LOCKED_TRIMS } from '../data/cloMaleTshirtGrading.js'

const area = piece => piece.points.reduce((sum, point, index) => {
  const next = piece.points[(index + 1) % piece.points.length]
  return sum + point.x * next.y - next.x * point.y
}, 0) / 2

test('source-locked CLO neck trims retain their original winding and geometry across all six sizes', () => {
  const project = createTemplateProject('clo-male-tshirt')
  const gradedSizes = buildSizeRun(project)
  assert.equal(project.gradeProvenance.status, 'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED')
  assert.equal(project.gradeProvenance.neckTrimPolicy, 'source-coordinates-locked-all-sizes')
  for (const size of project.grading.sizes) {
    const graded = gradedSizes[size]
    for (const id of CLO_MALE_TSHIRT_SOURCE_LOCKED_TRIMS) {
      const original = source.pieces.find(piece => piece.id === id)
      const piece = graded.pieces.find(item => item.id === id)
      assert.ok(piece && original, `${size}: ${id} present`)
      assert.deepEqual(piece.points.map(({ x, y }) => ({ x, y })), original.points.map(({ x, y }) => ({ x, y })), `${size}: ${id} original trim geometry`)
      assert.ok(Math.abs(area(piece)) > 1, `${size}: ${id} remains nondegenerate`)
      assert.equal(Math.sign(area(piece)), Math.sign(area(original)), `${size}: ${id} original winding`)
    }
  }
  assert.deepEqual(source.pieces.filter(piece => CLO_MALE_TSHIRT_SOURCE_LOCKED_TRIMS.includes(piece.id)).map(piece => piece.points),
    project.pieces.filter(piece => CLO_MALE_TSHIRT_SOURCE_LOCKED_TRIMS.includes(piece.id))
      .map(piece => piece.points.map(({ x, y }) => ({ x, y }))))
})

test('all non-trim pieces retain the original automatic grade behavior and base source geometry', () => {
  const project = createTemplateProject('clo-male-tshirt')
  const unmodifiedSource = structuredClone(source)
  const guarded = new Set(CLO_MALE_TSHIRT_SOURCE_LOCKED_TRIMS)
  for (const size of project.grading.sizes) {
    const graded = gradeProject(project, size)
    const originalGrade = gradeProject(unmodifiedSource, size)
    for (const piece of graded.pieces.filter(item => !guarded.has(item.id))) {
      assert.deepEqual(piece.points, originalGrade.pieces.find(item => item.id === piece.id).points, `${size}: ${piece.id} automatic grade unchanged`)
    }
    if (size === project.grading.baseSize) {
      for (const piece of graded.pieces) {
        assert.deepEqual(piece.points.map(({ x, y }) => ({ x, y })),
          source.pieces.find(item => item.id === piece.id).points.map(({ x, y }) => ({ x, y })), `${piece.id}: base geometry preserved`)
      }
    }
  }
})
