import test from 'node:test'
import assert from 'node:assert/strict'
import { transferModarisGradedCurvedNotch20261027 as transfer } from './modarisGradedCurvedNotchTransfer20261027.js'
import { quadraticArcLength } from './draftingPrecision.js'

const panel=(id,x,t,curveY)=>({id,points:[{x,y:0},{x:x+10,y:0},{x:x+10,y:8},{x,y:8}],edgeNames:['top','right','bottom','left'],curves:{0:{cx:x+3,cy:curveY}},notches:[{id:'n',edgeIndex:0,t},{id:'other',edgeIndex:2,t:.4}]})
const fixture=()=>({revision:6,units:'cm',grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[panel('a',0,.37,3),panel('b',30,.75,5)]})
const refs={source:{pieceId:'a',notchId:'n'},target:{pieceId:'b',notchId:'n'},expectedRevision:6}

test('maps physical Bézier arclength to inverse target parameter for every size with immutable one revision edit',()=>{
 const original=fixture(),saved=structuredClone(original)
 const result=transfer(original,refs),target=result.project.pieces[1]
 assert.deepEqual(original,saved)
 assert.equal(result.project.revision,7)
 assert.equal(result.manufacturingApproved,false)
 assert.notEqual(target.notches[0].t,original.pieces[0].notches[0].t)
 assert.deepEqual(target.notches[1],original.pieces[1].notches[1])
 assert.deepEqual(target.curves,original.pieces[1].curves)
 assert.deepEqual(result.project.pieces[0],original.pieces[0])
 for(const row of result.proof){
  assert.ok(Math.abs(row.targetStationCm / row.targetEdgeCm - row.sourceStationCm / row.sourceEdgeCm)<1e-10)
  assert.ok(row.residualCm<1e-7)
  assert.ok(Math.abs(row.requiredTargetT-target.notches[0].t)<1e-9)
 }
 const a=target.points[0],b=target.points[1],c={x:target.curves[0].cx,y:target.curves[0].cy}
 assert.ok(Math.abs(quadraticArcLength(a,c,b,0,target.notches[0].t)/quadraticArcLength(a,c,b)-result.proof[1].normalizedStation)<1e-9)
})

test('refuses grade changes that require different target t values for different sizes',()=>{
 const p=fixture()
 p.grading.widthPerSizeCm=2
 p.grading.lengthPerSizeCm=1
 assert.throws(()=>transfer(p,refs),/REQUIRES_PER_SIZE_NOTCH_MAP/)
})

test('rejects attached/sewn data, topology, invalid curves and stale edit',()=>{
 assert.throws(()=>transfer(fixture(),{...refs,expectedRevision:5}),/STALE_REVISION/)
 const sewn=fixture();sewn.seams=[{id:'s'}]
 assert.throws(()=>transfer(sewn,refs),/ATTACHED_PRODUCTION/)
 const holes=fixture();holes.pieces[0].holes=[]
 assert.throws(()=>transfer(holes,refs),/PIECE_ATTACHMENTS/)
 const invalid=fixture();invalid.pieces[1].curves[0].cx=Infinity
 assert.throws(()=>transfer(invalid,refs),/UNSAFE_INPUT/)
 const topology=fixture();topology.pieces[1].notches[0].edgeIndex=99
 assert.throws(()=>transfer(topology,refs),/NOTCH_SCHEMA/)
 const straight=fixture();delete straight.pieces[1].curves[0]
 assert.throws(()=>transfer(straight,refs),/QUADRATIC_REQUIRED/)
})
