import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createNativePatternConstraintSidecar20261023 as create,
} from './nativePatternConstraintBindings20261023.js'
import {planNativeAtomicPointBindings20261027 as atomic} from './nativeAtomicPointBindings20261027.js'

const snapshot=()=>({revision:21,template:{panels:[
  {id:'front',polygon:{points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['b','r','t','l']}},
  {id:'back',polygon:{points:[[0,0],[.42,0],[.42,.3],[0,.3]],edges:['b','r','t','l']}},
]}})
const measurements={chest:{valueMm:900},frontWidth:{formula:'chest / 2 - 30'},backWidth:{formula:'chest / 2 - 20'}}
const rules=[
  {id:'frontWidth',panelId:'front',pointIndex:1,mode:'along',a:0,b:1,distanceFormula:'frontWidth',dependsOn:[]},
  {id:'backWidth',panelId:'back',pointIndex:1,mode:'along',a:0,b:1,distanceFormula:'backWidth',dependsOn:[]},
]
const make=(source=snapshot(),bindings=rules,values=measurements)=>create(source,{measurements:values,bindings})

test('measurement chart updates two independent source panels in ONE atomic native request',()=>{
  const source=snapshot(),before=structuredClone(source),created=make(source)
  assert.equal(created.ok,true,created.reason)
  const planned=atomic(source,created.sidecar)
  assert.equal(planned.ok,true,planned.reason)
  assert.equal(planned.op,'edit-batch')
  assert.equal(planned.sourceRevision,source.revision)
  assert.equal(planned.commands.length,2)
  assert.equal(planned.pointCount,2)
  assert.deepEqual(planned.commands.map(c=>c.panel),['front','back'])
  assert(planned.commands.every(c=>c.kind==='AnchorGroup'))
  assert(Math.abs(planned.commands[0].edits[0][1][0]-.42)<1e-12)
  assert(Math.abs(planned.commands[1].edits[0][1][0]-.43)<1e-12)
  assert.equal(planned.manufacturingApproved,false)
  assert(Object.isFrozen(planned.commands[0].edits[0][1]))
  assert.deepEqual(source,before)
})

test('recalculated numeric input changes both panels with no project mutation',()=>{
  const source=snapshot()
  const base=atomic(source,make(source).sidecar)
  const modified=make(source,rules,{...measurements,chest:{valueMm:940}})
  assert.equal(modified.ok,true,modified.reason)
  const after=atomic(source,modified.sidecar)
  assert.equal(after.ok,true,after.reason)
  assert(Math.abs(after.commands[0].edits[0][1][0]-base.commands[0].edits[0][1][0]-.02)<1e-12)
  assert(Math.abs(after.commands[1].edits[0][1][0]-base.commands[1].edits[0][1][0]-.02)<1e-12)
})

test('two ordered edits on one panel share a single native normalization pass',()=>{
  const source=snapshot(),bad=make(source,[rules[0],{...rules[1],panelId:'front',pointIndex:2,mode:'polar',a:1,b:2,angleDeg:90,dependsOn:['frontWidth']}])
  assert.equal(bad.ok,true,bad.reason)
  const result=atomic(source,bad.sidecar)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.commands.length,1)
  assert.equal(result.pointCount,2)
  assert.equal(result.commands[0].panel,'front')
  assert.equal(result.commands[0].kind,'AnchorGroup')
  assert.deepEqual(result.commands[0].edits.map(row=>row[0]),[1,2])
})

test('stale snapshot revision, changed geometry, unknown source or invalid rules reject atomically',()=>{
  const source=snapshot(),created=make(source)
  assert.equal(created.ok,true)
  const stale=structuredClone(source);stale.revision++
  assert.match(atomic(stale,created.sidecar).reason,/revision/i)
  const altered=structuredClone(source);altered.template.panels[1].polygon.points[0][0]=.02
  assert.match(atomic(altered,created.sidecar).reason,/fingerprint/i)
  const missing=structuredClone(source);missing.template.panels.pop()
  assert.equal(atomic(missing,created.sidecar).ok,false)
  assert.equal(make(source,[{...rules[0],distanceFormula:'missing'}]).ok,false)
})
