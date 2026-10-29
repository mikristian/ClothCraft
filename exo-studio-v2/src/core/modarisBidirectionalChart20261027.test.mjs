import test from 'node:test'
import assert from 'node:assert/strict'
import {createNativePatternConstraintSidecar20261023 as create,fingerprintNativePatternBindingsSource20261023 as fingerprint} from './nativePatternConstraintBindings20261023.js'
import {reconcileModarisBidirectionalChart20261027 as reconcile} from './modarisBidirectionalChart20261027.js'
const snapshot=()=>({revision:2,template:{panels:[{id:'front',layout_2d:[0,0],pattern:{width:.4,height:.3},polygon:{points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['a','b','c','d']}}]}})
const binding=(mode='along')=>({id:'w',panelId:'front',pointIndex:1,mode,a:0,b:3,distanceFormula:'width',...(mode==='polar'?{angleDeg:0}:{})})
const fixture=(mode='polar')=>{
 const before=snapshot(),b=binding(mode)
 if(mode==='along')b.b=1
 if(mode==='normal')b.b=3
 const result=create(before,{measurements:{width:{valueMm:400}},bindings:[b]})
 assert.equal(result.ok,true,result.reason)
 return {before,sidecar:result.sidecar}
}
function batch(before,sidecar,position){
 const proposal={ok:true,op:'edit-batch',sourceRevision:before.revision,sourceFingerprint:fingerprint(before),panelCount:1,pointCount:1,commands:[{kind:'AnchorGroup',panel:'front',edits:[[1,position]]}]}
 const after=structuredClone(before);after.revision++
 const panel=after.template.panels[0],old=panel.polygon.points[1]
 panel.polygon.points[1]=[...position]
 const xs=panel.polygon.points.map(p=>p[0]),ys=panel.polygon.points.map(p=>p[1])
 const lo=[Math.min(...xs),Math.min(...ys)]
 panel.polygon.points=panel.polygon.points.map(p=>[p[0]-lo[0],p[1]-lo[1]])
 panel.layout_2d=[panel.layout_2d[0]+lo[0],panel.layout_2d[1]+lo[1]]
 panel.pattern.width=Math.max(...xs)-lo[0];panel.pattern.height=Math.max(...ys)-lo[1]
 return {proposal,after}
}
test('polar inverse verifies Rust-style before/after and rebinds worksheet',()=>{
 const {before,sidecar}=fixture()
 const {proposal,after}=batch(before,sidecar,[.42,0])
 const result=reconcile(before,after,sidecar,proposal,{bindingId:'w'})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.valueMm,420)
 assert.equal(result.sidecar.sourceRevision,3)
 assert.equal(result.sidecar.sourceFingerprint,fingerprint(after))
 assert.equal(result.sidecar.bindings[0].distanceFormula,'width')
 assert.equal(sidecar.measurements.width.valueMm,400)
})
test('two committed native edits reconcile in series',()=>{
 let {before,sidecar}=fixture()
 for(const value of [.42,.44]){
  const {proposal,after}=batch(before,sidecar,[value,0])
  const result=reconcile(before,after,sidecar,proposal,{bindingId:'w'})
  assert.equal(result.ok,true,result.reason)
  assert(Math.abs(result.valueMm-value*1000)<1e-8)
  before=after;sidecar=result.sidecar
 }
 assert.equal(sidecar.sourceRevision,4)
})
test('along and normal inverses refuse moving reference anchors and off-axis edits',()=>{
 const along=fixture('along');const good=batch(along.before,along.sidecar,[.42,0])
 assert.match(reconcile(along.before,good.after,along.sidecar,good.proposal,{bindingId:'w'}).reason,/construction reference/)
 const bad=batch(along.before,along.sidecar,[.42,.01])
 assert.match(reconcile(along.before,bad.after,along.sidecar,bad.proposal,{bindingId:'w'}).reason,/construction reference/)
 const normal=fixture('normal')
 const yes=batch(normal.before,normal.sidecar,[.42,0])
 const result=reconcile(normal.before,yes.after,normal.sidecar,yes.proposal,{bindingId:'w'})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.valueMm,-420)
})
test('stale evidence, dependent formulas, edited metadata and ambiguous references refuse',()=>{
 const {before,sidecar}=fixture(),{after,proposal}=batch(before,sidecar,[.42,0])
 const mutate=structuredClone(after);mutate.template.panels[0].layout_2d[0]+=.1
 assert.equal(reconcile(before,mutate,sidecar,proposal,{bindingId:'w'}).ok,false)
 assert.equal(reconcile({...before,revision:3},after,sidecar,proposal,{bindingId:'w'}).ok,false)
 const computed=structuredClone(sidecar);computed.measurements.width={formula:'other * 2'};computed.measurements.other={valueMm:200}
 assert.match(reconcile(before,after,computed,proposal,{bindingId:'w'}).reason,/non-invertible/)
 const dependent=structuredClone(sidecar);dependent.measurements.double={formula:'width * 2'}
 assert.match(reconcile(before,after,dependent,proposal,{bindingId:'w'}).reason,/Dependent/)
 const second=structuredClone(sidecar);second.bindings.push({...second.bindings[0],id:'other',pointIndex:2})
 assert.equal(reconcile(before,after,second,proposal,{bindingId:'w'}).ok,false)
})
