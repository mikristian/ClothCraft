import assert from 'node:assert/strict'
import { createDefaultProject } from '../src/data/defaultProject.js'
import { inspectProduction } from '../src/core/productionPreflight.js'

const original = createDefaultProject()
assert.equal(inspectProduction(original).blockers, 0, 'The normal 2D tee must remain releasable by structural preflight')

for (const value of [undefined, null, '', 'not-a-number', Infinity, -Infinity, NaN, true, false, 13, -13, '0.5']) {
  const project = structuredClone(original)
  project.pieces[0].points[0].gradeRule = { enabled: true, dxPerSize: value, dyPerSize: 0 }
  const report = inspectProduction(project)
  assert.ok(report.issues.some((issue) => issue.severity === 'blocker' && issue.code === 'INVALID_GRADE_RULE'), `Invalid X grade must block: ${String(value)}`)
}
const valid = structuredClone(original)
valid.pieces[0].points[0].gradeRule = { enabled: true, dxPerSize: -1.25, dyPerSize: 0.5 }
assert.equal(inspectProduction(valid).issues.filter((issue) => issue.code === 'INVALID_GRADE_RULE').length, 0)
const base = structuredClone(original)
base.grading.baseSize = 'UNKNOWN'
assert.ok(inspectProduction(base).issues.some((issue) => issue.code === 'INVALID_BASE_SIZE'))
const empty = structuredClone(original)
empty.grading.sizes = ['M', '']
assert.ok(inspectProduction(empty).issues.some((issue) => issue.code === 'INVALID_SIZE_LABEL'))
let invalidStepsBlocked = 0
for (const [field, value] of [['widthPerSizeCm', -1], ['widthPerSizeCm', 13], ['widthPerSizeCm', Infinity], ['widthPerSizeCm', '3'], ['lengthPerSizeCm', -1], ['lengthPerSizeCm', 9], ['lengthPerSizeCm', NaN], ['lengthPerSizeCm', true]]) {
  const project = structuredClone(original)
  project.grading[field] = value
  assert.ok(inspectProduction(project).issues.some((issue) => issue.code === 'INVALID_GRADE_STEP'), `Invalid automatic grading ${field}=${String(value)} must block`)
  invalidStepsBlocked++
}
console.log(JSON.stringify({ pass: true, invalidRulesBlocked: 12, invalidStepsBlocked, validRulesAllowed: true, invalidBaseBlocked: true, blankSizeBlocked: true }))
