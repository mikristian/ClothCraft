import test from 'node:test'
import assert from 'node:assert/strict'
import {nestPolygons,polygonConflict} from './accumarkPolygonNesting20261024.js'

function rectangle(id,w,h,quantity=1){
 return {id,name:id,grainAngleDeg:0,cutQuantity:quantity,seamAllowance:0,marker:{nap:'one-way'},points:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]}
}

test('largest-first marker sequence is selectable, deterministic and retains piece instance IDs',()=>{
 const project={pieces:[rectangle('small',2,2,2),rectangle('large',6,3)]}
 const options={fabricWidth:10,gap:0.5,maxLength:30}
 const original=nestPolygons(project,options)
 const a=nestPolygons(project,{...options,placementOrder:'largest-first'})
 const b=nestPolygons(project,{...options,placementOrder:'largest-first'})
 assert.equal(original.placements[0].pieceId,'small')
 assert.equal(a.placements[0].pieceId,'large')
 assert.deepEqual(a,b)
 assert.equal(a.ok,true)
 assert.equal(a.metrics.placementOrder,'largest-first')
 assert.deepEqual(a.placements.filter(p=>p.pieceId==='small').map(p=>p.instance).sort(),[0,1])
 for(let i=0;i<a.placements.length;i++)for(let j=i+1;j<a.placements.length;j++)
  assert.equal(polygonConflict(a.placements[i].outline,a.placements[j].outline,options.gap),false)
})

test('unknown placement sequence fails closed before producing a marker',()=>{
 const result=nestPolygons({pieces:[rectangle('cut',2,2)]},{placementOrder:'random'})
 assert.equal(result.ok,false)
 assert.equal(result.placements.length,0)
 assert.deepEqual(result.errors,['invalid-layout-limits'])
})
