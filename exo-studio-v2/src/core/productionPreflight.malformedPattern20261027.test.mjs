import assert from 'node:assert/strict'
import test from 'node:test'
import { createDefaultProject } from '../data/defaultProject.js'
import { inspectProduction } from './productionPreflight.js'

test('malformed pattern entries block preflight and do not crash the manufacturing inspection', () => {
  for (const corrupted of [null, undefined, { id: 'front', points: [null, { x: 1, y: 2 }, { x: 2, y: 3 }] }]) {
    const project = createDefaultProject()
    project.pieces[0] = corrupted
    const report = inspectProduction(project)
    assert.equal(report.status, 'BLOCKED')
    assert(report.issues.some((issue) => issue.code === 'INVALID_GEOMETRY'))
    assert(report.issues.some((issue) => issue.code === 'BROKEN_SEAM'))
  }
})
