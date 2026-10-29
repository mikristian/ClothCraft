import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizePatternReference,validatePatternReferences,referenceProjectKey,REFERENCE_LIMIT,calibratePatternReferenceDistance20261025} from './nativePatternReferences20261025.js'
const photo = {id:'p1',name:'T-shirt',dataUrl:'data:image/png;base64,AAAA',naturalWidth:800,naturalHeight:400}
test('keeps mm proportions and allows fully transparent tracing photo',()=>{
  const r=normalizePatternReference({...photo,widthMm:300,heightMm:150,opacity:0})
  assert.equal(r.heightMm,150)
  assert.equal(r.opacity,0)
  assert.equal(r.locked,true)
})
test('rejects unsafe data URLs, duplicate identities and over-capacity projects',()=>{
  assert.throws(()=>normalizePatternReference({...photo,dataUrl:'javascript:alert(1)'}))
  assert.throws(()=>normalizePatternReference({...photo,dataUrl:'data:image/svg+xml;base64,AAAA'}))
  assert.throws(()=>validatePatternReferences([photo,photo]),/Duplicate/)
  assert.throws(()=>validatePatternReferences(Array(REFERENCE_LIMIT+1).fill(photo)),/limit/)
})
test('bounds dimensions, location, opacity, rotation and filename',()=>{
  const r=normalizePatternReference({...photo,opacity:22,widthMm:Infinity,xMm:-1e8,rotation:1e8,name:'x'.repeat(300)})
  assert.equal(r.opacity,1)
  assert.equal(r.xMm,-100000)
  assert.equal(r.rotation,3600)
  assert.equal(r.name.length,180)
  assert.equal(r.widthMm,200)
})
test('uses full panel identity and refuses missing project',()=>{
  assert.equal(referenceProjectKey({template:{id:'shirt',panels:[{id:'front'},{id:'back'}]}}),'shirt::front::back')
  assert.equal(referenceProjectKey({template:{id:'shirt',panels:[]}}),null)
})
test('two ruler points calibrate photo dimensions in real millimetres',()=>{
  const photo={naturalWidth:1200,naturalHeight:800}
  const calibrated=calibratePatternReferenceDistance20261025(photo,[{x:.1,y:.5},{x:.6,y:.5}],100)
  assert(Math.abs(calibrated.widthMm-200)<1e-8)
  assert(Math.abs(calibrated.heightMm-133.3333333)<1e-5)
  assert.equal(calibrated.lockAspectRatio,true)
  assert.throws(()=>calibratePatternReferenceDistance20261025(photo,[{x:.2,y:.2},{x:.2,y:.2}],100),/farther apart/)
  assert.throws(()=>calibratePatternReferenceDistance20261025(photo,[{x:-1,y:.2},{x:.4,y:.2}],100),/Select two positions/)
})
