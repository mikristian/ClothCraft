import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../data/templates.js'
import {buildFactoryPackageFiles} from './factoryPackage.js'
import {strFromU8} from 'fflate'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'

test('passing Foundation Tee 2D geometry never certifies incomplete neckband or missing actual factory evidence',()=>{
 const project=createTemplateProject('tee')
 const original=structuredClone(project)
 const r=inspectManufacturingReleaseReadiness(project)
 assert.equal(r.status,'BLOCKED_NOT_APPROVED')
 assert.equal(r.engineeringGeometryPass,true)
 assert.equal(r.factoryCertified,false)
 assert.equal(r.factoryCuttingAuthorized,false)
 assert.equal(r.bulkProductionAuthorized,false)
 assert.equal(r.digitalCounts.industrialPatternBlockers,0)
 assert.equal(r.digitalCounts.physicalCutlineBlockers,0)
 assert.deepEqual(r.blockers.map(i=>i.code),['EXPERIMENTAL_NECKBAND','EXTERNAL_SAMPLE_EVIDENCE'])
 const zipFiles=buildFactoryPackageFiles(project)
 const stored=JSON.parse(strFromU8(zipFiles['manufacturing-release-readiness.json']))
 assert.deepEqual(stored,r)
 assert.equal(stored.configuredSizes.length,6)
 assert.equal(stored.factoryCuttingAuthorized,false)
 assert.deepEqual(project,original)
})

test('jeans report all 30 real mismatch blockers despite valid strip/physical CUT geometry',()=>{
 const project=createTemplateProject('jeans-501')
 const snapshot=JSON.stringify(project)
 const release=inspectManufacturingReleaseReadiness(project)
 assert.equal(release.digitalCounts.industrialPatternBlockers,30)
 assert.equal(release.digitalCounts.physicalCutlineBlockers,0)
 assert.equal(release.digitalCounts.gradedTopologyFindings,0)
 assert.equal(release.engineeringGeometryPass,false)
 assert(release.blockers.some(row=>row.code==='INDUSTRIAL_PATTERN_QA'&&row.blockerCount===30))
 assert(release.blockers.some(row=>row.code==='EXTERNAL_SAMPLE_EVIDENCE'))
 const files=buildFactoryPackageFiles(project)
 const inZip=JSON.parse(strFromU8(files['manufacturing-release-readiness.json']))
 assert.deepEqual(inZip,release)
 assert.equal(JSON.stringify(project),snapshot)
})

test('imported CLO source remains blocked even when the neck trim winding audit alone is green',()=>{
 const project=createTemplateProject('clo-male-tshirt')
 const r=inspectManufacturingReleaseReadiness(project)
 assert.equal(r.digitalCounts.gradedTopologyFindings,0)
 assert.equal(r.digitalCounts.industrialPatternBlockers,24)
 assert(r.digitalCounts.physicalCutlineBlockers>0)
 assert(r.blockers.some(row=>row.code==='UNAPPROVED_GRADE_TABLE'))
 assert.equal(r.engineeringGeometryPass,false)
 assert.equal(r.factoryCuttingAuthorized,false)
})

test('reference-only DXF, malformed patterns, and deliberately corrupted geometry fail closed',()=>{
 const project=createTemplateProject('tee')
 project.patternSource={referenceOnly:true}
 assert(inspectManufacturingReleaseReadiness(project).blockers.some(row=>row.code==='REFERENCE_ONLY_PATTERN'))
 const invalid=createTemplateProject('tee')
 invalid.pieces[0].points[0].x=NaN
 const r=inspectManufacturingReleaseReadiness(invalid)
 assert.equal(r.status,'BLOCKED_NOT_APPROVED')
 assert.equal(r.engineeringGeometryPass,false)
 assert.equal(r.factoryCertified,false)
 assert(r.blockers.some(row=>row.code==='PRODUCTION_PREFLIGHT'||row.code.includes('_FAILED')))
})

test('no supplied software-only check result can grant cut authorization without independent release',()=>{
 const project=createTemplateProject('tee')
 const software={blockers:0}
 const state=inspectManufacturingReleaseReadiness(project,{checks:{production:software,industrial:software,
  cutlines:software,gradedTopology:{issues:[]},notches:software,sample:{blockerCount:0}}})
 assert.equal(state.factoryCuttingAuthorized,false)
 assert.equal(state.factoryCertified,false)
 assert(state.blockers.some(row=>row.code==='EXPERIMENTAL_NECKBAND'))
 assert.equal(state.status,'BLOCKED_NOT_APPROVED')
})

test('unpaired malformed physical notch blocks every injected software check with piece size and notch identity',()=>{
 const project=createTemplateProject('tee')
 const piece=project.pieces.find(row=>row.notches?.length)
 assert(piece)
 const notch=piece.notches[0]
 notch.edgeIndex=99999
 const clean={blockers:0}
 const checks={production:clean,industrial:clean,cutlines:clean,gradedTopology:{issues:[]},notches:clean,
  junctions:{status:'not_configured'},sample:{blockerCount:0}}
 const release=inspectManufacturingReleaseReadiness(project,{checks})
 assert(release.digitalCounts.standalonePhysicalNotchBlockers>0)
 assert.equal(release.engineeringGeometryPass,false)
 assert.equal(release.factoryCuttingAuthorized,false)
 assert(release.blockers.some(row=>row.code==='STANDALONE_PHYSICAL_NOTCH_QA'&&
   row.reason.includes(piece.id)&&row.reason.includes(notch.id)&&
   project.grading.sizes.some(size=>row.reason.includes(size))))
})

test('invalid all-size grading blocks readiness and valid zero-notch inventory is not malformed',()=>{
 const invalid=createTemplateProject('tee')
 invalid.grading.sizes=[]
 const blocked=inspectManufacturingReleaseReadiness(invalid)
 assert.equal(blocked.engineeringGeometryPass,false)
 assert(blocked.blockers.some(row=>row.reason.includes('INVALID_NOTCH_SIZE_RUN')))
 const noNotches=createTemplateProject('tee')
 for(const piece of noNotches.pieces)piece.notches=[]
 const release=inspectManufacturingReleaseReadiness(noNotches)
 assert.equal(release.digitalCounts.standalonePhysicalNotchBlockers,0)
 assert(!release.blockers.some(row=>row.code==='STANDALONE_PHYSICAL_NOTCH_QA'))
})


test('malformed external sample evidence never silently clears the release gate',()=>{
 const project=createTemplateProject('tee')
 const clean={blockers:0}
 const checks={production:clean,industrial:clean,cutlines:clean,gradedTopology:{issues:[]},notches:clean,junctions:{status:'not_configured'}}
 for(const blockerCount of [-1,NaN,Infinity,0.5,'0',null]){
  const release=inspectManufacturingReleaseReadiness(project,{checks:{...checks,sample:{blockerCount}}})
  assert.equal(release.status,'BLOCKED_NOT_APPROVED')
  assert.equal(release.factoryCuttingAuthorized,false)
  assert(release.blockers.some(row=>row.code==='EXTERNAL_SAMPLE_EVIDENCE_INVALID'))
 }
 const forged={blockerCount:0,blockers:[],status:'evidence_complete_requires_human_factory_release',readyForHumanApproval:true,factoryCertified:true}
 const release=inspectManufacturingReleaseReadiness(project,{checks:{...checks,sample:forged}})
 assert(release.blockers.some(row=>row.code==='EXTERNAL_SAMPLE_EVIDENCE_INVALID'))
})
