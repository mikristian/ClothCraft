// Source-only differential regression for eight bounded numerical stages.
// Capture complete JS public results BEFORE initializing WASM, then compare.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import * as THREE from 'three'
import {sampleGuideHalfCurve} from '../src/core/patternGuideHalfCurves.js'
import {cubicAt,cubicLength} from '../src/core/vectorPatternBezier.js'
import {simplifiedClothBoundary,measureClothBoundaryDeviation} from '../src/core/clothMeshing.js'
import {transferDrape,measureSeamGap} from '../src/core/liveDrapeTransfer.js'
import {garmentPreviewPage} from '../src/core/garmentPreviewPaging.js'
import {applySceneCameraViewport} from '../src/core/sceneCameraViewport.js'
import {normalizeWashSpec,washRgbMultiplier,sampleWashColor,WASH_EFFECTS} from '../src/core/clothWashProcedurals.js'
import {importedCloHardwareDimensions} from '../src/core/importedCloHardwareDimensions.js'
import {initializeRustCoreMathKernel,rustCoreMathStatus} from '../src/core/rustCoreMathKernel.js'

let seed=0x30202026
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
const xy=()=>[(rand()-.5)*200,(rand()-.5)*200]
const samples=Array.from({length:96},()=>({
  start:xy(),end:xy(),offset:xy(),angle:(rand()-.5)*Math.PI*4,
  a:xy(),c1:xy(),c2:xy(),b:xy(),t:rand(),
  width:20+rand()*100,depth:1+rand()*50,height:rand()*40,
  wash:{type:Object.keys(WASH_EFFECTS)[Math.floor(rand()*Object.keys(WASH_EFFECTS).length)],
    strength:rand(),scale:rand()*12+.1,rotation:(rand()-.5)*360,seed:Math.floor(rand()*1000),
    seamAbrasion:rand(),absorbency:rand(),cycleDuration:rand(),blend:['overlay','soft-light','screen','multiply'][Math.floor(rand()*4)]},
  uv:[rand(),rand()],
  page:Math.floor((rand()-.25)*50),pageSize:1+Math.floor(rand()*27),
  cam:{distanceMm:100+rand()*100000,horizontalAngle:(rand()-.5)*1200,verticalAngle:(rand()-.5)*300,
    fieldOfView:rand()*200,nearClipMm:.1+rand()*3000,farClipMm:rand()*500000,
    sensorWidthMm:rand()*150,focalLengthMm:10+rand()*200,physicalCamera:rand()>.5,viewType:rand()>.5?'orthographic':'spherical'},
  ring:Array.from({length:48},(_,i)=>({x:(12+rand()*.05)*Math.cos(i*Math.PI/24),y:(12+rand()*.05)*Math.sin(i*Math.PI/24)})),
}))
samples.push({start:[0,0],end:[10,0],offset:[0,4],angle:0,a:[0,0],b:[1,1],c1:[0,0],c2:[1,1],t:0,
  width:10,height:1,depth:3,wash:{type:'raw'},uv:[0,0],page:NaN,pageSize:0,
  cam:{distanceMm:'bad',horizontalAngle:null,verticalAngle:Infinity,nearClipMm:-5,farClipMm:0},ring:Array.from({length:36},(_,i)=>({x:i*.00000001,y:0}))})

