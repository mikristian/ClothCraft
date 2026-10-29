import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectGradedNotchPairs} from './industrialNotchQA.js'

test('paired-notch QA refuses duplicate seam IDs rather than selecting the first seam', () => {
  const project = createTeeTemplate()
  project.seams.push(structuredClone(project.seams[0]))
  const before = structuredClone(project)
  const report = inspectGradedNotchPairs(project)
  assert.equal(report.status, 'blocked')
  assert.ok(report.issues.some(issue => issue.code === 'AMBIGUOUS_NOTCH_SEAM_ID'))
  assert.equal(report.factoryCertified, false)
  assert.deepEqual(project, before)
})

test('conflicting duplicate seam IDs cannot silently select the earlier edge pairing', () => {
  const project = createTeeTemplate()
  const duplicate = structuredClone(project.seams[0])
  duplicate.a = {...duplicate.a, edgeIndex: (duplicate.a.edgeIndex + 1) % 4}
  project.seams.push(duplicate)
  const report = inspectGradedNotchPairs(project)
  assert.equal(report.status, 'blocked')
  assert.ok(report.issues.some(issue => issue.code === 'AMBIGUOUS_NOTCH_SEAM_ID'))
})

test('unique authored seam identities retain the original six-size notch QA results', () => {
  const project = createTeeTemplate()
  const before = structuredClone(project)
  const report = inspectGradedNotchPairs(project)
  assert.equal(report.status, 'pass', JSON.stringify(report.issues))
  assert.equal(report.checks.length, 24)
  assert.equal(report.factoryCertified, false)
  assert.deepEqual(project, before)
})
