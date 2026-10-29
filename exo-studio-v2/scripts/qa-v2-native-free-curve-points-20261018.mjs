// Verified CLO 7: clicking Edit Curve Point adds a free point without
// topological subdivision; dragging changes sewn cutline length; edits undo.
import assert from 'node:assert/strict'
import {addNativeFreeCurvePoint,moveNativeFreeCurvePoint,evaluateFreeCurve,closestFreeCurveParameter,symmetricCurveEdge,removeNativeFreeCurvePoint,arclengthToFreeCurvePoint} from '../src/core/nativeFreeCurvePoints.js'
const rectangle={
  points:[[0,0],[.5,0],[.5,.4],[0,.4]],
  edges:['top','right','hem','left'],
  notches:{top:[{t:.3,depth_m:.007}]},
  seam_allowances:{top:.01},
  free_curve_points:{},
}
const added=addNativeFreeCurvePoint(rectangle,'top',.5)
assert.equal(added.mark.id,'free_1')
assert.equal(added.mark.t,.5)
assert.deepEqual(added.mark.position,[.25,0])
assert.deepEqual(added.polygon.edges,rectangle.edges)
assert.deepEqual(added.polygon.notches,rectangle.notches)
assert.deepEqual(added.polygon.seam_allowances,rectangle.seam_allowances)
assert.deepEqual(evaluateFreeCurve(added.polygon,'top',.5),[.25,0])
assert.equal(addNativeFreeCurvePoint(added.polygon,'top',.51),null,'duplicate nearby free control rejected')
const bent=moveNativeFreeCurvePoint(added.polygon,'top',added.mark.id,[0,-.02])
assert.deepEqual(evaluateFreeCurve(bent,'top',.5),[.25,-.02])
assert.deepEqual(evaluateFreeCurve(bent,'top',0),[0,0])
assert.deepEqual(evaluateFreeCurve(bent,'top',1),[.5,0])
const length=shape=>Array.from({length:501},(_,i)=>evaluateFreeCurve(shape,'top',i/500))
  .slice(1).reduce((sum,p,i,array)=>{
    const prev=evaluateFreeCurve(shape,'top',i/500)
    return sum+Math.hypot(p[0]-prev[0],p[1]-prev[1])
  },0)
assert.ok(length(bent)>length(added.polygon))
assert.ok(Math.abs(length(added.polygon)-.5)<1e-9)
assert.ok(Math.abs(arclengthToFreeCurvePoint(added.polygon,'top',.5).at_m-.25)<1e-9)
const physicalStation=arclengthToFreeCurvePoint(bent,'top',.5)
assert.ok(physicalStation.at_m>.25 && physicalStation.total_m>.5)
assert.ok(Math.abs(physicalStation.at_m-physicalStation.total_m*.5)<1e-6)
assert.deepEqual(moveNativeFreeCurvePoint(bent,'top',added.mark.id,[0,.02]).free_curve_points,
  added.polygon.free_curve_points,'Undo drag restores exact authored data')
const second=addNativeFreeCurvePoint(bent,'top',.72)
assert.ok(second?.mark.id==='free_2')
assert.equal(second.polygon.free_curve_points.top.length,2)
assert.ok(closestFreeCurveParameter(bent,'top',[.25,-.02]).distance<1e-7)
assert.deepEqual(rectangle.free_curve_points,{})
const afterPromotion=addNativeFreeCurvePoint({...rectangle,
  vertex_ids:{top:'free_7'},free_curve_points:{}},'hem',.5)
assert.equal(afterPromotion.mark.id,'free_8',
  'Never reuse the stable identity of a consumed free knot')
const symmetric=symmetricCurveEdge(rectangle,'right')
assert.equal(symmetric.edge,'left')
const mirrored=addNativeFreeCurvePoint(rectangle,'right',.4,{mirror:true})
assert.equal(mirrored.polygon.free_curve_points.right.length,1)
assert.equal(mirrored.polygon.free_curve_points.left.length,1)
const left=mirrored.polygon.free_curve_points.left[0],right=mirrored.polygon.free_curve_points.right[0]
assert.equal(left.mirror_group,right.mirror_group)
assert.equal(left.t,.6)
assert.ok(Math.abs(left.position[0])<1e-12&&Math.abs(left.position[1]-.16)<1e-12)
const movedPair=moveNativeFreeCurvePoint(mirrored.polygon,'right',right.id,[.02,.01])
assert.ok(Math.abs(movedPair.free_curve_points.left[0].position[0]+.02)<1e-12)
assert.ok(Math.abs(movedPair.free_curve_points.right[0].position[0]-.52)<1e-12)
assert.ok(Math.abs(movedPair.free_curve_points.left[0].position[1]-.17)<1e-12)
const removedPair=removeNativeFreeCurvePoint(movedPair,'right',right.id)
assert.equal(Object.keys(removedPair.free_curve_points).length,0)
assert.equal(addNativeFreeCurvePoint({...rectangle,points:[[0,0],[.5,0],[.4,.4],[0,.4]]},'right',.4,{mirror:true}),null)
console.log(JSON.stringify({pass:true,retainedBoundary:'top',freeControls:2,
  flatLengthCm:50,editedLengthCm:Number((length(bent)*100).toFixed(3)),
  unchangedNotch:true,mirroredPair:true,atomicPairRemoval:true}))
