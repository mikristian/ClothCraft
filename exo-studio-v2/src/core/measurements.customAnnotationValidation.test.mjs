import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultProject } from '../data/defaultProject.js'
import { measureProject, measurementRunToCSV } from './measurements.js'

function projectWithCustom(measurement) {
  const project = createDefaultProject()
  project.customMeasurements = [{ id: 'factory-pom', label: 'Factory POM', ...measurement }]
  return project
}

test('valid custom 2D measurements retain their lengths and zero tolerance', () => {
  const project = projectWithCustom({
    a: { x: 0, y: 0 }, b: { x: 3, y: 4 }, toleranceCm: 0,
  })
  const original = structuredClone(project)
  assert.deepEqual(measureProject(project).find(item => item.id === 'factory-pom'), {
    id: 'factory-pom', label: 'Factory POM', cm: 5, toleranceCm: 0,
  })
  assert.match(measurementRunToCSV(project), /"Factory POM","0","5"/)
  assert.deepEqual(project, original, 'measurement must not mutate source')
})

test('non-finite custom 2D annotation coordinates cannot become a factory POM', () => {
  for (const invalid of [NaN, Infinity, -Infinity, undefined, '3']) {
    const project = projectWithCustom({
      a: { x: 0, y: 0 }, b: { x: invalid, y: 4 }, toleranceCm: 0.5,
    })
    assert.throws(() => measureProject(project), /factory-pom.*coordinates/i)
  }
})

test('overflowing custom measurement distances cannot become Infinity in exports', () => {
  const project = projectWithCustom({
    a: { x: -Number.MAX_VALUE, y: 0 }, b: { x: Number.MAX_VALUE, y: 0 },
  })
  assert.throws(() => measureProject(project), /factory-pom.*distance/i)
  assert.throws(() => measurementRunToCSV(project), /factory-pom.*distance/i)
})

test('negative or non-finite POM tolerances are rejected', () => {
  for (const toleranceCm of [-0.1, NaN, Infinity, 'not-a-number']) {
    const project = projectWithCustom({
      a: { x: 0, y: 0 }, b: { x: 3, y: 4 }, toleranceCm,
    })
    assert.throws(() => measureProject(project), /factory-pom.*tolerance/i)
  }
})
