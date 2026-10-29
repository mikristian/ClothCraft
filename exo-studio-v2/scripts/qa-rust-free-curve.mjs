import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  initializeRustGeometryKernel,rustGeometryKernelStatus,
  rustCubicAt,rustCubicDerivativeAt,rustCubicPolylineLength,
} from '../src/core/rustGeometryKernel.js'
import {
  cubicAt,cubicDerivativeAt,arclengthToFreeCurvePoint,
  evaluateFreeCurve,
} from '../src/core/nativeFreeCurvePoints.js'

const path='public/wasm/exo_geometry_kernel.wasm'
const base=[[0.01,0.02],[0.06,0.21],[0.18,-0.05],[0.29,0.11]]
const polygon={
  points:[base[0],base[3],[0.32,0.45]],
  edges:['neck','side','hem'],
  curves:{neck:[base[1],base[2]]},
  free_curve_points:{neck:[
    {id:'knot_1',t:0.28,position:[0.074,0.14],derivative_in:[0.08,0.22],derivative_out:[0.18,-0.07]},
    {id:'knot_2',t:0.74,position:[0.22,0.04],derivative_in:[0.42,-0.06],derivative_out:[0.16,0.19]},
  ]},
}
const params=[0,0.03,0.15,0.28,0.31,0.5,0.7,0.74,0.88,0.97,1]
const before=params.map(t=>({
  point:cubicAt(base,t),
  tangent:cubicDerivativeAt(base,t),
  free:evaluateFreeCurve(polygon,'neck',t),
}))
const stations=[0.01,0.1,0.27,0.28,0.33,0.6,0.74,0.75,0.9,0.99]
const material=stations.map(t=>arclengthToFreeCurvePoint(polygon,'neck',t))
assert(material.every(Boolean),'reference stations require finite physical lengths')

assert.equal(await initializeRustGeometryKernel({bytes:readFileSync(path)}),true,
  rustGeometryKernelStatus().error)
assert.equal(rustGeometryKernelStatus().backend,'rust-wasm')
const near=(a,b,abs=1e-12)=>assert.ok(Math.abs(a-b)<=abs,
  `Rust / JavaScript mismatch: ${a} versus ${b}`)
for(const [i,t] of params.entries()) {
  const row=before[i]
  for(const [value,expected] of [
    [rustCubicAt(base,t),row.point],
    [cubicAt(base,t),row.point],
    [rustCubicDerivativeAt(base,t),row.tangent],
    [cubicDerivativeAt(base,t),row.tangent],
    [evaluateFreeCurve(polygon,'neck',t),row.free],
  ]) for(let j=0;j<2;j++)near(value[j],expected[j])
}
for(const [i,t] of stations.entries()){
  const migrated=arclengthToFreeCurvePoint(polygon,'neck',t)
  near(migrated.at_m,material[i].at_m,2e-12)
  near(migrated.total_m,material[i].total_m,2e-12)
  assert(migrated.at_m>0 && migrated.at_m<migrated.total_m)
}
near(rustCubicPolylineLength([[0,0],[1/3,0],[2/3,0],[1,0]],0,0.5,128),0.5)
console.log(JSON.stringify({pass:true,backend:rustGeometryKernelStatus().backend,
  wasmBytes:readFileSync(path).length,
  parityCases:params.length*10+stations.length*2+1,
  operations:['cubic evaluation','independent tangent derivative','free-curve physical material arclength']}))
