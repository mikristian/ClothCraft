import test from 'node:test'
import assert from 'node:assert/strict'
import {addNativeFreeCurvePoint,editNativeFreeCurveTangent,moveNativeFreeCurvePoint,evaluateFreeCurve,closestFreeCurveParameter,cubicDerivativeAt,freeCurveBase} from './nativeFreeCurvePoints.js'
const square=()=>({points:[[0,0],[.2,0],[.2,.16],[0,.16]],edges:['top','right','bottom','left'],curves:{},free_curve_points:{},seam_allowances:{top:.01},notches:{top:[{t:.25,depth_m:.003}]}})
test('click creates persistent knot without changing contour or sewing identities',()=>{
 const p=square(),created=addNativeFreeCurvePoint(p,'top',.5)
 assert(created)
 assert.equal(created.polygon.edges[0],'top')
 assert.deepEqual(created.polygon.notches,p.notches)
 assert.deepEqual(created.polygon.seam_allowances,p.seam_allowances)
 assert.equal(created.polygon.free_curve_points.top[0].id,'free_1')
 assert(Math.abs(evaluateFreeCurve(created.polygon,'top',.5)[0]-.1)<1e-12)
 assert.equal(p.free_curve_points.top,undefined)
})
test('purple tangent adjusts exact cubic derivative and preserves knot position',()=>{
 const p=addNativeFreeCurvePoint(square(),'top',.5).polygon
 const before=evaluateFreeCurve(p,'top',.3)
 const edited=editNativeFreeCurveTangent(p,'top','free_1',[0,-.12])
 assert(edited)
 assert(Math.abs(edited.free_curve_points.top[0].position[0]-.1)<1e-12)
 assert(Math.abs(edited.free_curve_points.top[0].derivative[0]-.2)<1e-12);assert.equal(edited.free_curve_points.top[0].derivative[1],-.12)
 assert.notDeepEqual(evaluateFreeCurve(edited,'top',.3),before)
 assert(Math.abs(p.free_curve_points.top[0].position[0]-.1)<1e-12);assert.equal(p.free_curve_points.top[0].position[1],0)
 assert.equal(p.free_curve_points.top[0].derivative,undefined)
})
test('shift tangent snapping constrains angle and impossible values fail closed',()=>{
 const p=addNativeFreeCurvePoint(square(),'top',.5).polygon
 const q=editNativeFreeCurveTangent(p,'top','free_1',[0,-.16],{snapAngle:true})
 const [x,y]=q.free_curve_points.top[0].derivative
 assert.ok(Math.abs(Math.atan2(y,x)+Math.PI/4)<1e-10)
 assert.equal(editNativeFreeCurveTangent(p,'top','free_1',[Infinity,0]),null)
 assert.equal(editNativeFreeCurveTangent(p,'top','missing',[0,1]),null)
 assert(Math.abs(cubicDerivativeAt(freeCurveBase(p,'top'),.5)[0]-.2)<1e-12)
})
test('mirrored free-point tangent preserves reflected opposite boundary direction',()=>{
 const p=square();const a=addNativeFreeCurvePoint(p,'right',.5,{mirror:true})
 assert(a)
 const m=a.polygon.free_curve_points.right[0],partner=a.polygon.free_curve_points.left[0]
 assert.equal(m.mirror_group,partner.mirror_group)
 const q=editNativeFreeCurveTangent(a.polygon,'right',m.id,[.04,.06]);assert(q)
 const r=q.free_curve_points.right[0].derivative,l=q.free_curve_points.left[0].derivative
 assert.deepEqual(l,[r[0],-r[1]])
 assert.deepEqual(q.free_curve_points.left[0].position,partner.position)
 const moved=moveNativeFreeCurvePoint(q,'right',m.id,[.005,.006]);assert(moved)
 assert.deepEqual(moved.free_curve_points.left[0].position,[partner.position[0]-.005,partner.position[1]+.006])
})

