import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectManufacturingNotchReadiness20261023 as inspect} from './manufacturingNotchReadiness20261023.js'
import {createAuthoredNotchInventoryBaseline20261023,compareAuthoredNotchInventoryBaseline20261023} from './authoredNotchInventory20261023.js'

function specimen(notches=[{id:'authored-1',edgeIndex:0,t:0.4,depthCm:0.3,type:'single'}]) {
  const project=createTeeTemplate()
  for (const piece of project.pieces) piece.notches=[]
  project.pieces[0].notches=notches
  return project
}
const blocked=(result,code)=>result.blockers.some(b=>b.code===code)

test('invalid numeric and malformed notch properties fail closed throughout graded run',()=>{
  const variants=[
    [{id:'n',edgeIndex:'0',t:0.4,depthCm:0.3},'INVALID_STANDALONE_NOTCH_EDGE'],
    [{id:'n',edgeIndex:0,t:Infinity,depthCm:0.3},'INVALID_STANDALONE_NOTCH_FRACTION'],
    [{id:'n',edgeIndex:0,t:0.4,depthCm:-0.2},'INVALID_STANDALONE_NOTCH_DEPTH'],
    [{id:'n',edgeIndex:0,t:0.4,depthCm:0.3,type:'triple'},'UNSUPPORTED_STANDALONE_NOTCH_TYPE'],
    [{id:'n',edgeIndex:0,t:0.4,depthCm:0.3,x:1},'INVALID_STANDALONE_NOTCH_CACHE'],
  ]
  for(const [notch,code] of variants){
    const p=specimen([notch]), before=structuredClone(p), result=inspect(p)
    assert.equal(result.standaloneNotchGatePass,false,code)
    assert(blocked(result,code),`${code}: ${JSON.stringify(result.blockers)}`)
    assert.equal(result.factoryCertified,false)
    assert.equal(result.factoryCuttingAuthorized,false)
    assert.deepEqual(p,before,`source mutation: ${code}`)
  }
})

test('invalid or duplicated size run fails closed even with legitimate notch',()=>{
  for(const sizes of [['M','M'],['M',42],['ZZ']]){
    const p=specimen(); p.grading.sizes=sizes
    const r=inspect(p)
    assert.equal(r.standaloneNotchGatePass,false)
    assert(blocked(r,'INVALID_NOTCH_SIZE_RUN'),JSON.stringify(r.blockers))
  }
})

test('empty source notch set blocks standalone gate',()=>{
  const p=specimen([]), before=structuredClone(p), r=inspect(p)
  assert.equal(r.standaloneNotchGatePass,false)
  assert.equal(r.standaloneNotchStatus,'not_configured')
  assert.deepEqual(p,before)
})

test('deleted authored source notch needs independently retained baseline',()=>{
  const p=specimen()
  const captured=createAuthoredNotchInventoryBaseline20261023(p)
  assert.equal(captured.status,'captured')
  p.pieces[0].notches=[]
  const comparison=compareAuthoredNotchInventoryBaseline20261023(p,captured.baseline)
  assert(comparison.issues.some(i=>i.code==='AUTHORED_NOTCH_MISSING'))
  const gate=inspect(p)
  assert.equal(gate.standaloneNotchGatePass,false)
  assert.equal(gate.factoryCertified,false)
})

test('double notch at an endpoint exposes current semantic gap without claiming it passes cutting QA',()=>{
  const p=specimen([{id:'endpoint-double',edgeIndex:0,t:0,depthCm:0.3,type:'double'}])
  const r=inspect(p)
  assert.equal(r.factoryCertified,false)
  assert.equal(r.factoryCuttingAuthorized,false)
  // Observation: station-endpoint double-cut collision is not modeled by this gate.
  assert.equal(r.standaloneNotchGatePass,true,JSON.stringify(r.blockers))
})

test('injected fake pass flags cannot override an actual invalid physical notch',()=>{
  const p=specimen([{id:'bad',edgeIndex:999,t:0.5,depthCm:0.3}])
  p.standaloneNotchGatePass=true
  p.factoryCertified=true
  p.standaloneNotchAudit={status:'pass',blockers:0,checks:[{size:'M'}]}
  const before=structuredClone(p), r=inspect(p)
  assert.equal(r.standaloneNotchGatePass,false)
  assert(blocked(r,'INVALID_STANDALONE_NOTCH_EDGE'))
  assert.equal(r.factoryCertified,false)
  assert.equal(r.factoryCuttingAuthorized,false)
  assert.deepEqual(p,before)
})
