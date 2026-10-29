import test from 'node:test'
import assert from 'node:assert/strict'
import {createNativePatternConstraintSidecar20261023 as create} from './nativePatternConstraintBindings20261023.js'
import {prepareModarisNativeMeasurementCommit20261027 as prepare,
  witnessModarisNativeMeasurementCommit20261027 as witness} from './modarisNativeMeasurementCommit20261027.js'

export function fixture(){
  const snapshot={revision:4,template:{id:'qualified-rectangle',seams:[],panels:[{
    id:'front',name:'Front',fabric:'cotton',pins:[],pin_points:[],layout_2d:[0,0],
    pattern:{width:.4,height:.4,nx:1,ny:1},
    placement:{translation:[0,0,0],rotation_degrees:[0,0,0]},polygon:{
      points:[[0,0],[.4,0],[.4,.4],[0,.4]],edges:['a','b','c','d'],subdivisions:0,
      curves:{},free_curve_points:{},vertex_ids:{},vertex_mirror_groups:{},holes:[],
      lines:[],target_lengths:{},notches:[],seam_allowances:{},annotations:[],measurements:{},
    },
  }]}}
  const native={version:1,active:true,automaticRegeneration:false,manufacturingApproved:false,
    measurements:{hemWidth:{valueMm:400}},bindings:[{
      id:'hem',panelId:'front',pointIndex:3,mode:'polar',a:2,b:1,
      angleDeg:180,distanceFormula:'hemWidth',
    }]}
  snapshot.nativePointBindings=native
  const sidecar=create(snapshot,{measurements:native.measurements,bindings:native.bindings}).sidecar
  assert(sidecar)
  return {snapshot,sidecar}
}

function committed(snapshot){
  const after=structuredClone(snapshot)
  after.revision++
  after.template.panels[0].polygon.points=[[.02,0],[.42,0],[.42,.4],[0,.4]]
  after.template.panels[0].pattern.width=.42
  after.template.panels[0].layout_2d=[-.02,0]
  after.template.panels[0].placement.translation=[-.02,0,0]
  after.nativePointBindings.measurements.hemWidth.valueMm=420
  after.nativeMeasurementRecompute={nativeAuthoritative:true,oneUndoStep:true,
    measurement:'hemWidth',correctedBindingIds:['hem']}
  return after
}

test('preflight accepts a satisfied native direct rule and emits no caller-supplied dependent coordinates',()=>{
  const {snapshot,sidecar}=fixture(),unchanged=structuredClone(snapshot)
  const result=prepare(snapshot,sidecar,'hemWidth',420)
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(result.request,{op:'bindings-measurement-recompute',revision:4,
    measurement:'hemWidth',expectedValueMm:400,valueMm:420})
  assert.deepEqual(result.changedBindingIds,['hem'])
  assert.equal(result.expectedPointCount,1)
  assert.deepEqual(snapshot,unchanged)
})

