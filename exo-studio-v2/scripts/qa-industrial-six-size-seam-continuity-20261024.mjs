import assert from 'node:assert/strict'
import {createTeeTemplate} from '../src/data/templates.js'
import {buildSewnIndustrialSizeRun20261024} from '../src/core/industrialSixSizeSeamContinuity20261024.js'
import {edgeLength,edgeRangeLength} from '../src/core/project.js'
import {quadraticAtLengthFraction} from '../src/core/draftingPrecision.js'
import {gradeProject} from '../src/core/grading.js'

const sizes=['XS','S','M','L','XL','XXL']
const rule=(dx=0)=>({mode:'small-large-incremental',sizes:[...sizes],baseSize:'M',steps:Array.from({length:5},()=>({dx,dy:0}))})
const real=createTeeTemplate()
const before=structuredClone(real)
let blocked='unexpected_pass'
try{buildSewnIndustrialSizeRun20261024(real)}catch(e){blocked=e.message}
assert.deepEqual(real,before)
assert.notEqual(blocked,'unexpected_pass')
const witness={pieces:real.pieces.length,seams:real.seams.length,gradingSizes:real.grading?.sizes,firstPiece:real.pieces[0]?.id,firstPointIndustrialRule:!!real.pieces[0]?.points?.[0]?.industrialGradeRule,topLevelKeys:Object.keys(real).slice(0,12),error:blocked}
const developmentWitness=[]
for(const size of sizes){
 const g=gradeProject(real,size)
 for(const seam of real.seams){
  const length=side=>{const piece=g.pieces.find(p=>p.id===side.pieceId);return edgeRangeLength(piece,side.edgeIndex,side.startT??0,side.endT??1)}
  const a=length(seam.a),b=length(seam.b)
  developmentWitness.push({size,seamId:seam.id,deltaCm:Math.abs(a-b),lengthAcm:a,lengthBcm:b})
 }
}
assert.equal(developmentWitness.length,84)
const worst=developmentWitness.reduce((a,b)=>a.deltaCm>=b.deltaCm?a:b)

// The sewn edges are matched quadratic outlines of equal physical length.
// The second side is reversed in seam correspondence: its notch is located
// at 65% of edge arclength; the first is at 35%.
const panel=(id,x,reverse=false)=>({id,points:[
 {x,y:0,industrialGradeRule:rule()},
 {x:x+20,y:0,industrialGradeRule:rule(1)},
 {x:x+20,y:10,industrialGradeRule:rule(1)},
 {x,y:10,industrialGradeRule:rule()},
],curves:{0:{cx:x+10,cy:-5}},notches:[{id:`${id}-notch`,edgeIndex:0,t:reverse?.65:.35,matchGroupId:'seam-match',matchedSeamId:'seam-1'}]})
const authored={id:'stitched-curved-six-size',grading:{sizes,baseSize:'M'},pieces:[panel('A',0),panel('B',40,true)],seams:[{id:'seam-1',a:{pieceId:'A',edgeIndex:0,startT:.1,endT:.9},b:{pieceId:'B',edgeIndex:0,startT:.1,endT:.9},reverseB:true}]}
// Existing grading transforms all control points with the same nonuniform
// global auto width grading. Matched translates produce equal seam lengths.
const snapshot=structuredClone(authored)
const result=buildSewnIndustrialSizeRun20261024(authored)
assert.deepEqual(authored,snapshot)
assert.equal(result.validation.status,'pass')
assert.equal(result.validation.checks.length,12)
assert.equal(result.validation.committedToRustProject,false)
for(const size of sizes){
 const g=result.run[size], a=g.pieces[0], b=g.pieces[1]
 assert.ok(Math.abs(edgeRangeLength(a,0,.1,.9)-edgeRangeLength(b,0,.1,.9))<=.05)
 assert.ok(Math.abs(edgeLength(a,0)-edgeLength(b,0))<1e-7)
 const tA=quadraticAtLengthFraction(a.points[0],{x:a.curves[0].cx,y:a.curves[0].cy},a.points[1],a.notches[0].t).parameter
 const tB=quadraticAtLengthFraction(b.points[0],{x:b.curves[0].cx,y:b.curves[0].cy},b.points[1],b.notches[0].t).parameter
 assert.ok(Math.abs(edgeRangeLength(a,0,.1,tA)-edgeRangeLength(b,0,tB,.9))<.02)
}
console.log(JSON.stringify({real:{...witness,developmentSeamChecks:developmentWitness.length,worstDevelopmentSeam:worst,seamFailuresOver005cm:developmentWitness.filter(x=>x.deltaCm>.05).length},authored:{status:result.validation.status,sizes:result.validation.checkedSizes,checks:result.validation.checks.length,notches:result.validation.matchedNotchGroups,reverseB:true,curved:true,partial:true,committedToRustProject:false}},null,2))
