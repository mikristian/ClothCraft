import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectFoundationTeeEndToEnd20261024 as inspect} from './teeEndToEndAcceptanceGate20261024_1431.js'

test('canonical Foundation Tee passes draft, six-size grading, sewing and save/reopen',()=>{
  const source=createTeeTemplate(),before=structuredClone(source)
  const report=inspect({project:source})
  for(const stage of ['draft-and-grade','sewing-readiness','source-save-reopen'])
    assert.equal(report.checks.find(check=>check.stage===stage)?.pass,true,stage)
  assert.equal(report.ok,false)
  assert.equal(report.manufacturingApproved,false)
  assert.deepEqual(source,before)
})
test('real trajectory and external factory acceptance evidence remain separate requirements',()=>{
  const r=inspect({physicalFitEvidence:{passed:true},factoryRecipientEvidence:{factoryCertified:true}})
  assert.equal(r.checks.find(x=>x.stage==='physical-fit').pass,false)
  assert.equal(r.checks.find(x=>x.stage==='external-production').pass,false)
})
test('corrupted sleeve seam fails sewing or graded geometry acceptance',()=>{
  const p=createTeeTemplate()
  p.pieces.find(x=>x.id==='sleeve-left').points[2].x-=10
  const r=inspect({project:p})
  assert.equal(r.ok,false)
  assert(r.checks.some(x=>!x.pass&&['draft-and-grade','sewing-readiness'].includes(x.stage)))
})
test('accessor and hidden source metadata are rejected without invoking accessors',()=>{
  let calls=0
  const p=createTeeTemplate()
  Object.defineProperty(p,'trap',{enumerable:true,get(){calls++;throw Error('invoked')}})
  const report=inspect({project:p})
  assert.equal(calls,0)
  assert.equal(report.checks.find(x=>x.stage==='local-preflight').pass,false)
  const hidden=createTeeTemplate()
  Object.defineProperty(hidden,'hiddenSource',{value:{x:1},enumerable:false})
  assert.equal(inspect({project:hidden}).ok,false)
})
test('identity getter and shared mutable object aliasing fail closed',()=>{
  const p=createTeeTemplate()
  let invoked=0
  Object.defineProperty(p,'id',{enumerable:true,get(){invoked++;throw Error('id executed')}})
  const r=inspect({project:p})
  assert.equal(invoked,0)
  assert.equal(r.projectId,null)
  assert.equal(r.ok,false)
  const aliased=createTeeTemplate()
  aliased.pieces[1].points=aliased.pieces[0].points
  assert.equal(inspect({project:aliased}).checks.some(c=>c.stage==='local-preflight'&&!c.pass),true)
})
