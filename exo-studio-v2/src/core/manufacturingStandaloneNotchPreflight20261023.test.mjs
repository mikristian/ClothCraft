import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {inspectProduction} from './productionPreflight.js'
import {inspectGradedNotchPairs} from './industrialNotchQA.js'
import {inspectGradedNotchCoordinateConsistency} from './gradedNotchCoordinateConsistency20261023.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'

const standalone = mutation => {
  const project=createTeeTemplate()
  const piece=project.pieces.find(p=>p.id==='front')
  piece.notches.push({id:'standalone-preflight-regression',edgeIndex:0,t:0.5,depthCm:0.3,...mutation})
  return project
}
const diagnosticCodes = project => inspectGradedNotchCoordinateConsistency(project).issues.map(issue=>issue.code)

test('existing paired inspection ignores standalone invalid edgeIndex; production emits warning rather than blocker',()=>{
  const project=standalone({edgeIndex:999})
  const original=structuredClone(project)
  const pairs=inspectGradedNotchPairs(project)
  const production=inspectProduction(project)
  assert.equal(pairs.blockers,0)
  assert(production.issues.some(issue=>issue.code==='NOTCH_INVALID'&&issue.severity==='warning'))
  assert(diagnosticCodes(project).includes('INVALID_NOTCH_STATION'))
  const release=inspectManufacturingReleaseReadiness(project)
  assert.equal(release.digitalCounts.pairedNotchBlockers,0)
  assert.equal(release.factoryCuttingAuthorized,false)
  assert.deepEqual(project,original)
})

test('invalid standalone t is reported by coordinate diagnostic across all six graded sizes',()=>{
  const project=standalone({t:Infinity})
  const qa=inspectGradedNotchCoordinateConsistency(project)
  assert.deepEqual(qa.checkedSizes,project.grading.sizes)
  assert.equal(qa.issues.filter(x=>x.code==='INVALID_NOTCH_STATION').length,project.grading.sizes.length)
  assert.equal(inspectGradedNotchPairs(project).blockers,0)
})

test('standalone physical depth has no paired-notch validation; cache corruption is separately diagnosed',()=>{
  for(const depthCm of [-0.1,0,Infinity]) {
    const project=standalone({depthCm})
    assert.equal(inspectGradedNotchPairs(project).blockers,0)
  }
  for(const cached of [{x:3},{x:NaN,y:7},{x:999,y:999}]) {
    const project=standalone(cached)
    const codes=diagnosticCodes(project)
    assert(codes.includes('INVALID_NOTCH_CACHED_COORDINATE')||codes.includes('STALE_NOTCH_CACHED_COORDINATE'),JSON.stringify(codes))
    assert.equal(inspectGradedNotchPairs(project).blockers,0)
  }
})

test('grade run keeps standalone notch identity and edge assignment; each size needs a physical edge check',()=>{
  const project=standalone({})
  const initial=structuredClone(project)
  for(const size of project.grading.sizes){
    const graded=gradeProject(project,size)
    const notch=graded.pieces.find(p=>p.id==='front').notches.find(n=>n.id==='standalone-preflight-regression')
    assert.equal(notch.edgeIndex,0,`size ${size}`)
    assert.equal(notch.t,0.5,`size ${size}`)
  }
  assert.deepEqual(project,initial)
})
