import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createDefaultProject} from '../src/data/defaultProject.js'
import {buildMarker,buildFabricMarkers} from '../src/core/marker.js'
import {initializeRustMarkerKernel,rustMarkerRotatePoint,rustMarkerNormalizedRotation,rustMarkerKernelStatus} from '../src/core/rustMarkerKernel.js'

let seed=0x13001313
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
const samples=Array.from({length:2048},()=>({x:(random()-.5)*1000,y:(random()-.5)*1000,angle:(random()-.5)*5000}))
samples.push({x:0,y:0,angle:0},{x:0,y:0,angle:-180},{x:1,y:0,angle:540},{x:0,y:0,angle:NaN},{x:0,y:0,angle:Infinity})
const before=samples.map(({x,y,angle})=>({point:rustMarkerRotatePoint({x,y},angle),rotation:rustMarkerNormalizedRotation(angle)}))
const project=createDefaultProject()
const setups=[{width:165,gap:1.5},{width:90,gap:2},{width:45,gap:3}]
const baseline=setups.map(({width,gap})=>buildMarker(project,width,gap))
const multiBefore=buildFabricMarkers(project,165,2)
assert.equal(await initializeRustMarkerKernel({bytes:readFileSync('public/wasm/exo_marker_kernel.wasm')}),true)
assert.equal(rustMarkerKernelStatus().backend,'rust-wasm')
let maxError=0
for(let i=0;i<samples.length;i++){
  const {x,y,angle}=samples[i]
  const expected=before[i],actual=rustMarkerRotatePoint({x,y},angle)
  for(const axis of ['x','y']){
    if(Number.isNaN(expected.point[axis]))assert.ok(Number.isNaN(actual[axis]))
    else {
      const error=Math.abs(actual[axis]-expected.point[axis])
      maxError=Math.max(maxError,error)
      assert.ok(error<=1e-11*Math.max(1,Math.abs(expected.point[axis])),`sample ${i} ${axis}: ${error}`)
    }
  }
  const rotation=rustMarkerNormalizedRotation(angle)
  if(Number.isNaN(expected.rotation))assert.ok(Number.isNaN(rotation))
  else assert.ok(Math.abs(rotation-expected.rotation)<1e-12)
}
const after=setups.map(({width,gap})=>buildMarker(project,width,gap))
for(let i=0;i<after.length;i++){
  const actual=after[i],expected=baseline[i]
  assert.deepEqual(actual.placements.map(p=>[p.pieceId,p.instance,p.rotationDeg,p.crossGrain]),expected.placements.map(p=>[p.pieceId,p.instance,p.rotationDeg,p.crossGrain]))
  assert.deepEqual(actual.unplaced,expected.unplaced)
  assert.equal(actual.unusedPieces,expected.unusedPieces)
  assert.equal(actual.requestedPieces,expected.requestedPieces)
  for(let j=0;j<actual.placements.length;j++){
    const a=actual.placements[j],b=expected.placements[j]
    for(const key of ['x','y','width','height'])assert.ok(Math.abs(a[key]-b[key])<1e-9)
    assert.equal(a.outline.length,b.outline.length)
    for(let k=0;k<a.outline.length;k++)for(const axis of ['x','y'])assert.ok(Math.abs(a.outline[k][axis]-b.outline[k][axis])<1e-9)
  }
}
const multiAfter=buildFabricMarkers(project,165,2)
assert.deepEqual(Object.keys(multiAfter),Object.keys(multiBefore))
console.log(JSON.stringify({pass:true,seed:'0x13001313',rotations:samples.length,maxCoordinateError:maxError,markerWidths:setups.map(s=>s.width),ordering:true,overflow:true,outlineToleranceCm:1e-9,wasmAbi:rustMarkerKernelStatus().abiVersion}))
