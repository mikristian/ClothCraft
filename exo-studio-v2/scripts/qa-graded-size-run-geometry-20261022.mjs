// Separate, intentionally strict acceptance gate. It fails until every
// template size run preserves the original cut-piece winding and edges.
// Keep separate from the existing 2D release suite until the defects are
// corrected; a green historical gate must not conceal this red one.
import { GARMENT_TEMPLATES } from '../src/data/templates.js'
import { auditGradedSizeRunGeometry } from '../src/core/gradedSizeRunGeometryAudit.js'

let inspectedSizes = 0
let inspectedPieces = 0
const issues = []
for (const template of GARMENT_TEMPLATES) {
  const project = template.create()
  const before = JSON.stringify(project)
  const report = auditGradedSizeRunGeometry(project)
  inspectedSizes += report.inspectedSizes
  inspectedPieces += report.inspectedPieces
  issues.push(...report.issues.map(issue => ({ template: template.id, ...issue })))
  if (JSON.stringify(project) !== before) throw new Error(`${template.id}: audit mutated source project`)
}

const result = {
  pass: issues.length === 0,
  templates: GARMENT_TEMPLATES.length,
  inspectedSizes,
  inspectedPieces,
  issues,
}
console.log(JSON.stringify(result, null, 2))
if (!result.pass) process.exitCode = 1
