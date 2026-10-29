import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {
  fingerprintNativePatternBindingsSource20261023 as fingerprint,
  createNativePatternConstraintSidecar20261023 as create,
  planNativePatternConstraintBindings20261023 as plan,
  serializeNativePatternConstraintSidecar20261023 as serialize,
  deserializeNativePatternConstraintSidecar20261023 as deserialize,
} from './nativePatternConstraintBindings20261023.js'

const snapshot=()=>({revision:18,template:{panels:[{id:'front',polygon:{
  points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['bottom','right','top','left'],
  curves:{bottom:[[.12,-.01],[.28,-.01]],right:[[.41,.1],[.41,.2]]},free_curve_points:{},
}}]}})
const bindings=[
  {id:'width',panelId:'front',pointIndex:1,mode:'along',a:0,b:1,distanceFormula:'width',dependsOn:[]},
  {id:'height',panelId:'front',pointIndex:2,mode:'polar',a:1,b:2,distanceFormula:'height',angleDeg:90,dependsOn:['width']},
]
const measurements={base:{valueMm:400},width:{formula:'base + 20'},height:{formula:'300 + 10'}}
const make=(s=snapshot(),override={})=>create(s,{measurements,bindings,...override})

test('browser-compatible synchronous fingerprint equals standard SHA-256 exact fixture',()=>{
  const fixture=snapshot()
  const canonical='{"panels":[{"id":"front","polygon":{"curves":{"bottom":[[0.12,-0.01],[0.28,-0.01]],"right":[[0.41,0.1],[0.41,0.2]]},"edges":["bottom","right","top","left"],"free_curve_points":{},"points":[[0,0],[0.4,0],[0.4,0.3],[0,0.3]]}}],"revision":18}'
  assert.equal(fingerprint(fixture),`sha256:${createHash('sha256').update(canonical,'utf8').digest('hex')}`)
  assert.equal(fingerprint(fixture),fingerprint(structuredClone(fixture)))
})

test('two ordered bindings, formulas, shifted Rust cubic handles and immutable nonpartial commands',()=>{
  const source=snapshot(),before=structuredClone(source)
  const made=make(source)
  assert.equal(made.ok,true,made.reason)
  const result=plan(source,made.sidecar)
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(result.dependencyOrder,['width','height'])
  assert.equal(result.steps.length,2)
  assert.equal(result.steps[0].distanceMm,420)
  assert.equal(result.steps[1].distanceMm,310)
  assert.equal(result.commands[0].kind,'Anchor')
  assert(Math.abs(result.commands[0].position[0]-.42)<1e-10)
  assert(Math.abs(result.commands[1].position[0]-.42)<1e-10)
  assert(Math.abs(result.commands[1].position[1]-.31)<1e-10)
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.requiresNativeRevalidationAfterEachCommand,true)
  assert.match(result.caveat,/normaliz/i)
  assert(Object.isFrozen(result.steps[0].command.position))
  assert.deepEqual(source,before)
})

test('revision, authored point and cubic-handle changes invalidate stale sidecar',()=>{
  const s=snapshot(),sidecar=make(s).sidecar
  const revision=structuredClone(s);revision.revision++
  assert.match(plan(revision,sidecar).reason,/revision/i)
  const changed=structuredClone(s);changed.template.panels[0].polygon.points[0][0]+=.001
  assert.match(plan(changed,sidecar).reason,/fingerprint/i)
  const cubic=structuredClone(s);cubic.template.panels[0].polygon.curves.bottom[0][1]-=.01
  assert.match(plan(cubic,sidecar).reason,/fingerprint/i)
})

test('formula cycles, binding cycles, duplicate targets and late failures refuse every command',()=>{
  assert.equal(make(snapshot(),{measurements:{width:{formula:'height'},height:{formula:'width'}}}).ok,false)
  assert.match(make(snapshot(),{bindings:[{...bindings[0],dependsOn:['height']},bindings[1]]}).reason,/circular/i)
  assert.match(make(snapshot(),{bindings:[bindings[0],{...bindings[1],pointIndex:1}]}).reason,/duplicate/i)
  const source=snapshot(),bad=make(source,{bindings:[bindings[0],{...bindings[1],a:888}]}).sidecar
  const planned=plan(source,bad)
  assert.equal(planned.ok,false)
  assert.equal(planned.commands,undefined)
  assert.equal(planned.steps,undefined)
  assert.match(make(snapshot(),{bindings:[{...bindings[0],distanceFormula:'missing'}]}).reason,/missing/i)
})

test('strict serialized round trip and rejection of lossy values and unknown fields',()=>{
  const sidecar=make().sidecar
  const bytes=serialize(sidecar)
  const restored=deserialize(bytes)
  assert.deepEqual(restored,sidecar)
  assert(Object.isFrozen(restored.bindings[0]))
  assert.equal(plan(snapshot(),restored).ok,true)
  assert.throws(()=>serialize({...sidecar,manufacturingApproved:true}),/unknown/i)
  assert.throws(()=>serialize({...sidecar,measurements:{bad:NaN}}),/nonfinite|unsupported/i)
  assert.throws(()=>deserialize('{not JSON'))
  assert.throws(()=>deserialize(JSON.stringify({...sidecar,bindings:[{...bindings[0],extra:'oops'}]})),/unknown/i)
  assert.throws(()=>deserialize(JSON.stringify({...sidecar,measurements:{width:{formula:'200',metadata:'ignored'}}})),/unknown/i)
})
