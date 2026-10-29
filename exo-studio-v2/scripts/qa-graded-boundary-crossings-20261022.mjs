// Independent strict size-run crossing gate. Do not silently change pattern
// geometry; a trained patternmaker must review any introduced intersections.
import { GARMENT_TEMPLATES } from '../src/data/templates.js'
import { auditGradedBoundaryCrossings } from '../src/core/gradedBoundaryCrossingsAudit.js'

let inspectedSizes = 0, inspectedPieces = 0
const issues = []
for (const template of GARMENT_TEMPLATES) {
  const project = template.create()
  const before = JSON.stringify(project)
  const report = auditGradedBoundaryCrossings(project)
  inspectedSizes += report.inspectedSizes
  inspectedPieces += report.inspectedPieces
  issues.push(...report.issues.map(issue => ({ template: template.id, ...issue })))
  if (JSON.stringify(project) !== before) throw new Error(`${template.id}: crossing audit mutated original pattern`)
}
const report = { pass: issues.length === 0, templates: GARMENT_TEMPLATES.length,
  inspectedSizes, inspectedPieces, issues }
console.log(JSON.stringify(report, null, 2))
if (!report.pass) process.exitCode = 1
