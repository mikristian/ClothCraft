// Optional strict read-only gate: newly introduced near-contacts under 1 mm.
// Not a substitute for factory cutter tolerances or recipient CAD acceptance.
import { GARMENT_TEMPLATES } from '../src/data/templates.js'
import { auditGradedBoundaryClearance } from '../src/core/gradedBoundaryClearanceAudit.js'

let inspectedSizes = 0, inspectedPieces = 0
const issues = []
for (const template of GARMENT_TEMPLATES) {
  const project = template.create()
  const before = JSON.stringify(project)
  const report = auditGradedBoundaryClearance(project)
  inspectedSizes += report.inspectedSizes
  inspectedPieces += report.inspectedPieces
  issues.push(...report.issues.map(issue => ({ template: template.id, ...issue })))
  if (JSON.stringify(project) !== before) throw new Error(`${template.id}: clearance audit mutated original pattern`)
}
const report = { pass: issues.length === 0, thresholdCm: 0.1, minArcSeparationCm: 1,
  templates: GARMENT_TEMPLATES.length, inspectedSizes, inspectedPieces, issueCount: issues.length, issues }
console.log(JSON.stringify(report, null, 2))
if (!report.pass) process.exitCode = 1
