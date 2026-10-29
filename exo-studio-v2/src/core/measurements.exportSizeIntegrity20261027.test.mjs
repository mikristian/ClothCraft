import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultProject } from '../data/defaultProject.js'
import { buildTechPack, measurementRunToCSV } from './measurements.js'

test('factory POM export rejects duplicate identifiers rather than collapsing separate measurements', () => {
  const project = createDefaultProject()
  project.customMeasurements = [
    { id: 'factory-duplicate', label: 'First check', a: { x: 0, y: 0 }, b: { x: 3, y: 4 } },
    { id: 'factory-duplicate', label: 'Second check', a: { x: 0, y: 0 }, b: { x: 6, y: 8 } },
  ]
  assert.throws(() => measurementRunToCSV(project), /point-of-measure identifiers/i)
  assert.throws(() => buildTechPack(project), /point-of-measure identifiers/i)
})

test('factory export rejects malformed, empty or duplicate graded size headers', () => {
  for (const sizes of [[], ['M', 'M'], ['M', ''], ['M', 4]]) {
    const project = createDefaultProject()
    project.grading.sizes = sizes
    assert.throws(() => measurementRunToCSV(project), /grading sizes/i)
    assert.throws(() => buildTechPack(project), /grading sizes/i)
  }
})

test('custom independent points of measure survive valid multi-size CSV and tech pack export', () => {
  const project = createDefaultProject()
  project.customMeasurements = [{ id: 'factory-length', label: 'Factory length', a: { x: 0, y: 0 }, b: { x: 3, y: 4 }, toleranceCm: 0 }]
  const original = structuredClone(project)
  const pack = buildTechPack(project)
  const csv = measurementRunToCSV(project)
  assert.ok(Object.values(pack.sizeMeasurements).every((rows) => rows.some((row) => row.id === 'factory-length' && Number.isFinite(row.cm))))
  assert.match(csv, /"Factory length","0"/)
  assert.deepEqual(project, original)
})
