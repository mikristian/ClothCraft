import test from 'node:test'
import assert from 'node:assert/strict'
import {buildSewnIndustrialSizeRun20261024} from './industrialSixSizeSeamContinuity20261024.js'

const sizes=['XS','S','M','L','XL','XXL']
const rule=(dx=0,dy=0)=>({mode:'small-large-incremental',sizes:[...sizes],baseSize:'M',steps:Array.from({length:5},()=>({dx,dy}))})
const rect=(id,shift=0)=>({id,points:[{x:shift,y:0,industrialGradeRule:rule()},{x:shift+20,y:0,industrialGradeRule:rule(1)},{x:shift+20,y:10,industrialGradeRule:rule(1)},{x:shift,y:10,industrialGradeRule:rule()}],notches:[{id:`${id}-n`,edgeIndex:0,t:.5,matchGroupId:'pair',matchedSeamId:'join'}]})
const fixture=()=>({id:'test',grading:{sizes:[...sizes],baseSize:'M'},pieces:[rect('a'),rect('b',40)],seams:[{id:'join',a:{pieceId:'a',edgeIndex:0},b:{pieceId:'b',edgeIndex:0}}]})

test('returns detached six-size snapshots and matched physical seam/notch measurements',()=>{
 const p=fixture(),original=structuredClone(p)
 const out=buildSewnIndustrialSizeRun20261024(p)
 assert.deepEqual(p,original)
 assert.equal(out.validation.status,'pass')
 assert.deepEqual(out.validation.checkedSizes,sizes)
 assert.equal(out.validation.checks.length,12)
 assert.equal(out.run.XS.pieces[0].points[1].x,18)
 assert.equal(out.run.XXL.pieces[0].points[1].x,23)
 assert.equal(out.validation.factoryCertified,false)
 assert.equal(out.validation.committedToRustProject,false)
})
test('rejects accessors, sparse arrays and unknown nested metadata',()=>{
 const variants=[
  p=>Object.defineProperty(p.pieces[0].points[0],'x',{get(){throw Error('EXECUTED_GETTER')},enumerable:true}),
  p=>Object.defineProperty(p,'grading',{get(){throw Error('EXECUTED_GETTER')},enumerable:true}),
  p=>{delete p.pieces[0].points[1]},
  p=>{p.metadata={arbitrary:true}},
  p=>{p.pieces[0].unknownMetadata={nested:true}},
  p=>{p.pieces[0].points[0].anchor={edgeIndex:1}},
  p=>{p.pieces[0].points[0].industrialGradeRule.steps[0].foreign={x:1}},
  p=>{p.pieces[0].notches[0].x=10;p.pieces[0].notches[0].y=0},
  p=>{p.pieces[0].notches[0].gradeArcStation={distanceCm:1}},
  p=>{p.pieces[0].notches[0].opaque='bad'},
  p=>{p.grading.sizeChart={XS:1}},
 ]
 for(const mutate of variants){const p=fixture();mutate(p);assert.throws(()=>buildSewnIndustrialSizeRun20261024(p),e=>!String(e.message).includes('EXECUTED_GETTER'))}
})
test('rejects seam length divergence at an outer size atomically',()=>{
 const p=fixture();p.pieces[1].points[1].industrialGradeRule=rule(1.5)
 assert.throws(()=>buildSewnIndustrialSizeRun20261024(p),/SEAM_LENGTH_MISMATCH/)
})
test('rejects notch station divergence, missing pairs, unknown rules, and incomplete grading',()=>{
 for(const mutate of [
  p=>{p.pieces[1].notches[0].t=.7},
  p=>{p.pieces[1].notches=[]},
  p=>{p.pieces[0].points[0].industrialGradeRule.unknown=1},
  p=>{delete p.pieces[0].points[0].industrialGradeRule},
  p=>{p.seams[0].a.startT=.8},
  p=>{p.pieces[0].points[0].industrialGradeRule.sizes=['S','M']},
 ]){const p=fixture();mutate(p);assert.throws(()=>buildSewnIndustrialSizeRun20261024(p))}
})
test('measures quadratic curves and partial sewn intervals in material arc distance',()=>{
 const p=fixture()
 p.pieces[0].curves={'0':{cx:10,cy:-4}}
 p.pieces[1].curves={'0':{cx:50,cy:-4}}
 p.seams[0].a.startT=.1;p.seams[0].a.endT=.9
 p.seams[0].b.startT=.1;p.seams[0].b.endT=.9
 const out=buildSewnIndustrialSizeRun20261024(p)
 assert.equal(out.validation.checks.length,12)
 assert.ok(out.validation.checks[0].lengthAcm>14.4)
 p.pieces[1].curves[0].cy=-5
 assert.throws(()=>buildSewnIndustrialSizeRun20261024(p),/SEAM_LENGTH_MISMATCH/)
})
