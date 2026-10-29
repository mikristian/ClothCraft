import test from 'node:test';import assert from 'node:assert/strict';
import {reviewNativeBindingMeasurements as review} from './nativeBindingMeasurementReview20261027.js';
import {createNativePatternConstraintSidecar20261023 as create,serializeNativePatternConstraintSidecar20261023 as serialize,deserializeNativePatternConstraintSidecar20261023 as deserialize} from './nativePatternConstraintBindings20261023.js';
import {planNativePatternConstraintBindings20261023 as plan} from './nativePatternConstraintBindings20261023.js';
import {planNativeAtomicPointBindings20261027 as atomic} from './nativeAtomicPointBindings20261027.js';
import {rebaseNativePatternBindingsAfterAnchorGroup20261027 as rebase} from './nativePatternBindingsRebase20261027.js';
const snapshot=()=>({revision:4,template:{id:'review-test',panels:['front','back'].map(id=>({id,polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d']}}))}});
const measurements=chest=>({chest,ease:40,quarter:{formula:'(chest + ease) / 4'}});
const bindings=['front','back'].map(panelId=>({id:panelId+'_width',panelId,pointIndex:1,mode:'along',a:0,b:1,distanceFormula:'quarter',dependsOn:[]}));
const make=s=>create(s,{measurements:measurements(920),bindings}).sidecar;
test('920 to 960 chest reviews 10 mm changes on both panels without mutating rules or geometry',()=>{
 const s=snapshot(),c=make(s),before=structuredClone({s,c});const result=review(s,c,measurements(960));
 assert.equal(result.ok,true,result.reason);assert.equal(result.atomic.panelCount,2)
 for(const change of result.changes){assert.ok(Math.abs(change.deltaMm[0]-10)<1e-8);assert.equal(change.deltaMm[1],0)}
 assert.deepEqual(result.sidecar.bindings,c.bindings);assert.deepEqual({s,c},before)
 assert.deepEqual(deserialize(serialize(result.sidecar)),result.sidecar)
 assert.equal(result.manufacturingApproved,false)
});
test('stale geometry and invalid formulas never create an executable update',()=>{
 const s=snapshot(),c=make(s);s.revision++;assert.equal(review(s,c,measurements(960)).ok,false);s.revision--;
 for(const m of [{chest:{formula:'chest'},ease:40,quarter:{formula:'chest/4'}},{chest:Infinity},{}]){
  const result=review(s,c,m);assert.equal(result.ok,false);assert.equal(result.atomic,undefined)
 }
});
test('a fully satisfied linked pattern remains inspectable and accepts the next worksheet revision',()=>{
 const s=snapshot(),sidecar=create(s,{measurements:measurements(760),bindings}).sidecar;
 assert(sidecar)
 const current=plan(s,sidecar)
 assert.equal(current.ok,true,current.reason)
 assert.equal(current.steps.length,2)
 assert.equal(current.commands.length,0)
 assert(current.steps.every(step=>step.unchanged))
 assert.equal(atomic(s,sidecar).ok,false)
 const same=review(s,sidecar,measurements(760))
 assert.equal(same.ok,true,same.reason)
 assert.equal(same.noGeometryChanges,true)
 assert.equal(same.atomic,null)
 const advanced=review(s,sidecar,measurements(920))
 assert.equal(advanced.ok,true,advanced.reason)
 assert.equal(advanced.atomic.pointCount,2)
 assert.deepEqual(advanced.changes.map(change=>change.deltaMm[0]),[40,40])
});
test('native binding sidecar can rebase one commit and regenerate a second real measurement change',()=>{
 const before=snapshot(),sidecar=make(before),first=atomic(before,sidecar)
 assert.equal(first.ok,true,first.reason)
 const after=structuredClone(before);after.revision++
 for(const command of first.commands){
   const panel=after.template.panels.find(item=>item.id===command.panel)
   for(const [index,position] of command.edits)panel.polygon.points[index]=[...position]
   panel.layout_2d=[0,0]
 }
 const rebased=rebase(before,after,sidecar,first)
 assert.equal(rebased.ok,true,rebased.reason)
 const satisfied=plan(after,rebased.sidecar)
 assert.equal(satisfied.ok,true,satisfied.reason)
 assert.equal(satisfied.commands.length,0)
 const next=review(after,rebased.sidecar,measurements(960))
 assert.equal(next.ok,true,next.reason)
 assert.equal(next.atomic.pointCount,2)
 assert.deepEqual(next.changes.map(change=>change.deltaMm[0]),[10,10])
});