const pagePieces=Array.from({length:29},(_,i)=>({id:`example-${i}`,points:Array.from({length:i%8===0?2:3},(_,j)=>({x:j,y:i}))}))
function runDrape(index){
  const old=[{x:0,y:0,position:{x:0,y:0,z:0}},
    {x:10,y:0,position:{x:1,y:0,z:0}},
    {x:0,y:10,position:{x:0,y:1,z:0}}]
  const snapshot=new Map([['one',{vertices:old,faces:[[0,1,2]]}]])
  const coordinates=index%2?[[1,1],[3,3],[20,20]]:[[2,2],[9,0],[6,3]]
  const particles=coordinates.map(()=>({position:{x:0,y:0,z:0},previous:{x:0,y:0,z:0}}))
  const piece={flatVertices:coordinates.map(([x,y])=>({x,y})),particles}
  const simulation={pieces:new Map([['one',piece]])}
  const stats=transferDrape(snapshot,simulation,.035)
  return {stats,particles:particles.map(p=>({position:p.position,previous:p.previous})),
    seamGap:measureSeamGap({seamConstraints:[{a:particles[0],b:particles[1]}]})}
}
function runCamera(settings){
  const camera=new THREE.PerspectiveCamera(34,1.5,.005,150)
  const controls={target:new THREE.Vector3(.1,1.5,-.25),minDistance:.5,maxDistance:50,update(){}}
  const canvas={dataset:{}}
  const ok=applySceneCameraViewport(camera,controls,settings,canvas)
  return {ok,position:camera.position.toArray(),fov:camera.fov,near:camera.near,far:camera.far,
    filmGauge:camera.filmGauge,viewType:camera.userData.exoSceneViewType,
    matrix:camera.projectionMatrix.toArray(),dataset:canvas.dataset}
}
function run(s,i){
  const boundary=simplifiedClothBoundary(s.ring)
  const page=garmentPreviewPage(pagePieces,s.page,s.pageSize)
  return {
    guide:sampleGuideHalfCurve(s.start,s.end,s.offset,s.angle,28),
    cubic:cubicAt(s.a,s.c1,s.c2,s.b,s.t),length:cubicLength(s.a,s.c1,s.c2,s.b,18),
    boundary,deviation:measureClothBoundaryDeviation(s.ring,boundary),
    drape:runDrape(i),
    page:{ids:page.pieces.map(p=>p.id),page:page.page,pageCount:page.pageCount,total:page.total,
      invalidCount:page.invalidCount,start:page.start,end:page.end},
    camera:runCamera(s.cam),
    wash:{spec:normalizeWashSpec(s.wash),rgb:washRgbMultiplier(s.uv[0],s.uv[1],s.wash),
      sampled:sampleWashColor([.2,.5,.8],s.uv[0],s.uv[1],s.wash)},
    hardware:importedCloHardwareDimensions({dimensionsMm:[s.width,s.height,s.depth]}),
  }
}
const reference=samples.map(run)
assert.equal(rustCoreMathStatus().backend,'javascript-fallback')
assert.equal(await initializeRustCoreMathKernel({bytes:readFileSync('public/wasm/exo_core_math_kernel.wasm')}),true)
assert.equal(rustCoreMathStatus().backend,'rust-wasm')
let numeric=0,maxError=0
const match=(a,b,path)=>{
  if(typeof a==='number'){
    numeric++
    if(Number.isNaN(a)){assert.ok(Number.isNaN(b),path);return}
    if(!Number.isFinite(a)){assert.equal(b,a,path);return}
    assert.equal(typeof b,'number',path)
    const error=Math.abs(a-b)
    maxError=Math.max(maxError,error)
    assert.ok(error<=1e-11*Math.max(1,Math.abs(a)),`${path}: ${a} vs ${b}, error ${error}`)
  }else if(Array.isArray(a)){
    assert.ok(Array.isArray(b),path);assert.equal(b.length,a.length,path)
    a.forEach((value,i)=>match(value,b[i],`${path}[${i}]`))
  }else if(a&&typeof a==='object'){
    assert.deepEqual(Object.keys(b).sort(),Object.keys(a).sort(),path)
    for(const key of Object.keys(a))match(a[key],b[key],`${path}.${key}`)
  }else assert.deepEqual(b,a,path)
}
samples.forEach((s,i)=>match(reference[i],run(s,i),`fixture ${i}`))
const modules=['patternGuideHalfCurves','vectorPatternBezier','clothMeshing','liveDrapeTransfer',
  'garmentPreviewPaging','sceneCameraViewport','clothWashProcedurals','importedCloHardwareDimensions']
console.log(JSON.stringify({pass:true,backend:rustCoreMathStatus().backend,seed:'0x30202026',
  modules,fixtures:samples.length,numericComparisons:numeric,maxAbsoluteError:maxError,
  originalDocumentWrites:0,solverCertified:false}))
