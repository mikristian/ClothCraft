import test from 'node:test'
import assert from 'node:assert/strict'
import {buildNativeSeam3DSelection20261025,nativeSeamSelectionFromGuide20261025} from './nativeSeam3DSelection20261025.js'

const snapshot = () => ({revision:12,positions:[[0,0,0],[1,0,0],[0,1,0],[1,1,0]],
  panels:[{id:'front'},{id:'back'}],template:{seams:[{id:'shoulder',a:{panel:'front',edge:'top'},b:{panel:'back',edge:'top'},reverse_b:true}]},
  seams:[{id:'shoulder',gap_m:.003,rms_gap_m:.002,guides:[[[[0,.5],[1,.5]],[[2,.5],[3,.5]]]]}]})

test('maps native 2D endpoints and barycentric guides to selected 3D segments',()=>{
  const result=buildNativeSeam3DSelection20261025(snapshot(),{selected:{seamId:'shoulder',panel:'back',edge:'top'}})
  assert.equal(result.ok,true)
  const [relation]=result.relations
  assert.deepEqual(relation.guides[0].a,[.5,0,0])
  assert.deepEqual(relation.guides[0].b,[.5,1,0])
  assert.equal(relation.highlighted,true)
  assert.equal(relation.gapMm,3)
  assert.equal(relation.physicalClosureCertified,undefined)
  assert.deepEqual(nativeSeamSelectionFromGuide20261025(relation,'b'),{kind:'sewing',seamId:'shoulder',panel:'back',edge:'top'})
})

test('malformed 3D guides fail visibly without creating phantom seam segments',()=>{
  const input=snapshot()
  input.seams[0].guides.push([[[100,1]],[[2,1]]])
  const result=buildNativeSeam3DSelection20261025(input)
  assert.equal(result.ok,false)
  assert.equal(result.relations[0].guides.length,1)
  assert.deepEqual(result.issues.map(x=>x.code),['INVALID_GUIDE_WEIGHTS'])
})

test('2D selected edge highlights the associated compiled seam; missing 3D seam is reported',()=>{
  const result=buildNativeSeam3DSelection20261025(snapshot(),{selected:{panel:'front',edge:'top'}})
  assert.equal(result.relations[0].highlighted,true)
  const missing=snapshot();missing.seams=[]
  assert.deepEqual(buildNativeSeam3DSelection20261025(missing).issues.map(x=>x.code),['MISSING_COMPILED_SEAM'])
})