test('preflight and postcommit witness accept a direct edit feeding a persisted computed formula',()=>{
  const {snapshot}=fixture()
  snapshot.nativePointBindings.measurements={
    halfWidth:{valueMm:200},
    allowance:{valueMm:0},
    intermediate:{formula:'halfWidth + allowance'},
    hemWidth:{formula:'intermediate * 2'},
  }
  const sidecar=create(snapshot,{measurements:snapshot.nativePointBindings.measurements,
    bindings:snapshot.nativePointBindings.bindings}).sidecar
  assert(sidecar)
  const prepared=prepare(snapshot,sidecar,'halfWidth',210)
  assert.equal(prepared.ok,true,prepared.reason)
  assert.deepEqual(prepared.request,{op:'bindings-measurement-recompute',revision:4,
    measurement:'halfWidth',expectedValueMm:200,valueMm:210})
  assert.deepEqual(prepared.changedBindingIds,['hem'])
  const after=committed(snapshot)
  after.nativePointBindings.measurements=structuredClone(snapshot.nativePointBindings.measurements)
  after.nativePointBindings.measurements.halfWidth.valueMm=210
  after.nativeMeasurementRecompute.measurement='halfWidth'
  const checked=witness(snapshot,after,sidecar,prepared)
  assert.equal(checked.ok,true,checked.reason)
  const wrong=structuredClone(snapshot)
  wrong.nativePointBindings.measurements.hemWidth={formula:'halfWidth / 0'}
  const wrongSidecar=create(wrong,{measurements:wrong.nativePointBindings.measurements,
    bindings:wrong.nativePointBindings.bindings})
  assert.equal(wrongSidecar.ok,false)
  const unused=structuredClone(snapshot)
  unused.nativePointBindings.measurements.extra={valueMm:2}
  const unusedSidecar=create(unused,{measurements:unused.nativePointBindings.measurements,
    bindings:unused.nativePointBindings.bindings}).sidecar
  assert.match(prepare(unused,unusedSidecar,'extra',3).reason,/does not affect/)
})

test('preflight rejects source drift, rule tamper, formula, unchanged and geometry mismatch',()=>{
  const {snapshot,sidecar}=fixture()
  assert.match(prepare(snapshot,sidecar,'hemWidth',400).reason,/changed/)
  assert.match(prepare(snapshot,sidecar,'hemWidth',6000).reason,/5000/)
  assert.match(prepare(snapshot,sidecar,'unknown',420).reason,/named/)
  assert.match(prepare({...snapshot,revision:5},sidecar,'hemWidth',420).reason,/stale/)
  const tampered=structuredClone(snapshot);tampered.nativePointBindings.bindings[0].angleDeg=0
  assert.match(prepare(tampered,sidecar,'hemWidth',420).reason,/differ/)
  const moved=structuredClone(snapshot);moved.template.panels[0].polygon.points[3][0]=.01
  assert.match(prepare(moved,sidecar,'hemWidth',420).reason,/stale/)
  const formula=structuredClone(snapshot);formula.nativePointBindings.measurements.hemWidth={formula:'200+200'}
  assert.match(prepare(formula,sidecar,'hemWidth',420).reason,/differ/)
})

test('postcommit witness verifies native saved value, dependent geometry and one Undo',()=>{
  const {snapshot,sidecar}=fixture(),proposal=prepare(snapshot,sidecar,'hemWidth',420)
  const after=committed(snapshot)
  const checked=witness(snapshot,after,sidecar,proposal)
  assert.equal(checked.ok,true,checked.reason)
  assert.equal(checked.nativeEvidenceVerified,true)
  assert.deepEqual(checked.correctedBindingIds,['hem'])
  const wrong=structuredClone(after);wrong.template.panels[0].polygon.points[3][0]=.01
  assert.match(witness(snapshot,wrong,sidecar,proposal).reason,/dimensions|satisfy/)
  const forged=structuredClone(after);forged.nativePointBindings.measurements.hemWidth.valueMm=430
  assert.match(witness(snapshot,forged,sidecar,proposal).reason,/measurement values/)
  const extra=structuredClone(after);extra.template.panels.push(structuredClone(extra.template.panels[0]))
  assert.match(witness(snapshot,extra,sidecar,proposal).reason,/unrelated panels/)
  const moved=structuredClone(after);moved.template.panels[0].polygon.points[1][1]=.001
  assert.match(witness(snapshot,moved,sidecar,proposal).reason,/unbound source anchor/)
  const forgedLayout=structuredClone(after);forgedLayout.template.panels[0].layout_2d=[0,0]
  assert.match(witness(snapshot,forgedLayout,sidecar,proposal).reason,/layout origin shift/)
  const forgedPlacement=structuredClone(after);forgedPlacement.template.panels[0].placement.translation=[0,0,0]
  assert.match(witness(snapshot,forgedPlacement,sidecar,proposal).reason,/3D placement origin shift/)
})
