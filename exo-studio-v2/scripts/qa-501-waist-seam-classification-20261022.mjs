#!/usr/bin/env node
/** Diagnose every size-specific 501 jeans waist/yoke sewing mismatch.
 * Read-only calculations. Does not synthesize a fit, rule table or approval.
 */
import assert from 'node:assert/strict'
import {create501JeansTemplate} from '../src/data/jeans501.js'
import {inspectIndustrialPatterns} from '../src/core/industrialPatternQA.js'
import {auditGradedSizeRunGeometry} from '../src/core/gradedSizeRunGeometryAudit.js'
import {inspectGradedCutlines} from '../src/core/industrialCutlineQA.js'

const project=create501JeansTemplate()
const authored=JSON.stringify(project)
const qa=inspectIndustrialPatterns(project)
const topology=auditGradedSizeRunGeometry(project)
const cutlines=inspectGradedCutlines(project)
assert.equal(topology.issues.length,0,'Narrow loop topologies must remain repaired')
const mismatches=qa.issues.filter(issue=>issue.code==='SEAM_LENGTH_MISMATCH')
assert.equal(mismatches.length,30,'Current jeans construction requires 30 independent mismatch dispositions; not implicit approved ease')
const identifiers=new Set(['left-yoke-join','left-front-waist','left-back-waist','right-yoke-join','right-front-waist','right-back-waist'])
const cases=qa.seamReports.filter(row=>!row.pass)
assert.equal(cases.length,30)
assert(cases.every(row=>identifiers.has(row.seamId)))
const grouped=Object.fromEntries([...identifiers].map(seamId=>[
 seamId,cases.filter(row=>row.seamId===seamId).map(row=>({
  size:row.size,stitchAcm:row.lengthA,stitchBcm:row.lengthB,
  signedDifferenceCm:row.lengthA-row.lengthB,mismatchPercent:row.mismatchPercent,
  disposition:'UNAPPROVED_CORRECT_GRADE_GEOMETRY_OR_AUTHORIZE_CONSTRUCTION_EASE',
 }))
]))
for(const rows of Object.values(grouped)){
 assert.equal(rows.length,5,'Only non-base sizes should have the grouped mismatches')
 assert(!rows.some(row=>row.size==='W32'),'Base W32 must remain source-aligned')
}
assert.equal(JSON.stringify(project),authored,'QA must not mutate authored jeans')
const other=qa.issues.filter(issue=>issue.code!=='SEAM_LENGTH_MISMATCH')
const report={schema:'exo-501-waist-grade-seam-disposition.v1',status:'BLOCKED',
 gradeTopologyPass:true,manufacturerApproved:false,
 projectId:project.id,sizes:project.grading.sizes,
 mismatchedSewingEdges:cases.length,groups:grouped,
 remainingNonSeamIssues:other,
 cutlineBlockers:cutlines.blockers,
 cutlineIssues:cutlines.issues,
 nextAction:'Re-grade matching waist/yoke sewing edges using approved size-specific measurement targets or obtain independently signed construction-ease specifications; never hide mismatches with tolerance changes.',
 statement:'No factory cut authorization or physical sample approval is created by this diagnostic.',
}
console.log(JSON.stringify(report,null,2))
