import test from 'node:test'
import assert from 'node:assert/strict'
import {create501JeansTemplate} from '../data/jeans501.js'
import {createDefaultProject} from '../data/defaultProject.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'

const neverAuthorized=state=>{
 assert.equal(state.factoryCertified,false)
 assert.equal(state.factoryCuttingAuthorized,false)
 assert.equal(state.bulkProductionAuthorized,false)
}

test('501 jeans all-size 2D release stays blocked despite the matching W32 base yoke',()=>{
 const project=create501JeansTemplate(),before=structuredClone(project)
 const state=inspectManufacturingReleaseReadiness(project)
 neverAuthorized(state)
 assert.equal(state.status,'BLOCKED_NOT_APPROVED')
 assert.equal(state.digitalCounts.sharedJunctionBlockers,10)
 assert.ok(state.digitalCounts.industrialPatternBlockers>=30)
 assert.ok(state.blockers.some(x=>x.code==='GRADED_SHARED_JUNCTION_QA'))
 assert.ok(state.blockers.some(x=>x.code==='INDUSTRIAL_PATTERN_QA'))
 assert.deepEqual(project,before)
})

test('pending reference tee sample and receiver evidence cannot authorize factory cutting',()=>{
 const project=createDefaultProject(),state=inspectManufacturingReleaseReadiness(project)
 neverAuthorized(state)
 assert.equal(state.status,'BLOCKED_NOT_APPROVED')
 assert.ok(state.blockers.some(x=>x.code==='EXTERNAL_SAMPLE_EVIDENCE'))
})

test('even a deliberately all-green mocked digital audit cannot self-certify physical production',()=>{
 const p=createDefaultProject()
 const checks={production:{blockers:0},industrial:{blockers:0},cutlines:{blockers:0},gradedTopology:{issues:[]},notches:{blockers:0},junctions:{status:'not_configured',blockers:0},sample:{blockerCount:0}}
 const state=inspectManufacturingReleaseReadiness(p,{checks})
 neverAuthorized(state)
 assert.equal(state.status,'BLOCKED_NOT_APPROVED')
 assert.ok(state.blockers.some(x=>x.code==='EXTERNAL_SAMPLE_EVIDENCE_INVALID'))
 assert.equal(state.engineeringGeometryPass,true)
 const rejected=inspectManufacturingReleaseReadiness({...p,patternSource:{referenceOnly:true}},{checks})
 neverAuthorized(rejected)
 assert.equal(rejected.status,'BLOCKED_NOT_APPROVED')
 assert.ok(rejected.blockers.some(x=>x.code==='REFERENCE_ONLY_PATTERN'))
})
