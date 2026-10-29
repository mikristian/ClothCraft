import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {inspectClothMesh} from '../src/core/physics/meshQuality.js'
import {initializeRustMeshQualityKernel,rustTriangleQuality,rustMeshQualityKernelStatus} from '../src/core/rustMeshQualityKernel.js'
// Capture the unchanged JS fallback before loading WASM.
let seed=22022
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
const cases=[]
for(const vertices of [
  [[0,0],[0,0],[0,0]], [[0,0],[1,0],[2,0]],
  [[0,0],[1,0],[0,1e-14]], [[0,0],[1e200,0],[0,1e200]],
  [[-1e308,0],[1e308,0],[0,1]], [[0,0],[1e-200,0],[0,1e-200]],
  [[NaN,0],[1,0],[0,1]], [[0,0],[Infinity,0],[0,1]],
  [{x:0,y:0},{x:3,y:0},{x:0,y:4}],
]) cases.push({vertices,faces:[[0,1,2],[0,1,2],[0,2,1]],options:{worstCount:2}})
for(let i=0;i<2000;i++) {
  const scale=10**(random()*600-300)
  const vertices=Array.from({length:6},()=>[(random()-.5)*scale,(random()-.5)*scale])
  const [a,b,c]=vertices
  const twice=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))
  const longest=Math.max(Math.hypot(b[0]-a[0],b[1]-a[1]),Math.hypot(c[0]-b[0],c[1]-b[1]),Math.hypot(a[0]-c[0],a[1]-c[1]))
  const altitude=longest?twice/longest:0
  cases.push({vertices,faces:[[0,1,2],[3,4,5],[0,1,2]],options:{aspectLimit:altitude?longest/altitude:Infinity,minimumAltitudeCm:altitude,worstCount:2}})
}
for(const faces of [[[0,1]],[[0,1,9]],[[0,-1,2]],[[0,.5,2]],[null]])cases.push({vertices:[[0,0],[1,0],[0,1]],faces})
function report(c) {
  try {return inspectClothMesh(c.vertices,c.faces,c.options)}
  catch(error) {assert.ok(error instanceof RangeError);return {error:error.message}}
}
const expected=cases.map(report)
assert.equal(rustMeshQualityKernelStatus().backend,'javascript-fallback')
assert.equal(await initializeRustMeshQualityKernel({bytes:new Uint8Array([0])}),false)
assert.equal(await initializeRustMeshQualityKernel({bytes:readFileSync('public/wasm/exo_mesh_quality_kernel.wasm')}),true)
assert.equal(rustMeshQualityKernelStatus().backend,'rust-wasm')
cases.forEach((c,i)=>assert.deepEqual(report(c),expected[i],`report ${i}`))
// Independent arithmetic reference also checks unrounded numeric outputs.
for(const c of cases) {
  const v=c.vertices
  if(!v.every(Array.isArray)||v.length<3)continue
  const [[ax,ay],[bx,by],[cx,cy]]=v
  const twice=Math.abs((bx-ax)*(cy-ay)-(by-ay)*(cx-ax))
  const longest=Math.max(Math.hypot(bx-ax,by-ay),Math.hypot(cx-bx,cy-by),Math.hypot(ax-cx,ay-cy))
  const altitude=longest?twice/longest:0
  assert.deepEqual(rustTriangleQuality(ax,ay,bx,by,cx,cy),[twice,longest,altitude,altitude?longest/altitude:Infinity])
}
assert.deepEqual(report({vertices:[[NaN,0]],faces:[[0,0,0]]}),{error:'Non-finite rest coordinates in face 0'})
assert.deepEqual(report({vertices:[],faces:[[0,0,0]]}),{error:'Invalid cloth face 0'})
console.log(`mesh quality parity passed: ${cases.length} seeded JS/WASM reports and raw metrics`)
