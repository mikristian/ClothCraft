import test from 'node:test'
import assert from 'node:assert/strict'
import {moveCloNativePolygonPoints20261025 as move,nudgeCloNativePolygonPoints20261025 as nudge} from './cloNativeMultiPointEdit20261025.js'

const source=()=>({panels:[{id:'front',polygon:{points:[[0,0],[1,0],[1,1],[0,1]],edges:['a','b','c','d'],curves:{a:[[.2,.1],[.8,.1]]},free_curve_points:{a:[{id:'k',t:.25,position:[.25,.1],derivative:[1,0],derivative_in:[1,0],derivative_out:[1,0]}]}}}],seams:[]})
test('single moved anchor adjusts incident cubic handles and Hermite station slope',()=>{
 const old=source(),result=move(old,{panelId:'front',indices:[0],delta:[.3,.15]})
 assert(result.ok,result.reason)
 const p=result.template.panels[0].polygon
 assert.deepEqual(p.points[0],[.3,.15]);assert.deepEqual(p.points[1],[1,0])
 assert(Math.abs(p.curves.a[0][0]-.4)<1e-12)
 assert(Math.abs(p.curves.a[1][0]-.9)<1e-12)
 assert(Math.abs(p.free_curve_points.a[0].position[0]-.475)<1e-12)
 assert(Math.abs(p.free_curve_points.a[0].derivative[0]-.7)<1e-12)
 assert.deepEqual(old,source())
})
test('all group translation preserves cubic and station shape and template immutability',()=>{
 const original=source(),r=move(original,{panelId:'front',indices:[0,1,2,3],deltaMm:[10,-20]})
 assert(r.ok,r.reason)
 assert(Math.abs(r.template.panels[0].polygon.curves.a[0][0]-.21)<1e-12)
 assert(Math.abs(r.template.panels[0].polygon.curves.a[1][0]-.81)<1e-12)
 assert.deepEqual(r.template.panels[0].polygon.curves.a.map(p=>p[1]),[.08,.08])
 assert.deepEqual(r.template.panels[0].polygon.free_curve_points.a[0].derivative,[1,0])
 assert.deepEqual(r.template.panels[0].polygon.points[2],[1.01,.98])
 assert.deepEqual(original,source())
})
test('axis constraint supports Shift XY and nudges',()=>{
 const r=nudge(source(),{panelId:'front',indices:[1,2],deltaMm:[10,20],axis:'x'})
 assert(r.ok,r.reason);assert.deepEqual(r.template.panels[0].polygon.points[1],[1.01,0]);assert.deepEqual(r.template.panels[0].polygon.points[2],[1.01,1])
})
test('invalid indices, axes, deltas, stations and sewn panel fail closed',()=>{
 const opts={panelId:'front',indices:[0],delta:[.1,.2]}
 for (const bad of [{indices:[]},{indices:[1,1]},{indices:[-1]},{indices:[4]},{indices:[1.2]},{delta:[Infinity,0]},{delta:[NaN,0]},{delta:[1]},{axis:'z'},{deltaMm:[10,0]}]) assert.equal(move(source(),{...opts,...bad}).ok,false)
 const malformed=source();malformed.panels[0].polygon.free_curve_points.a[0].t=1.2
 assert.equal(move(malformed,opts).ok,false)
 const sewn=source();sewn.seams=[{a:{panel:'front',edge:'a'},b:{panel:'back',edge:'a'}}]
 assert.match(move(sewn,opts).reason,/sewn/)
})
