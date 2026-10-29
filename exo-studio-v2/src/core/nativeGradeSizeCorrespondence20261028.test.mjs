import test from 'node:test'
import assert from 'node:assert/strict'
import {planNativeGradeSizeCorrespondence20261028 as plan,
 verifyNativeGradeSizeCorrespondence20261028 as verify}
 from './nativeGradeSizeCorrespondence20261028.js'

const fixture=()=>{
 const template={panels:[{id:'front',polygon:{points:[[0,0],[.4,0],[.4,.3]]}}]}
 const sizes=['XS','S','M','L','XL','XXL']
 const catalog={schemaVersion:1,sizes,baseSize:'M',baseTemplate:structuredClone(template),
  gradedTemplates:sizes.map(()=>structuredClone(template)),pomSpecs:[]}
 return {snapshot:{revision:7,template},status:{revision:7,catalog,
  persistedInProject:true,sizeActivated:false}}
}

test('native correspondence plan preserves every graded geometry and promotes only v2 metadata',()=>{
 const {snapshot,status}=fixture()
 const original=structuredClone(status.catalog)
 const result=plan(snapshot,status,{4:'S',6:'M',8:'L'})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.request.op,'grade-run-commit')
 assert.equal(result.request.revision,7)
 assert.equal(result.request.gradeRun.schemaVersion,2)
 assert.deepEqual(result.request.gradeRun.sizeCorrespondence,{4:'S',6:'M',8:'L'})
 assert.deepEqual(result.request.gradeRun.gradedTemplates,original.gradedTemplates)
 assert.deepEqual(status.catalog,original)
 const after={revision:8,persistedInProject:true,sizeActivated:false,catalog:result.expectedCatalog}
 assert.equal(verify(snapshot,result,after,{grade_run:result.expectedCatalog,template:snapshot.template}).ok,true)
 assert.equal(verify(snapshot,result,after,{grade_run:result.expectedCatalog,template:{panels:[]}}).ok,false)
})

test('unsafe alias, canonical collision, unknown size, stale status and incomplete source fail closed',()=>{
 const {snapshot,status}=fixture()
 const before=structuredClone(status)
 assert.equal(plan(snapshot,status,{}).ok,false)
 for(const aliases of [{M:'S'},{4:'99'},{'bad size':'S'},
  Object.fromEntries([['__proto__','S']]),{['x'.repeat(25)]:'S'}]){
  assert.equal(plan(snapshot,status,aliases).ok,false,JSON.stringify(aliases))
 }
 assert.equal(plan(snapshot,{...status,revision:8},{4:'S'}).ok,false)
 assert.equal(plan(snapshot,{...status,sizeActivated:true},{4:'S'}).ok,false)
 assert.equal(plan(snapshot,{...status,catalog:{...status.catalog,gradedTemplates:[]}},{4:'S'}).ok,false)
 assert.equal(plan({...snapshot,template:{panels:[]} },status,{4:'S'}).ok,false)
 assert.deepEqual(status,before)
})

test('unchanged v2 aliases do not create a redundant native history entry',()=>{
 const {snapshot,status}=fixture()
 status.catalog.schemaVersion=2
 status.catalog.sizeCorrespondence={4:'S'}
 assert.equal(plan(snapshot,status,{4:'S'}).ok,false)
 assert.equal(plan(snapshot,status,{4:'M'}).ok,false)
 assert.equal(plan(snapshot,status,{4:'S',6:'M'}).ok,true)
})

test('24-size v2 correspondence cannot silently drop or redirect existing external identities',()=>{
 const {snapshot,status}=fixture()
 status.catalog.schemaVersion=2
 status.catalog.sizes=Array.from({length:24},(_,i)=>String(i+1))
 status.catalog.baseSize='12'
 status.catalog.gradedTemplates=status.catalog.sizes.map(()=>structuredClone(snapshot.template))
 status.catalog.sizeCorrespondence={US12:'12',EU40:'14'}
 const before=structuredClone(status)
 assert.equal(plan(snapshot,status,{US12:'12'}).ok,false)
 assert.equal(plan(snapshot,status,{US12:'11',EU40:'14'}).ok,false)
 const allowed=plan(snapshot,status,{US12:'12',EU40:'14',UK10:'16'})
 assert.equal(allowed.ok,true,allowed.reason)
 assert.equal(allowed.expectedCatalog.sizes.length,24)
 assert.deepEqual(allowed.expectedCatalog.sizeCorrespondence,{EU40:'14',UK10:'16',US12:'12'})
 assert.deepEqual(status,before)
})

test('transport-side mutation cannot forge the immutable native commit witness',()=>{
 const {snapshot,status}=fixture()
 const planned=plan(snapshot,status,{EU40:'L',US12:'M'})
 assert.equal(planned.ok,true,planned.reason)
 assert.notStrictEqual(planned.request.gradeRun,planned.expectedCatalog)
 assert.notStrictEqual(planned.request.gradeRun.gradedTemplates,planned.expectedCatalog.gradedTemplates)
 assert.equal(Object.isFrozen(planned),true)
 assert.equal(Object.isFrozen(planned.expectedCatalog),true)
 assert.equal(Object.isFrozen(planned.expectedCatalog.sizeCorrespondence),true)
 assert.equal(Object.isFrozen(planned.expectedCatalog.gradedTemplates[0]),true)
 const original=structuredClone(planned.expectedCatalog)
 // Model an RPC adapter changing a submitted alias and a graded point.
 planned.request.gradeRun.sizeCorrespondence.EU40='XL'
 planned.request.gradeRun.gradedTemplates[0].panels[0].polygon.points[0][0]=.05
 assert.deepEqual(planned.expectedCatalog,original)
 const forged={revision:planned.expectedRevision,persistedInProject:true,
  sizeActivated:false,catalog:planned.request.gradeRun}
 assert.equal(verify(snapshot,planned,forged,{grade_run:planned.request.gradeRun,
  template:snapshot.template}).ok,false)
 const genuine={...forged,catalog:original}
 assert.equal(verify(snapshot,planned,genuine,{grade_run:original,
  template:snapshot.template}).ok,true)
 assert.throws(()=>{planned.expectedCatalog.sizeCorrespondence.EU40='XL'},TypeError)
 assert.throws(()=>{planned.expectedCatalog.gradedTemplates[0].panels[0].polygon.points[0][0]=.05},TypeError)
})