test('Option breaks one knot into independent incoming and outgoing physical handles',()=>{
 const p=addNativeFreeCurvePoint(square(),'top',.5).polygon
 const bent=editNativeFreeCurveTangent(p,'top','free_1',[0,-.08],{side:'in',breakTangents:true})
 assert(bent)
 const knot=bent.free_curve_points.top[0]
 assert(knot.derivative_in&&knot.derivative_out)
 assert(Math.abs(knot.derivative_in[1]+.08)<1e-12)
 assert(Math.abs(knot.derivative_out[1])<1e-12)
 assert.equal(knot.derivative,undefined)
 assert.notDeepEqual(evaluateFreeCurve(bent,'top',.3),evaluateFreeCurve(p,'top',.3))
 assert.deepEqual(evaluateFreeCurve(bent,'top',.7),evaluateFreeCurve(p,'top',.7),
   'Breaking incoming handle must leave outgoing half unchanged')
 const other=editNativeFreeCurveTangent(bent,'top','free_1',[0,.06],{side:'out'})
 assert(other)
 assert.deepEqual(other.free_curve_points.top[0].derivative_in,knot.derivative_in)
 assert(Math.abs(other.free_curve_points.top[0].derivative_out[1]-.06)<1e-12)
})

test('Independent mirrored handles switch incoming/outgoing under reversed parameterization',()=>{
 const p=square(),created=addNativeFreeCurvePoint(p,'right',.5,{mirror:true})
 assert(created)
 const id=created.polygon.free_curve_points.right[0].id
 const next=editNativeFreeCurveTangent(created.polygon,'right',id,[.02,-.03],{side:'in',breakTangents:true})
 assert(next)
 const left=next.free_curve_points.left[0],right=next.free_curve_points.right[0]
 assert.deepEqual(left.derivative_out,[right.derivative_in[0],-right.derivative_in[1]])
 assert.notDeepEqual(right.derivative_in,right.derivative_out)
 assert.notDeepEqual(left.derivative_in,left.derivative_out)
})

test('malformed free-curve knots fail closed instead of leaking invalid snap coordinates',()=>{
 const valid=addNativeFreeCurvePoint(square(),'top',.5).polygon
 const station=evaluateFreeCurve(valid,'top',.5)
 assert(station&&Math.abs(station[0]-.1)<1e-12&&Math.abs(station[1])<1e-12)
 const snap=closestFreeCurveParameter(valid,'top',[.1,.001])
 assert(snap&&Number.isFinite(snap.distance)&&Math.abs(snap.t-.5)<.01)
 const corruptions=[
   [{t:.5,position:[NaN,0]}],
   [{t:.5,position:[.1,0],derivative:[Infinity,0]}],
   [{t:.5,position:[.1,0],derivative_in:[0,NaN]}],
   [{t:.5,position:[.1,0],derivative_out:[0,Infinity]}],
   [{t:.7,position:[.14,0]},{t:.3,position:[.06,0]}],
   [{t:.5,position:[.1,0]},{t:.5,position:[.1,0]}],
   [{t:1,position:[.2,0]}],
   [null],
 ]
 for(const knots of corruptions){
   const p=square();p.free_curve_points.top=knots
   assert.equal(evaluateFreeCurve(p,'top',.5),null)
   assert.equal(closestFreeCurveParameter(p,'top',[.1,0]),null)
 }
 const malformed=square();malformed.curves.top=[[.1,0],[NaN,0]]
 assert.equal(freeCurveBase(malformed,'top'),null)
 assert.equal(evaluateFreeCurve(malformed,'top',.5),null)
 assert.equal(closestFreeCurveParameter(malformed,'top',[.1,0]),null)
 assert.equal(valid.free_curve_points.top[0].id,'free_1')
 assert(Math.abs(valid.free_curve_points.top[0].position[0]-.1)<1e-12)
})
