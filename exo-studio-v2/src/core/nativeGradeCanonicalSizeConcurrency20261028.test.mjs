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
  const initial=createAccuMarkNativeRuleSet(snapshot,{sizes:['2','4','6','8'],baseSize:'6'}).ruleSet
  const initialRun=prepareNativeGradeCatalog20261025(snapshot,{template:snapshot.template},initial).gradeRun
  const added=createAccuMarkNativeRuleSet(snapshot,{sizes:['2','4','6','8','10'],baseSize:'6'}).ruleSet
  const first=editAccuMarkNativePointRule(snapshot,added,{panelId:'front',pointIndex:1,size:'10',dxMm:12,dyMm:0})
  const second=editAccuMarkNativePointRule(snapshot,first.ruleSet,{panelId:'back',pointIndex:2,size:'10',dxMm:15,dyMm:0})
  return {snapshot,ruleSet:second.ruleSet,initialRun}
}

function nativeBridge(f,{onStatus,onSave,onCommit}={}){
  let revision=8,catalog=structuredClone(f.initialRun)
  const calls=[]
  const request=async packet=>{
    calls.push(packet.op)
    assert.equal(packet.revision,revision,'native CAS revision')
    if(packet.op==='grade-run-status'){
      if(onStatus)await onStatus()
      return {revision,persistedInProject:true,sizeActivated:false,catalog:structuredClone(catalog)}
    }
    if(packet.op==='save'){
      if(onSave)await onSave()
      return {project:{template:structuredClone(f.originalTemplate),grade_run:structuredClone(catalog)}}
    }
    if(packet.op==='grade-run-commit'){
      if(onCommit)await onCommit(packet)
      catalog=structuredClone(packet.gradeRun)
      revision++
      return {revision,gradeRunCommitted:true}
    }
    if(packet.op==='snapshot')return {...structuredClone(f.originalSnapshot),revision}
    throw Error('Unexpected native operation '+packet.op)
  }
  return {request,calls,getRevision:()=>revision,getCatalog:()=>catalog}
}

test('F7 canonical evolution rejects mutable grading edits during async status preflight without dispatch',async()=>{
  const f=fixture()
  f.originalSnapshot=structuredClone(f.snapshot)
  f.originalTemplate=structuredClone(f.snapshot.template)
  const native=nativeBridge(f,{onStatus:()=>{f.ruleSet.panels.front.pointOffsetsMm['10'][1][0]=900}})
  const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:native.request})
  assert.equal(result.ok,false)
  assert.match(result.reason,/inputs changed.*preflight/i)
  assert.deepEqual(native.calls,['grade-run-status'])
  assert.equal(result.needsNativeRecovery,false)
  assert.equal(native.getRevision(),8)
})

test('F7 canonical evolution rejects source mutation during save preflight without dispatch',async()=>{
  const f=fixture()
  f.originalSnapshot=structuredClone(f.snapshot)
  f.originalTemplate=structuredClone(f.snapshot.template)
  const native=nativeBridge(f,{onSave:()=>{f.snapshot.template.panels[0].polygon.points[1][0]+=.002}})
  const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:native.request})
  assert.equal(result.ok,false)
  assert.match(result.reason,/inputs changed.*preflight/i)
  assert.deepEqual(native.calls,['grade-run-status','save'])
  assert.equal(result.needsNativeRecovery,false)
  assert.equal(native.getRevision(),8)
})

test('F7 canonical evolution rejects transport-forged graded geometry even with matching saved Rust response',async()=>{
  const f=fixture()
  f.originalSnapshot=structuredClone(f.snapshot)
  f.originalTemplate=structuredClone(f.snapshot.template)
  const native=nativeBridge(f,{onCommit:packet=>{
    packet.gradeRun.gradedTemplates[4].panels[0].polygon.points[1][0]+=.02
  }})
  const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:native.request})
  assert.equal(result.ok,false)
  assert.equal(result.nativeCommitted,true)
  assert.equal(result.needsNativeRecovery,true)
  assert.match(result.reason,/statusCatalog|durableCatalog/)
  assert.equal(native.getRevision(),9)
})

test('F7 canonical evolution verifies transaction-owned rule evidence after postdispatch editor mutation',async()=>{
  const f=fixture()
  f.originalSnapshot=structuredClone(f.snapshot)
  f.originalTemplate=structuredClone(f.snapshot.template)
  const native=nativeBridge(f,{onCommit:()=>{
    f.ruleSet.panels.front.pointOffsetsMm['10'][1][0]=900
  }})
  const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:native.request})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.needsNativeRecovery,false)
  assert.equal(native.getRevision(),9)
  assert.equal(native.getCatalog().gradedTemplates[4].panels[0].polygon.points[1][0],.312)
})
