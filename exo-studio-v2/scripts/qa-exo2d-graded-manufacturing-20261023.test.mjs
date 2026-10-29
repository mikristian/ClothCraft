import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../src/data/templates.js'
import {inspectManufacturingReleaseReadiness} from '../src/core/manufacturingReleaseReadiness.js'
import {inspectGradedSeamJunctions,JEANS501_YOKE_JUNCTIONS} from '../src/core/gradedSeamJunctionQA.js'
import {inspectGradedNotchPairs} from '../src/core/industrialNotchQA.js'

const fixtures=[
  {id:'tee',expectedJunctionConfigured:false,expectedNotchesConfigured:true,expectedGeometryBlocked:false},
  {id:'jeans-501',expectedJunctionConfigured:true,expectedNotchesConfigured:false,expectedGeometryBlocked:true},
  {id:'clo-male-tshirt',expectedJunctionConfigured:false,expectedNotchesConfigured:false,expectedGeometryBlocked:true},
]

for(const fixture of fixtures){
  test(`${fixture.id}: actual inspector findings remain unapproved and disclose missing checks`,()=>{
    const project=createTemplateProject(fixture.id)
    const before=structuredClone(project)
    const release=inspectManufacturingReleaseReadiness(project)
    const junctions=inspectGradedSeamJunctions(project,{
      junctions:fixture.id==='jeans-501'?JEANS501_YOKE_JUNCTIONS:project.gradingJunctionConstraints||[],
    })
    const notches=inspectGradedNotchPairs(project)
    const junctionConfigured=junctions.status!=='not_configured' && junctions.configuredJunctions>0 && junctions.checks.length>0
    const notchesConfigured=notches.pairedGroups>0 && notches.checks.length>0
    assert.equal(junctionConfigured,fixture.expectedJunctionConfigured,'junction coverage changed: review configured constraints')
    assert.equal(notchesConfigured,fixture.expectedNotchesConfigured,'notch coverage changed: review actual pairs')
    assert.deepEqual(project,before,'inspectors must leave templates unchanged')
    assert.equal(release.status,'BLOCKED_NOT_APPROVED')
    assert.equal(release.factoryCertified,false)
    assert.equal(release.factoryCuttingAuthorized,false)
    assert.equal(release.bulkProductionAuthorized,false)
    assert(release.blockers.some(b=>b.code==='EXTERNAL_SAMPLE_EVIDENCE'))
    assert.equal(release.engineeringGeometryPass,!fixture.expectedGeometryBlocked)
    assert.equal(release.digitalCounts.sharedJunctionBlockers,junctionConfigured?junctions.blockers:null)
    assert.equal(release.digitalCounts.pairedNotchBlockers,notches.blockers)
    if(!notchesConfigured)assert.equal(notches.checks.length,0,'zero notch failures does not imply checked pairs')
    if(fixture.id==='tee'){
      assert(release.blockers.some(b=>b.code==='EXPERIMENTAL_NECKBAND'))
      assert(notches.checks.every(c=>c.pass))
    }
    if(fixture.id==='jeans-501'){
      assert(junctions.blockers>0,'jeans yoke junction drift must remain a blocker')
      assert(release.digitalCounts.industrialPatternBlockers>0,'graded seam mismatch must remain a blocker')
      assert(release.blockers.some(b=>b.code==='GRADED_SHARED_JUNCTION_QA'))
    }
    if(fixture.id==='clo-male-tshirt'){
      assert(release.digitalCounts.productionBlockers>0)
      assert(release.digitalCounts.industrialPatternBlockers>0)
      assert(release.digitalCounts.physicalCutlineBlockers>0)
      assert(release.blockers.some(b=>b.code==='UNAPPROVED_GRADE_TABLE'))
    }
    console.log(JSON.stringify({fixture:fixture.id,status:release.status,counts:release.digitalCounts,
      blockerCodes:release.blockers.map(b=>b.code),junctionCoverage:junctionConfigured?'configured':'NOT_CONFIGURED',
      notchCoverage:notchesConfigured?`${notches.pairedGroups} paired groups / ${notches.checks.length} checks`:'NO_PAIRED_NOTCH_CHECKS',
      certified:release.factoryCertified}))
  })
}
