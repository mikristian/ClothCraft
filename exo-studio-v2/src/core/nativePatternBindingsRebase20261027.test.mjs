import test from 'node:test'
import assert from 'node:assert/strict'
import {createNativePatternConstraintSidecar20261023 as create,fingerprintNativePatternBindingsSource20261023 as fingerprint} from './nativePatternConstraintBindings20261023.js'
import {planNativeAtomicPointBindings20261027 as atomic} from './nativeAtomicPointBindings20261027.js'
import {rebaseNativePatternBindingsAfterAnchorGroup20261027 as rebase} from './nativePatternBindingsRebase20261027.js'

const snapshot=()=>({revision:12,template:{panels:[
  {id:'front',layout_2d:[1,2],pattern:{width:.4,height:.3},polygon:{points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['a','b','c','d']}},
  {id:'back',layout_2d:[3,4],pattern:{width:.4,height:.3},polygon:{points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['a','b','c','d']}},
]}})
const bindings=[
  {id:'width',panelId:'front',pointIndex:1,mode:'along',a:0,b:1,distanceFormula:'width'},
  {id:'height',panelId:'front',pointIndex:2,mode:'polar',a:1,b:2,distanceFormula:'height',angleDeg:90,dependsOn:['width']},
  {id:'backWidth',panelId:'back',pointIndex:1,mode:'along',a:0,b:1,distanceFormula:'width'},
]
const setup=()=>{const before=snapshot();const created=create(before,{bindings,measurements:{width:{valueMm:420},height:{valueMm:310}}});assert.equal(created.ok,true,created.reason);const proposal=atomic(before,created.sidecar);assert.equal(proposal.ok,true,proposal.reason);return {before,sidecar:created.sidecar,proposal}}
function committed(before,proposal){
  const after=structuredClone(before);after.revision++
  for(const command of proposal.commands){
    const p=after.template.panels.find(p=>p.id===command.panel)
    for(const [index,position] of command.edits)p.polygon.points[index]=[...position]
    const xs=p.polygon.points.map(v=>v[0]),ys=p.polygon.points.map(v=>v[1]);const lo=[Math.min(...xs),Math.min(...ys)]
    p.polygon.points=p.polygon.points.map(v=>[v[0]-lo[0],v[1]-lo[1]])
    p.layout_2d=p.layout_2d.map((v,i)=>v+lo[i])
    p.pattern.width=Math.max(...xs)-lo[0];p.pattern.height=Math.max(...ys)-lo[1]
  }
  return after
}
test('verifies multi-panel and ordered same-panel native edits and reanchors sidecar',()=>{
  const {before,sidecar,proposal}=setup(),after=committed(before,proposal)
  assert.equal(proposal.commands.length,2)
  assert.deepEqual(proposal.commands[0].edits.map(x=>x[0]),[1,2])
  const result=rebase(before,after,sidecar,proposal)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.sidecar.sourceRevision,13)
  assert.equal(result.sidecar.sourceFingerprint,fingerprint(after))
  assert(Object.isFrozen(result.sidecar.bindings[0]))
  assert.equal(sidecar.sourceRevision,12)
})
test('refuses revisions, stale plans, altered commits and unrelated project edits',()=>{
  const {before,sidecar,proposal}=setup(),after=committed(before,proposal)
  const reject=a=>assert.equal(rebase(before,a,sidecar,proposal).ok,false)
  reject({...after,revision:15})
  const mutated=structuredClone(after);mutated.template.panels[0].polygon.points[0][0]=.01;reject(mutated)
  const unrelated=structuredClone(after);unrelated.template.panels[1].pattern.width=.999;reject(unrelated)
  const changedProject=structuredClone(after);changedProject.template.newProperty='unsafe';reject(changedProject)
  const changedSource=structuredClone(before);changedSource.template.panels[0].polygon.points[0][0]=.01
  assert.equal(rebase(changedSource,after,sidecar,proposal).ok,false)
  assert.equal(rebase(before,after,{...sidecar,sourceRevision:11},proposal).ok,false)
})
test('rejects malformed commands, poison prototypes and nonfinite inputs',()=>{
  const {before,sidecar,proposal}=setup(),after=committed(before,proposal)
  assert.equal(rebase(before,after,sidecar,{...proposal,commands:[{...proposal.commands[0],edits:[[1,[NaN,0]]]}]}).ok,false)
  assert.equal(rebase(before,after,sidecar,{...proposal,commands:[proposal.commands[0],proposal.commands[0]]}).ok,false)
  assert.equal(rebase(before,after,sidecar,{...proposal,commands:[{...proposal.commands[0],edits:[[1,[.4,0]],[1,[.42,0]]]}]}).ok,false)
  assert.equal(rebase(before,after,sidecar,{...proposal,__proto__:null,commands:new Date()}).ok,false)
  const bad=structuredClone(after);bad.template.panels[0].polygon.points[0][1]=Infinity
  assert.equal(rebase(before,bad,sidecar,proposal).ok,false)
})
