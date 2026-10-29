import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAdvancedCadCurveHandle20261024_1423 as changeCurve} from './advancedCadCurveHandle20261024_1423.js'
import {preflightAdvancedCadGradedCurves} from './advancedCadGradedCurveQA20261024_1423.js'
import {inspectAdvancedCadSeamWalk20261024_1423 as inspectWalk} from './advancedCadSeamTrueing20261024_1423.js'

const panel=(id,offset)=>({id,name:id,points:[
  {x:offset,y:0},{x:offset+20,y:0},{x:offset+20,y:20},{x:offset,y:20}
]})
const source=()=>({revision:1,grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
  pieces:[panel('front',0),panel('back',30)],
  seams:[{id:'side',name:'Side panels',a:{pieceId:'front',edgeIndex:1},b:{pieceId:'back',edgeIndex:3},reverseB:true}]})

test('real CAD loop: preflight, seam walk, curve edit, re-grade and rewalk preserve sewn length',()=>{
  const document=source(),original=structuredClone(document)
  const pre=preflightAdvancedCadGradedCurves(document)
  assert.equal(pre.ok,true,JSON.stringify(pre.diagnostics))
  assert.deepEqual(pre.checkedSizes,['S','M','L'])
  const before=inspectWalk(document,{seamId:'side',sizes:document.grading.sizes})
  assert.equal(before.ok,true,before.reason)
  assert.equal(before.allSizesWithinTolerance,true)
  const moved=changeCurve(document,{kind:'curve.control.set',pieceId:'front',edgeIndex:0,cxCm:10,cyCm:-4})
  const after=inspectWalk(moved.project,{seamId:'side',sizes:document.grading.sizes})
  assert.equal(after.ok,true,after.reason)
  assert.equal(after.allSizesWithinTolerance,true)
  assert.equal(preflightAdvancedCadGradedCurves(moved.project).ok,true)
  assert.deepEqual(document,original)
  assert.equal(moved.manufacturingApproved,false)
})
test('CAD loop refuses a handle modification to stitched edge without falsely approving seam',()=>{
  const document=source()
  assert.throws(()=>changeCurve(document,{kind:'curve.control.set',pieceId:'front',edgeIndex:1,cxCm:23,cyCm:10}),/SEWN_EDGE_REQUIRES_TRUEING/)
  assert.equal(inspectWalk(document,{seamId:'side',sizes:['S','M','L']}).allSizesWithinTolerance,true)
})
