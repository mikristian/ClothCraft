import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createNativePatternConstraintSidecar20261023 as create,
  planNativePatternConstraintBindings20261023 as plan,
} from './nativePatternConstraintBindings20261023.js'

const snapshot=()=>({revision:7,template:{panels:[{id:'front',polygon:{
  points:[[0,0],[0.4,0],[0.4,0.3],[0,0.3]],
  edges:['bottom','right','top','left'],curves:{},free_curve_points:{},
}}]}})
const measurements={width:{valueMm:420},height:{valueMm:310}}
const width={id:'width',panelId:'front',pointIndex:1,mode:'along',a:0,b:1,distanceFormula:'width'}
const height={id:'height',panelId:'front',pointIndex:2,mode:'polar',a:1,b:2,distanceFormula:'height',angleDeg:90}

test('linked point dependency sorts reverse-authored bindings and uses updated anchor',()=>{
  const source=snapshot()
  const made=create(source,{measurements,bindings:[{...height,dependsOn:['width']},width]})
  assert.equal(made.ok,true,made.reason)
  const result=plan(source,made.sidecar)
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(result.dependencyOrder,['width','height'])
  assert.deepEqual(result.steps.map(step=>step.bindingId),['width','height'])
  assert(Math.abs(result.steps[1].afterMm[0]-420)<1e-8)
  assert(Math.abs(result.steps[1].afterMm[1]-310)<1e-8)
})

test('missing geometric anchor dependency refuses reverse-authored stale preview and persisted sidecar',()=>{
  const source=snapshot()
  const made=create(source,{measurements,bindings:[height,width]})
  assert.equal(made.ok,false)
  assert.match(made.reason,/missing geometric point-binding dependency/i)
  assert.equal(made.sidecar,undefined)
  const valid=create(source,{measurements,bindings:[{...height,dependsOn:['width']},width]})
  assert.equal(valid.ok,true,valid.reason)
  const altered=structuredClone(valid.sidecar)
  altered.bindings[0].dependsOn=[]
  const result=plan(source,altered)
  assert.equal(result.ok,false)
  assert.match(result.reason,/missing geometric point-binding dependency/i)
  assert.equal(result.commands,undefined)
})

test('implicit reciprocal anchor references reject cycle before any commands',()=>{
  const source=snapshot()
  const reciprocal=[
    {...width,mode:'polar',a:2,b:0,angleDeg:0},
    {...height,mode:'polar',a:1,b:0,angleDeg:90},
  ]
  const made=create(source,{measurements,bindings:reciprocal})
  assert.equal(made.ok,false)
  assert.match(made.reason,/missing geometric point-binding dependency/i)
  assert.equal(made.sidecar,undefined)
})

test('linked graph fails closed for missing node, cycle and stale point source',()=>{
  const source=snapshot()
  assert.match(create(source,{measurements,bindings:[{...height,dependsOn:['width','missing']},width]}).reason,/missing point-binding dependency/i)
  assert.match(create(source,{measurements,bindings:[{...height,dependsOn:['width']},{...width,dependsOn:['height']}]}).reason,/circular/i)
  const made=create(source,{measurements,bindings:[{...height,dependsOn:['width']},width]})
  assert.equal(made.ok,true,made.reason)
  const stale=snapshot()
  stale.template.panels[0].polygon.points[1][0]=0.401
  const result=plan(stale,made.sidecar)
  assert.equal(result.ok,false)
  assert.match(result.reason,/fingerprint/i)
  assert.equal(result.commands,undefined)
})
