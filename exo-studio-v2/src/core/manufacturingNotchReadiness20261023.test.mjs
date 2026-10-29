import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectManufacturingNotchReadiness20261023 as inspect} from './manufacturingNotchReadiness20261023.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'

function specimen(notch) {
  const project = createTeeTemplate()
  for (const piece of project.pieces) piece.notches=[]
  if (notch) project.pieces[0].notches=[notch]
  return project
}

test('valid standalone notch passes all configured sizes without granting factory approval or mutating source',()=>{
  const project=specimen({id:'solo',edgeIndex:0,t:0.25,depthCm:0.3,type:'double'})
  const before=structuredClone(project)
  const r=inspect(project)
  assert.equal(r.standaloneNotchGatePass,true,JSON.stringify(r.standaloneNotchAudit.issues))
  assert.equal(r.standaloneNotchChecks,project.grading.sizes.length)
  assert.deepEqual(r.checkedSizes,project.grading.sizes)
  assert.equal(r.factoryCertified,false)
  assert.equal(r.factoryCuttingAuthorized,false)
  assert.deepEqual(project,before)
})

test('invalid unpaired notch blocks standalone and manufacturing release readiness with exact identity',()=>{
  const project=specimen({id:'bad-edge',edgeIndex:999,t:0.5,depthCm:0.3})
  const prior=inspectManufacturingReleaseReadiness(project)
  const gate=inspect(project)
  assert.equal(prior.engineeringGeometryPass,false)
  assert(prior.blockers.some(b=>b.code==='STANDALONE_PHYSICAL_NOTCH_QA' &&
    b.reason.includes('INVALID_STANDALONE_NOTCH_EDGE') &&
    b.reason.includes('M / front / bad-edge')))
  assert.equal(gate.engineeringGeometryPass,false)
  assert.equal(gate.standaloneNotchGatePass,false)
  assert(gate.blockers.some(b=>b.code==='INVALID_STANDALONE_NOTCH_EDGE' && b.size==='M' && b.notchId==='bad-edge'))
})

test('fraction, unsupported type and cache faults include size-scoped blockers',()=>{
  const project=specimen({id:'corrupt',edgeIndex:0,t:NaN,type:'triple',x:4,depthCm:0.3})
  const r=inspect(project)
  for(const code of ['INVALID_STANDALONE_NOTCH_FRACTION','UNSUPPORTED_STANDALONE_NOTCH_TYPE','INVALID_STANDALONE_NOTCH_CACHE']) {
    assert(r.blockers.some(b=>b.code===code && b.size==='M' && b.notchId==='corrupt'),code)
  }
  assert.equal(r.factoryCuttingAuthorized,false)
})

test('empty inventory and invalid size run fail closed',()=>{
  const empty=inspect(specimen())
  assert.equal(empty.standaloneNotchGatePass,false)
  assert(empty.blockers.some(b=>b.code==='STANDALONE_NOTCH_READINESS_UNVERIFIED'))
  const project=specimen({id:'solo',edgeIndex:0,t:0.5,depthCm:0.3})
  project.grading.sizes=['M','M']
  const invalid=inspect(project)
  assert.equal(invalid.standaloneNotchGatePass,false)
  assert(invalid.blockers.some(b=>b.code==='INVALID_NOTCH_SIZE_RUN'))
})
