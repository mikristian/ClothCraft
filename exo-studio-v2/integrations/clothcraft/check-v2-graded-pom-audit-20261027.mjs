// Exercise the real Rust six-size graded point-of-measure comparison through
// the workspace bridge. The geometry and catalog belong to Rust; no browser
// sidecar provides the measurements or an artificial acceptance flag.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {nativeRustEdgeLength20261023} from '../../src/core/nativeRustArcLengthCompat20261023.js'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-graded-pom-audit-'))
const workspace=createWorkspace(root)
let snapshot
const send=async args=>{
  const response=await workspace.request({revision:snapshot?.revision,...args})
  assert.equal(response.ok,true,response.error)
  if(response.data?.template)snapshot=response.data
  return response.data
}
const audit=()=>send({op:'grade-run-pom-audit'})
const SIZES=['XS','S','M','L','XL','XXL']
const runWith=(template,targetsMm,pathTargetsMm,wrappedTargetsMm)=>({
  schemaVersion:1,sizes:SIZES,baseSize:'M',baseTemplate:template,
  gradedTemplates:SIZES.map(()=>structuredClone(template)),
  pomSpecs:[{
    id:'front-width-01',label:'Front reference dimension',
    panelId:'front',kind:'anchor-distance',
    toleranceMm:0.25,fromPoint:0,toPoint:1,
    targetsMm,
  },{
    id:'front-curve-path-02',label:'Front consecutive sewn edge path',
    panelId:'front',kind:'sewline-path',
    toleranceMm:0.5,fromPoint:0,toPoint:2,
    targetsMm:pathTargetsMm,
  },{
    id:'front-curve-wrap-03',label:'Front wrapping sewn edge path',
    panelId:'front',kind:'sewline-path',
    toleranceMm:0.5,fromPoint:template.panels.find(p=>p.id==='front').polygon.points.length-1,toPoint:1,
    targetsMm:wrappedTargetsMm,
  }],
})
try{
  await send({op:'open',preset:'tshirt'})
  const before=structuredClone(snapshot)
  const missing=await workspace.request({op:'grade-run-pom-audit',revision:snapshot.revision})
  assert.equal(missing.ok,false,'Unsaved grade catalog must refuse numerical approval')
  assert.equal(snapshot.revision,before.revision)
  const front=before.template.panels.find(p=>p.id==='front')
  assert(front?.polygon?.points?.length>=3)
  const start=front.polygon.points[0],end=front.polygon.points[1]
  const observedMm=Math.hypot(start[0]-end[0],start[1]-end[1])*1000
  assert(observedMm>0&&Number.isFinite(observedMm))
  const targets=Object.fromEntries(SIZES.map(size=>[size,observedMm]))
  const e0=nativeRustEdgeLength20261023(front.polygon,front.polygon.edges[0])
  const e1=nativeRustEdgeLength20261023(front.polygon,front.polygon.edges[1])
  const eLast=nativeRustEdgeLength20261023(front.polygon,front.polygon.edges.at(-1))
  assert(e0.ok&&e1.ok&&eLast.ok)
  const pathTargetsMm=Object.fromEntries(SIZES.map(size=>[size,(e0.totalLengthM+e1.totalLengthM)*1000]))
  const wrapTargetsMm=Object.fromEntries(SIZES.map(size=>[size,(eLast.totalLengthM+e0.totalLengthM)*1000]))
  const good=runWith(before.template,targets,pathTargetsMm,wrapTargetsMm)
  const accepted=await send({op:'grade-run-commit',gradeRun:good})
  assert.equal(accepted.gradeCatalogResult?.persisted,true)
  const revision=snapshot.revision
  const saved=await send({op:'save'})
  const originalProject=saved.project
  const clean=await audit()
  assert.equal(clean.format,'exo-native-grade-pom-audit.v1')
  assert.equal(clean.sourceRevision,revision)
  assert.equal(clean.factoryApproved,false)
  assert.equal(clean.acceptanceComplete,true,
    'All six physically measured stations match their saved explicit specifications')
  assert.equal(clean.total,18,'Three physical POMs must be evaluated independently at six sizes')
  assert.equal(clean.passed,18)
  assert.equal(clean.rows.filter(row=>row.kind==='sewline-path').length,12)
  assert.equal(snapshot.revision,revision,'Read-only audit must not modify the source')
  assert.deepEqual((await send({op:'save'})).project,originalProject,
    'Read-only audit must not mutate the saved native garment')

  // Refresh one size's target without any geometry changes. Even if source
  // patterns compile, the saved chart now specifies a genuine out-of-tolerance
  // 5 mm discrepancy; never report this catalog as accepted.
  const incorrect=structuredClone(good)
  incorrect.pomSpecs[0].targetsMm.L=observedMm+5
  await send({op:'grade-run-commit',gradeRun:incorrect})
  const mismatch=await audit()
  assert.equal(mismatch.acceptanceComplete,false)
  assert.equal(mismatch.factoryApproved,false)
  assert.equal(mismatch.sourceRevision,snapshot.revision)
  // An intentionally unscored XXL POM is not equivalent to a passing value.
  const missingTarget=structuredClone(incorrect)
  missingTarget.pomSpecs[0].targetsMm.XXL=null
  await send({op:'grade-run-commit',gradeRun:missingTarget})
  const incomplete=await audit()
  assert.equal(incomplete.acceptanceComplete,false)
  assert.equal(incomplete.factoryApproved,false)
  const auditRevision=snapshot.revision
  const stale=await workspace.request({op:'grade-run-pom-audit',revision:auditRevision-1})
  assert.equal(stale.ok,false,'Stale source must not provide seemingly current numerical evidence')

  const persistent=await send({op:'save'})
  await send({op:'open',project:persistent.project})
  const reopened=await audit()
  assert.equal(reopened.acceptanceComplete,false)
  assert.equal(reopened.factoryApproved,false)
  assert.equal(reopened.sourceRevision,snapshot.revision)
  assert.equal(reopened.format,clean.format)

  console.log(JSON.stringify({passed:true,checks:[
    'missing native grade catalog refuses',
    'six Rust-authored source graded POM measurements match all six specified size targets',
    'straight/cubic multi-edge and wrapping sewn boundary POM paths persist and measure in Rust',
    'read-only audit never changes native revision or saved garment bytes',
    'physical out-of-tolerance chart target blocks acceptance',
    'unscored/null target never counts as passing',
    'stale revision rejects, saved catalog survives real Rust save/reopen',
  ]}))
}finally{
  workspace.close()
  fs.rmSync(root,{recursive:true,force:true})
}
