import test from 'node:test'
import assert from 'node:assert/strict'
import {pickNativeSeam3DGuideScreen20261025 as pick,
  rankNativeSeam3DGuideScreen20261025 as rank,
  nativeSeamPerspectiveFraction20261025 as perspectiveFraction} from './nativeSeam3DHitGeometry20261025.js'

test('pixel-space guide hit is stable for diagonals and zoom independent',()=>{
  const guides=[{seamId:'shoulder',guideIndex:2,visible:true,a:[100,100],b:[200,100]},
    {seamId:'sleeve',guideIndex:4,visible:true,a:[100,110],b:[200,110]}]
  assert.equal(pick(guides,[160,103])?.seamId,'shoulder')
  assert.equal(pick(guides,[160,107])?.seamId,'sleeve')
  assert.equal(pick(guides,[160,121]),null)
  assert.equal(pick(guides,[98,103])?.guideIndex,2)
})

test('invisible, invalid, and out-of-range guides cannot intercept selection',()=>{
  const guides=[{seamId:'hidden',visible:false,a:[0,0],b:[50,0]},
    {seamId:'broken',visible:true,a:[NaN,0],b:[50,0]},
    {seamId:'live',visible:true,a:[0,1],b:[50,1]}]
  assert.equal(pick(guides,[25,0])?.seamId,'live')
  assert.equal(pick(guides,[25,0],Number.NaN),null)
  assert.equal(pick(guides,[Infinity,0]),null)
  assert.equal(pick([], [0,0]),null)
})

test('overlapping seams can be selected individually through deterministic cycling',()=>{
  const guides=[{seamId:'sleeve',guideIndex:1,visible:true,a:[100,100],b:[200,100]},
    {seamId:'shoulder',guideIndex:2,visible:true,a:[100,100],b:[200,100]},
    {seamId:'sleeve',guideIndex:3,visible:true,a:[100,101],b:[200,101]}]
  assert.deepEqual(rank(guides,[160,100]).map(hit=>hit.seamId),['shoulder','sleeve'])
  assert.equal(pick(guides,[160,100])?.seamId,'shoulder')
  assert.equal(pick(guides,[160,100],10,{cycleAfterId:'shoulder'})?.seamId,'sleeve')
  assert.equal(pick(guides,[160,100],10,{cycleAfterId:'sleeve'})?.seamId,'shoulder')
  assert.equal(pick(guides,[160,100],10,{cycleAfterId:'missing'})?.seamId,'shoulder')
  assert.equal(rank(guides,[160,100]).filter(hit=>hit.seamId==='sleeve').length,1)
  assert.equal(rank(guides,[160,100],10,{keepAllSamples:true}).length,3)
})

test('cycling cannot select hidden, invalid or outside-tolerance seams',()=>{
  const guides=[{seamId:'foreground',guideIndex:1,visible:true,a:[0,0],b:[80,0]},
    {seamId:'hidden',guideIndex:2,visible:false,a:[0,0],b:[80,0]},
    {seamId:'far',guideIndex:3,visible:true,a:[0,50],b:[80,50]}]
  assert.equal(rank(guides,[35,2]).length,1)
  assert.equal(pick(guides,[35,2],10,{cycleAfterId:'foreground'})?.seamId,'foreground')
  assert.deepEqual(rank(guides,[35,2],-10),[])
  assert.equal(pick(guides,[35,2],-10),null)
})

test('perspective correction restores the actual seam point at unequal depths',()=>{
  assert.equal(perspectiveFraction(.5,2,10),5/6)
  assert.equal(perspectiveFraction(.5,10,2),1/6)
  assert.equal(perspectiveFraction(.3,5,5),.3)
  assert.equal(perspectiveFraction(0,2,20),0)
  assert.equal(perspectiveFraction(1,2,20),1)
  assert.equal(perspectiveFraction(.5,0,20),null)
  assert.equal(perspectiveFraction(.5,Infinity,20),null)
})
