import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from './nativeGradeCatalogBridge20261025.js'
import {commitNativeGradeCanonicalSizeTransaction20261028 as commit} from './nativeGradeCanonicalSizeTransaction20261028.js'

function fixture(){
  const snapshot={revision:8,gradeRunPersisted:true,activeGradedSize:null,template:{panels:[
    {id:'front',polygon:{points:[[0,0],[.3,0],[.3,.4],[0,.4]],edges:['a','b','c','d']}},
    {id:'back',polygon:{points:[[0,0],[.32,0],[.32,.4],[0,.4]],edges:['e','f','g','h']}},
  ],seams:[],fabrics:[]}}
  const old=createAccuMarkNativeRuleSet(snapshot,{sizes:['2','4','6','8'],baseSize:'6'}).ruleSet
  const catalog=prepareNativeGradeCatalog20261025(snapshot,{template:snapshot.template},old).gradeRun
  const next=createAccuMarkNativeRuleSet(snapshot,{sizes:['2','4','6','8','10'],baseSize:'6'}).ruleSet
  const edit=editAccuMarkNativePointRule(snapshot,next,{panelId:'front',pointIndex:1,size:'10',dxMm:12,dyMm:0})
  assert.equal(edit.ok,true,edit.reason)
  return {snapshot,ruleSet:edit.ruleSet,catalog}
}

function bridge(f,extraProject={}){
  const calls=[]
  let revision=8,catalog=structuredClone(f.catalog)
  const request=async packet=>{
    calls.push(packet.op)
    assert.equal(packet.revision,revision)
    if(packet.op==='grade-run-status')return {revision,persistedInProject:true,sizeActivated:false,catalog:structuredClone(catalog)}
    if(packet.op==='save')return {project:{template:structuredClone(f.snapshot.template),grade_run:structuredClone(catalog),...structuredClone(extraProject)}}
    if(packet.op==='grade-run-commit'){
      catalog=structuredClone(packet.gradeRun)
      revision++
      return {revision,gradeRunCommitted:true}
    }
    if(packet.op==='snapshot')return {...structuredClone(f.snapshot),revision}
    throw Error('Unexpected native request '+packet.op)
  }
  return {request,calls,revision:()=>revision}
}

test('F7 refuses active or stale persisted point graph before any native request',async()=>{
  for(const graph of [{version:1,active:true,bindings:[{id:'a'}]},
    {version:1,active:false,bindings:[{id:'a'}]}]){
    const f=fixture(),before=structuredClone(f.snapshot)
    f.snapshot.nativePointBindings=graph
    const native=bridge(f)
    const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:native.request})
    assert.equal(result.ok,false)
    assert.match(result.reason,/qualified atomic Rust dependency regeneration.*native point bindings/i)
    assert.deepEqual(native.calls,[])
    assert.equal(result.needsNativeRecovery,false)
    assert.equal(native.revision(),8)
    assert.deepEqual(f.snapshot,{...before,nativePointBindings:graph})
  }
})

test('F7 refuses hidden saved native graph even when the viewport omits it',async()=>{
  const f=fixture(),native=bridge(f,{native_point_bindings:{version:1,bindings:[{id:'a'}]}})
  const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:native.request})
  assert.equal(result.ok,false)
  assert.match(result.reason,/Saved Rust project requires qualified atomic dependency regeneration.*native point bindings/i)
  assert.deepEqual(native.calls,['grade-run-status','save'])
  assert.equal(native.revision(),8)
  assert.equal(result.needsNativeRecovery,false)
})

test('F7 cannot silently strand facing, fabric chart or derived piece dependencies',async()=>{
  for(const [field,label] of [
    ['native_facing_dependency','native facing dependency'],
    ['fabric_grade_envelope','fabric grade envelope'],
    ['piece_variant','derived piece variant'],
  ]){
    const f=fixture(),native=bridge(f,{[field]:{version:1}})
    const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:native.request})
    assert.equal(result.ok,false)
    assert.match(result.reason,new RegExp(label))
    assert.deepEqual(native.calls,['grade-run-status','save'])
    assert.equal(native.revision(),8)
  }
})

test('F7 preserves normal native commit when no dependent source records exist',async()=>{
  const f=fixture(),native=bridge(f,{native_point_bindings:null,native_facing_dependency:null,
    fabric_grade_envelope:null,piece_variant:null})
  const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:native.request})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.nativeCommitted,true)
  assert.equal(native.revision(),9)
  assert.deepEqual(native.calls,['grade-run-status','save','grade-run-commit','snapshot','grade-run-status','save'])
})
