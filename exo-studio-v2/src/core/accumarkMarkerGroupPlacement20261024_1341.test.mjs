import test from 'node:test'
import assert from 'node:assert/strict'
import {applyAccuMarkMarkerGroupPlacement20261024 as apply} from './accumarkMarkerGroupPlacement20261024_1341.js'

const base=()=>({revision:8,pieces:[{id:'a',points:[{x:0,y:0},{x:3,y:0},{x:3,y:3},{x:0,y:3}],seamAllowance:0,cutQuantity:2,grainAngleDeg:0,marker:{nap:'one-way'}},{id:'b',points:[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}],seamAllowance:0,cutQuantity:1,grainAngleDeg:0,marker:{nap:'one-way'}}]})
const nest=()=>({ok:true,placements:[{pieceId:'a',instance:0,x:0,y:0,rotationDeg:0},{pieceId:'a',instance:1,x:8,y:0,rotationDeg:0},{pieceId:'b',instance:0,x:0,y:8,rotationDeg:0}],unplaced:[],errors:[]})
const members=[{pieceId:'a',instance:0},{pieceId:'b',instance:0}]
const spec=(kind,extra={})=>({kind,members,fabricWidthCm:20,maxLengthCm:30,gapCm:1,...extra})
test('slide translates two polygon instances preserving relative vector, unselected instance and source',()=>{
 const p=base(),n=nest(),before=JSON.stringify([p,n]),r=apply(p,n,spec('group.slide',{dxCm:2,dyCm:2}))
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.placements[0].x,2);assert.equal(r.placements[2].x,2)
 assert.equal(r.placements[0].y,2);assert.equal(r.placements[2].y,10)
 assert.equal(r.placements[1].x,8);assert.equal(JSON.stringify([p,n]),before)
 assert.equal(r.manufacturingApproved,false);assert.equal(r.provenance.sourceRevision,8)
})
test('step offsets successive instances, and alignment snaps single axis',()=>{
 const p=base(),n=nest()
 const step=apply(p,n,spec('group.step',{dxCm:4,dyCm:1}))
 assert.equal(step.ok,true,JSON.stringify(step));assert.equal(step.placements[0].x,0)
 assert.equal(step.placements[2].x,4);assert.equal(step.placements[2].y,9)
 const aligned=apply(p,n,spec('group.align',{axis:'x',members:[{pieceId:'a',instance:1},{pieceId:'b',instance:0}]}))
 assert.equal(aligned.ok,true,JSON.stringify(aligned));assert.equal(aligned.placements[2].x,8)
 assert.equal(aligned.placements[2].y,8);assert.equal(aligned.placements[1].x,8)
})
test('physical collision and gap failure refuses entire group atomically',()=>{
 const p=base(),n=nest(),before=JSON.stringify([p,n])
 const r=apply(p,n,spec('group.slide',{dxCm:5,dyCm:0}))
 assert.equal(r.ok,false);assert.equal(r.code,'PHYSICAL_COLLISION');assert.equal(JSON.stringify([p,n]),before)
})
test('fabric edge and marker max length are mandatory physical limits',()=>{
 const p=base(),n=nest()
 assert.equal(apply(p,n,spec('group.slide',{dxCm:18,dyCm:0})).code,'FABRIC_BOUNDS')
 assert.equal(apply(p,n,spec('group.slide',{dxCm:0,dyCm:22})).code,'FABRIC_BOUNDS')
})
test('quantity completeness, nap orientation and motif constraints refuse',()=>{
 const p=base(),n=nest()
 const missing=nest();missing.placements.pop()
 assert.equal(apply(p,missing,spec('group.slide',{dxCm:0,dyCm:1})).code,'GROUP_MEMBER_MISSING')
 const rotated=nest();rotated.placements[1].rotationDeg=180
 assert.equal(apply(p,rotated,spec('group.slide',{dxCm:0,dyCm:1})).code,'GRAIN_NAP_VIOLATION')
 p.pieces[0].marker.motif='stripe'
 assert.equal(apply(p,n,spec('group.slide',{dxCm:0,dyCm:1})).code,'UNSUPPORTED_FABRIC_CONSTRAINT')
})
test('hostile getter and cycle inputs refuse without getter invocation',()=>{
 let calls=0;const p=base(),n=nest(),s=spec('group.slide',{dxCm:1,dyCm:1})
 Object.defineProperty(n.placements[0],'x',{get(){calls++;throw Error('executed')}})
 assert.equal(apply(p,n,s).code,'SOURCE_REFUSED');assert.equal(calls,0)
 const normal=nest();normal.extra=normal
 assert.equal(apply(base(),normal,s).code,'SOURCE_REFUSED')
})
