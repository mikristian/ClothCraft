import test from 'node:test'
import assert from 'node:assert/strict'
import {INDUSTRIAL_GRADE_MODES as Modes,convertIndustrialGradeRule,evaluateIndustrialGradeTable} from './industrialGradeRules.js'
import {gradePiece} from './grading.js'
import {edgePointAt} from './project.js'
import {create501JeansTemplate} from '../data/jeans501.js'
import {inspectGradedSeamJunctions,JEANS501_YOKE_JUNCTIONS} from './gradedSeamJunctionQA.js'

const sizes=['XS','S','M','L','XL']
const grade={sizes,baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0}
const displacement={mode:Modes.SMALL_LARGE_INCREMENTAL,sizes,baseSize:'M',steps:[{dx:-.17,dy:.08},{dx:.33,dy:-.23},{dx:.71,dy:.19},{dx:-.09,dy:.41}]}
const rule=(scale)=>({...displacement,steps:displacement.steps.map(p=>({dx:p.dx*scale,dy:p.dy*scale}))})
const point=(id,x,y,scale)=>({id,x,y,industrialGradeRule:rule(scale)})
const fixture=()=>({id:'piece',points:[point('a',0,0,1),point('b',16,0,2),point('c',16,12,2),point('d',0,12,1)],curves:{0:{cx:8,cy:-2}},notches:[{id:'curve-notch',edgeIndex:0,t:.27,depthCm:.4,x:4,y:-1}],internalLines:[{id:'fold',type:'fold',a:{x:8,y:-1},b:{x:16,y:6},aAnchor:{edgeIndex:0,t:.37},bAnchor:{edgeIndex:1,t:.5}},{id:'dart',type:'dart',a:{x:0,y:0},b:{x:9,y:6},aAnchor:{vertexIndex:0}}]})

test('unequal signed industrial size breaks retain physical coordinates through all three conversion modes',()=>{
 const original=structuredClone(displacement)
 const expected=evaluateIndustrialGradeTable(displacement)
 for(const mode of Object.values(Modes)){
  const converted=convertIndustrialGradeRule(displacement,mode)
  const back=convertIndustrialGradeRule(converted,Modes.SMALL_LARGE_INCREMENTAL)
  for(const name of sizes){
   for(const axis of ['dx','dy']){
    assert.ok(Math.abs(evaluateIndustrialGradeTable(converted)[name][axis]-expected[name][axis])<1e-10,`${mode}/${name}/${axis}`)
    assert.ok(Math.abs(evaluateIndustrialGradeTable(back)[name][axis]-expected[name][axis])<1e-10)
   }
  }
 }
 assert.deepEqual(displacement,original)
})

test('five sizes attach curved notch and internal fold/dart anchors while source stays immutable',()=>{
 const source=fixture(),preserved=structuredClone(source)
 for(const size of sizes){
  const result=gradePiece(source,grade,size)
  const notch=result.notches[0],fold=result.internalLines[0],dart=result.internalLines[1]
  assert.equal(notch.edgeIndex,0)
  assert.equal(notch.t,.27)
  const notchPosition=edgePointAt(result,0,.27,64).point
  // Notch arclength fraction must remain geometrically recoverable at every size.
  assert.ok(Number.isFinite(notchPosition.x)&&Number.isFinite(notchPosition.y))
  for(const [anchor,actual] of [[.37,fold.a],[.5,fold.b]]){
   const edge=anchor===.37?0:1
   const expected=edgePointAt(result,edge,anchor,64).point
   assert.ok(Math.hypot(expected.x-actual.x,expected.y-actual.y)<1e-9,`${size} internal line attachment on edge ${edge}`)
  }
  assert.equal(dart.a.x,result.points[0].x)
  assert.equal(dart.a.y,result.points[0].y)
  assert.ok(Number.isFinite(dart.b.x)&&Number.isFinite(dart.b.y))
 }
 assert.deepEqual(source,preserved)
})

test('501 paired yoke junctions remain blocked across nonbase sizes even when base matching is exact',()=>{
 const project=create501JeansTemplate(),preserved=structuredClone(project)
 const report=inspectGradedSeamJunctions(project,{junctions:JEANS501_YOKE_JUNCTIONS})
 assert.equal(report.factoryCertified,false)
 assert.equal(report.status,'blocked')
 assert.equal(report.configuredJunctions,2)
 assert.equal(report.checks.length,project.grading.sizes.length*2)
 assert.equal(report.checks.filter(check=>!check.pass).length,10)
 assert.deepEqual(new Set(report.issues.map(x=>x.code)),new Set(['GRADED_SHARED_JUNCTION_DRIFT']))
 for(const row of report.checks){
  assert.equal(row.pass,row.size==='W32')
  if(!row.pass)assert.ok(row.maximumGapCm>.05)
 }
 assert.deepEqual(project,preserved)
})
