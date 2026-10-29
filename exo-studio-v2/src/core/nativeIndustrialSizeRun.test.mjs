import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {buildNativeIndustrialSizeRun,buildSizeRun,gradeProject} from './grading.js'
import {initializeRustGradingKernel,rustGradingKernelStatus} from './rustGradingKernel.js'

const sizes=['XS','S','M','L','XL','XXL']
const rule=(pieceIndex,pointIndex)=>({mode:'small-large-incremental',sizes,baseSize:'M',steps:Array.from({length:5},(_,breakIndex)=>({dx:(breakIndex-2)*.11+(pieceIndex-pointIndex)*.15,dy:(pieceIndex+1)*(breakIndex+1)*.06-pointIndex*.04}))})
const fixture=()=>({id:'batch-test',revision:8,units:'cm',name:'Multi-panel Rust grade',grading:{sizes,baseSize:'M'},seams:[],customMeasurements:[],
 pieces:Array.from({length:4},(_,p)=>({id:`piece-${p}`,name:`Panel ${p}`,points:[
  {id:`${p}-a`,x:p*15,y:0,industrialGradeRule:rule(p,0)},
  {id:`${p}-b`,x:p*15+10,y:0,industrialGradeRule:rule(p,1)},
  {id:`${p}-c`,x:p*15+10,y:18,industrialGradeRule:rule(p,2)},
  {id:`${p}-d`,x:p*15,y:18,industrialGradeRule:rule(p,3)},
 ],curves:{0:{cx:p*15+5,cy:-2}},notches:[{id:`notch-${p}`,edgeIndex:1,t:.35,type:'single'}],
 internalLines:[{id:`dart-${p}`,type:'dart',a:{x:p*15+5,y:6},b:{x:p*15+5,y:14},widthCm:1.5}]})),
})

test('complete four-piece size run preserves all point IDs and marking geometry across native batch',()=>{
 const project=fixture(),original=structuredClone(project)
 const run=buildNativeIndustrialSizeRun(project)
 assert.deepEqual(Object.keys(run),sizes)
 for(const size of sizes){
  const expected=gradeProject(project,size),actual=run[size]
  assert.deepEqual(actual,expected)
  for(const piece of actual.pieces){
    assert.equal(piece.points.length,4)
    assert.equal(piece.notches[0].edgeIndex,1)
    assert.equal(piece.notches[0].t,.35)
    assert(piece.internalLines.every(line=>Number.isFinite(line.a.x)&&Number.isFinite(line.b.y)))
  }
 }
 assert.deepEqual(project,original)
 assert.deepEqual(buildSizeRun(project),run)
})

test('native Rust WASM and JS fallback return identical graded-size artifacts',async()=>{
 const project=fixture(),before=buildNativeIndustrialSizeRun(project)
 const bytes=readFileSync('public/wasm/exo_grading_kernel.wasm')
 assert.equal(await initializeRustGradingKernel({bytes}),true)
 assert.equal(rustGradingKernelStatus().backend,'rust-wasm')
 const after=buildNativeIndustrialSizeRun(project)
 for(const size of sizes){
  for(let i=0;i<4;i++)for(let j=0;j<4;j++){
    assert(Math.abs(before[size].pieces[i].points[j].x-after[size].pieces[i].points[j].x)<1e-9)
    assert(Math.abs(before[size].pieces[i].points[j].y-after[size].pieces[i].points[j].y)<1e-9)
  }
 }
 assert.deepEqual(buildSizeRun(project),after)
})

test('incomplete and stale rules fail closed without partial output or mutating source',()=>{
 const project=fixture(),copy=structuredClone(project)
 delete project.pieces[0].points[0].industrialGradeRule
 assert.throws(()=>buildNativeIndustrialSizeRun(project),/requires industrial rule/i)
 assert.deepEqual(project.pieces.slice(1),copy.pieces.slice(1))
 const wrong=fixture();wrong.pieces[3].points[2].industrialGradeRule.sizes=['S','M','L']
 assert.throws(()=>buildNativeIndustrialSizeRun(wrong),/length|size set/i)
})
