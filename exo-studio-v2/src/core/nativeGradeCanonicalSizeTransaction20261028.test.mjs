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
 return {snapshot,initialRun,ruleSet:second.ruleSet}
}

function bridge({badReceipt=false,badDurable=false,badNull=false,throwAfterDispatch=false}={}){
 const f=fixture();let revision=8,catalog=structuredClone(f.initialRun),calls=[]
 const request=async packet=>{
  calls.push(packet.op)
  if(packet.revision!=null&&packet.revision!==revision)throw Error('stale native revision')
  if(packet.op==='grade-run-status')return {revision,persistedInProject:true,sizeActivated:false,
   catalog:badNull&&revision===9?{...catalog,sizeCorrespondence:null}:structuredClone(catalog)}
  if(packet.op==='save')return {project:{template:structuredClone(f.snapshot.template),
   grade_run:badDurable&&revision===9?{...catalog,sizes:['forged']}:structuredClone(catalog)}}
  if(packet.op==='grade-run-commit'){
   catalog=structuredClone(packet.gradeRun);revision++
   if(throwAfterDispatch)throw Error('receipt transport interrupted')
   return {revision:badReceipt?8:revision,gradeRunCommitted:true}
  }
  if(packet.op==='snapshot')return {...structuredClone(f.snapshot),revision}
  throw Error('unexpected request '+packet.op)
 }
 return {...f,request,calls,getRevision:()=>revision,getCatalog:()=>catalog}
}

test('native canonical-size transaction commits five named sizes with independent graded points and durable witness',async()=>{
 const f=bridge()
 const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:f.request})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.revision,9)
 assert.deepEqual(result.sizes,['2','4','6','8','10'])
 assert.equal(f.getCatalog().schemaVersion,2)
 assert.equal(f.getCatalog().gradedTemplates[4].panels[0].polygon.points[1][0],.312)
 assert.equal(f.getCatalog().gradedTemplates[4].panels[1].polygon.points[2][0],.335)
 assert.deepEqual(f.calls,['grade-run-status','save','grade-run-commit','snapshot','grade-run-status','save'])
 assert.equal(result.factoryApproved,false)
})

test('stale source refuses before native mutation',async()=>{
 const f=bridge()
 const result=await commit({snapshot:f.snapshot,expectedRevision:7,ruleSet:f.ruleSet,request:f.request})
 assert.equal(result.ok,false)
 assert.equal(f.calls.length,0)
 assert.equal(f.getRevision(),8)
 assert.equal(result.needsNativeRecovery,false)
})

test('unchanged saved catalog and incomplete rule tables cannot commit',async()=>{
 const f=bridge()
 const existing=createAccuMarkNativeRuleSet(f.snapshot,{sizes:['2','4','6','8'],baseSize:'6'}).ruleSet
 const same=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:existing,request:f.request})
 assert.equal(same.ok,false)
 assert.equal(f.getRevision(),8)
 const corrupt=structuredClone(f.ruleSet);delete corrupt.panels.back.pointOffsetsMm['10']
 const invalid=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:corrupt,request:f.request})
 assert.equal(invalid.ok,false)
 assert.equal(f.getRevision(),8)
 assert.equal(f.calls.includes('grade-run-commit'),false)
})

test('canonical-size evolution cannot silently delete a previously saved external size alias',async()=>{
 const f=bridge()
 const status=await f.request({op:'grade-run-status',revision:8})
 status.catalog.sizeCorrespondence={US8:'8'}
 const request=async packet=>packet.op==='grade-run-status'?status:
  packet.op==='save'?{project:{template:f.snapshot.template,grade_run:status.catalog}}:
  (()=>{throw Error('Unauthorized native commit')})()
 const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request})
 assert.equal(result.ok,false)
 assert.match(result.reason,/correspondences/)
 assert.equal(result.needsNativeRecovery,false)
})

test('post-dispatch receipt loss is unknown outcome, not rollback',async()=>{
 const f=bridge({throwAfterDispatch:true})
 const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:f.request})
 assert.equal(result.ok,false)
 assert.equal(result.nativeCommitted,false)
 assert.equal(result.needsNativeRecovery,true)
 assert.equal(f.getRevision(),9)
})

test('postcommit durable catalog tampering fails with native recovery required',async()=>{
 const f=bridge({badDurable:true})
 const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:f.request})
 assert.equal(result.ok,false)
 assert.equal(result.nativeCommitted,true)
 assert.equal(result.needsNativeRecovery,true)
 assert.equal(f.getRevision(),9)
})

test('explicit null optional Rust catalog fields are not treated as omitted empty fields',async()=>{
 const f=bridge({badNull:true})
 const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:f.request})
 assert.equal(result.ok,false)
 assert.equal(result.nativeCommitted,true)
 assert.equal(result.needsNativeRecovery,true)
 assert.match(result.reason,/statusCatalog/)
})

test('post-dispatch wrong revision receipt is not interpreted as a failed native write',async()=>{
 const f=bridge({badReceipt:true})
 const result=await commit({snapshot:f.snapshot,expectedRevision:8,ruleSet:f.ruleSet,request:f.request})
 assert.equal(result.ok,false)
 assert.equal(result.needsNativeRecovery,true)
 assert.equal(f.getRevision(),9)
})
