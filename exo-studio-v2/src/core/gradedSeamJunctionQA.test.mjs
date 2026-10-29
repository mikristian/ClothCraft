import test from 'node:test'
import assert from 'node:assert/strict'
import {create501JeansTemplate} from '../data/jeans501.js'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {inspectGradedSeamJunctions,JEANS501_YOKE_JUNCTIONS} from './gradedSeamJunctionQA.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'
import {buildFactoryPackageZip} from './factoryPackage.js'
import {recoverFactorySourceFromZip} from './factorySourceRecovery.js'
import {unzipSync,strFromU8} from 'fflate'

const sizes=['W28','W30','W32','W34','W36','W38']

test('shared 501 yoke endpoint stations pass W32 but fail five other graded sizes on both sides',()=>{
 const project=create501JeansTemplate()
 const source=structuredClone(project)
 const qa=inspectGradedSeamJunctions(project,{junctions:JEANS501_YOKE_JUNCTIONS})
 assert.equal(qa.status,'blocked')
 assert.equal(qa.blockers,10)
 assert.equal(qa.checks.length,12)
 assert.equal(qa.configuredJunctions,2)
 assert.deepEqual(qa.checkedSizes,sizes)
 for(const item of qa.checks){
  const index=sizes.indexOf(item.size)
  const expected=Math.abs(index-2)*0.5715
  assert(Math.abs(item.firstGapCm-expected)<1e-8)
  assert(Math.abs(item.lastGapCm-expected)<1e-8)
  assert.equal(item.pass,item.size==='W32')
 }
 assert.equal(qa.factoryCertified,false)
 assert.deepEqual(project,source)
})

test('authored optional junction QA never fabricates constraints on an ordinary Foundation Tee',()=>{
 const tee=createTeeTemplate()
 const report=inspectGradedSeamJunctions(tee)
 assert.equal(report.status,'not_configured')
 assert.equal(report.checks.length,0)
 assert.equal(report.factoryCertified,false)
 const readiness=inspectManufacturingReleaseReadiness(tee)
 assert.equal(readiness.digitalCounts.sharedJunctionBlockers,null)
 assert(!readiness.blockers.some(row=>row.code==='GRADED_SHARED_JUNCTION_QA'))
})

test('501 factory ZIP explicitly records both 30 mismatched sewing edges and 10 shared endpoint drifts',()=>{
 const project=create501JeansTemplate(),source=structuredClone(project)
 const zip=buildFactoryPackageZip(project),files=unzipSync(zip)
 const paired=JSON.parse(strFromU8(files['graded-seam-junction-qa.json']))
 const release=JSON.parse(strFromU8(files['manufacturing-release-readiness.json']))
 assert.equal(paired.blockers,10)
 assert.equal(release.digitalCounts.industrialPatternBlockers,30)
 assert.equal(release.digitalCounts.sharedJunctionBlockers,10)
 assert(release.blockers.some(row=>row.code==='GRADED_SHARED_JUNCTION_QA'&&row.blockerCount===10))
 assert.equal(release.factoryCuttingAuthorized,false)
 const recovered=recoverFactorySourceFromZip(zip)
 assert.equal(recovered.verifiedSizes.length,6)
 assert.deepEqual(recovered.project,JSON.parse(JSON.stringify(project)))
 assert.deepEqual(project,source)
})

test('widening a yoke can pass seam length while a shared endpoint mismatch still fails the independent grade check',()=>{
 const source=create501JeansTemplate()
 const size='W38'
 const snap=gradeProject(source,size)
 const yoke=snap.pieces.find(row=>row.id==='left-back-yoke')
 const leg=snap.pieces.find(row=>row.id==='left-back-leg')
 const widthBefore=yoke.points[2].x-yoke.points[3].x
 const widthWanted=leg.points[9].x-leg.points[0].x
 const delta=widthWanted-widthBefore
 yoke.points[2].x+=delta
 const mismatchLength=Math.abs((yoke.points[2].x-yoke.points[3].x)-widthWanted)
 assert(mismatchLength<1e-8)
 // Paired endpoint is displaced by 1.7145 cm despite exact join length.
 const firstGap=Math.hypot(yoke.points[2].x-leg.points[9].x,yoke.points[2].y-leg.points[9].y)
 assert(Math.abs(firstGap-1.7145)<1e-8)
 // Original project is unmodified and remains blocked in a six-size factory run.
 const originalReport=inspectGradedSeamJunctions(source,{junctions:JEANS501_YOKE_JUNCTIONS})
 assert.equal(originalReport.blockers,10)
})

test('altered sewing references and stale nonmatching base drafting stations fail closed',()=>{
 const missing=create501JeansTemplate()
 missing.seams=missing.seams.filter(row=>row.id!=='right-yoke-join')
 assert.throws(()=>inspectGradedSeamJunctions(missing,{junctions:JEANS501_YOKE_JUNCTIONS}),/source sewing reference missing/)
 const changed=create501JeansTemplate()
 changed.pieces.find(row=>row.id==='left-back-yoke').points[2].x+=1
 const qa=inspectGradedSeamJunctions(changed,{junctions:JEANS501_YOKE_JUNCTIONS})
 assert.equal(qa.status,'blocked')
 assert(qa.issues.some(item=>item.code==='UNVERIFIED_BASE_JUNCTION'))
})
