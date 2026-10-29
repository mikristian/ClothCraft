import test from 'node:test'
import assert from 'node:assert/strict'
import {commitNativeGradeSizeCorrespondenceTransaction20261028 as commit} from './nativeGradeSizeCorrespondenceTransaction20261028.js'

const setup=()=>{
 const template={panels:[{id:'front',polygon:{points:[[0,0],[.4,0],[.4,.3]]}}]}
 const sizes=['XS','S','M','L','XL','XXL']
 const run={schemaVersion:1,sizes,baseSize:'M',baseTemplate:structuredClone(template),
  gradedTemplates:sizes.map(()=>structuredClone(template)),pomSpecs:[]}
 const snapshot={revision:7,template,gradeRunPersisted:true,activeGradedSize:null}
 let revision=7,catalog=run,commits=0,corruptSave=false,throwAfter=false
 const request=async packet=>{
  if(packet.revision!==revision)throw Error('stale native revision')
  if(packet.op==='grade-run-status')return {revision,catalog:structuredClone(catalog),persistedInProject:true,sizeActivated:false}
  if(packet.op==='save')return {project:{template:structuredClone(template),grade_run:corruptSave?null:structuredClone(catalog)}}
  if(packet.op==='grade-run-commit'){
   commits++;catalog=structuredClone(packet.gradeRun);revision++
   return {gradeCatalogResult:{persisted:true},revision}
  }
  if(packet.op==='snapshot'){
   if(throwAfter)throw Error('receipt unavailable')
   return {...snapshot,revision}
  }
  throw Error('unsupported operation')
 }
 return {snapshot,request,get commits(){return commits},set corruptSave(v){corruptSave=v},set throwAfter(v){throwAfter=v}}
}

test('native F7 aliases commit once and verify persisted exact source and all six sizes',async()=>{
 const f=setup(),before=structuredClone(f.snapshot)
 const result=await commit({snapshot:f.snapshot,expectedRevision:7,aliases:{4:'S',6:'M',8:'L'},request:f.request})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.revision,8)
 assert.equal(result.aliases,3)
 assert.equal(result.authoredSizes,6)
 assert.equal(f.commits,1)
 assert.deepEqual(f.snapshot,before)
 assert.deepEqual(result.project.grade_run.sizeCorrespondence,{4:'S',6:'M',8:'L'})
 assert.deepEqual(result.project.template,before.template)
})

test('stale, invalid and tampered native preflight cannot commit',async()=>{
 for(const variant of ['stale','invalid','tampered']){
  const f=setup()
  if(variant==='tampered')f.corruptSave=true
  const result=await commit({snapshot:f.snapshot,expectedRevision:variant==='stale'?8:7,
   aliases:variant==='invalid'?{M:'S'}:{4:'S'},request:f.request})
  assert.equal(result.ok,false,variant)
  assert.equal(result.nativeCommitted,false)
  assert.equal(f.commits,0)
 }
})

test('postcommit native read failure reports recovery rather than pretending rollback',async()=>{
 const f=setup();f.throwAfter=true
 const result=await commit({snapshot:f.snapshot,expectedRevision:7,aliases:{4:'S'},request:f.request})
 assert.equal(result.ok,false)
 assert.equal(result.nativeCommitted,true)
 assert.equal(result.needsNativeRecovery,true)
 assert.equal(f.commits,1)
})

test('missing native commit receipt is UNKNOWN, not a false assertion of rollback or successful commit',async()=>{
 const f=setup()
 const request=async packet=>packet.op==='grade-run-commit'?null:f.request(packet)
 const result=await commit({snapshot:f.snapshot,expectedRevision:7,aliases:{4:'S'},request})
 assert.equal(result.ok,false)
 assert.equal(result.nativeCommitted,false)
 assert.equal(result.needsNativeRecovery,true)
})
