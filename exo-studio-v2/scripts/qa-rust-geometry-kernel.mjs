import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  initializeRustGeometryKernel,rustGeometryKernelReady,rustGeometryKernelStatus,
  rustGridCoordinate,rustNearestSegmentT,rustSegmentLength2D,rustSegmentLength3D,
  rustQuadraticArcLength,
} from '../src/core/rustGeometryKernel.js'
import {snapDraftGrid,nearestOnDraftSegment,snapDraftPattern} from '../src/core/draftingSnapping.js'
import {quadraticArcLength,quadraticAtLengthFraction} from '../src/core/draftingPrecision.js'
import {boundaryLength} from '../src/core/clothcraftSelectionMetrics.js'

const close=(actual,expected,tolerance=1e-8,context='')=>{
  assert.ok(Number.isFinite(actual)&&Number.isFinite(expected)&&
    Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),
    `${context}: received ${actual}; expected ${expected}`)
}
const quadraticJs=(a,c,b,start=0,end=1,tolerance=1e-7)=>{
  const lo=Math.min(Math.max(0,Math.min(1,start)),Math.max(0,Math.min(1,end)))
  const hi=Math.max(Math.max(0,Math.min(1,start)),Math.max(0,Math.min(1,end)))
  if(hi-lo<=1e-9)return 0
  const speed=t=>Math.hypot(2*((1-t)*(c.x-a.x)+t*(b.x-c.x)),
    2*((1-t)*(c.y-a.y)+t*(b.y-c.y)))
  const simpson=(x,y,fx,fm,fy)=>(y-x)*(fx+4*fm+fy)/6
  const recurse=(x,y,fx,fm,fy,integral,error,depth)=>{
    const center=(x+y)/2,leftMid=(x+center)/2,rightMid=(center+y)/2
    const flm=speed(leftMid),frm=speed(rightMid)
    const left=simpson(x,center,fx,flm,fm),right=simpson(center,y,fm,frm,fy)
    if(depth>=20||Math.abs(left+right-integral)<=error*15)
      return left+right+(left+right-integral)/15
    return recurse(x,center,fx,flm,fm,left,error/2,depth+1)+
      recurse(center,y,fm,frm,fy,right,error/2,depth+1)
  }
  const fx=speed(lo),fy=speed(hi),fm=speed((lo+hi)/2)
  return recurse(lo,hi,fx,fm,fy,simpson(lo,hi,fx,fm,fy),Math.max(1e-11,tolerance),0)
}
// Run old JS behavior first, before the native module loads.
assert.equal(rustGeometryKernelReady(),false)
assert.deepEqual(snapDraftGrid({x:2.6,y:-1.5},1),{x:3,y:-1})
assert.deepEqual(nearestOnDraftSegment({x:2.5,y:3},{x:0,y:0},{x:10,y:0}),
  {x:2.5,y:0,t:.25})
assert.equal(boundaryLength([0,1],[[0,0,0],[3,4,0]],3),500)
assert.equal(quadraticArcLength({x:0,y:0},{x:5,y:0},{x:10,y:0}),10)
const midA={x:0,y:0},midC={x:12,y:18},midB={x:20,y:0}
const referenceMid=quadraticAtLengthFraction(midA,midC,midB,.5)
const wasm=readFileSync('public/wasm/exo_geometry_kernel.wasm')
assert.equal(await initializeRustGeometryKernel({bytes:wasm}),true,rustGeometryKernelStatus().error)
assert.equal(rustGeometryKernelStatus().backend,'rust-wasm')
assert.equal(rustGeometryKernelStatus().abiVersion,1)
let parity=0
for(const x of [-999,-4.5,-1.5,-.5,-.001,0,.5,1.5,2.5,140]){
  for(const origin of [-5,0,1.3,23])for(const spacing of [.1,.5,1,2.5]){
    const actual=rustGridCoordinate(x,origin,spacing)
    const expected=origin+Math.round((x-origin)/spacing)*spacing
    close(actual,expected,1e-11,'snap grid');parity++
  }
}
for(const ax of [-10,0,5])for(const ay of [-10,0,5])
for(const bx of [-10,0,5])for(const by of [-10,0,5]){
  const a={x:ax,y:ay},b={x:bx,y:by},p={x:2.25,y:-6.5}
  const dx=bx-ax,dy=by-ay,denom=dx*dx+dy*dy
  const t=denom<1e-12?0:Math.max(0,Math.min(1,((p.x-ax)*dx+(p.y-ay)*dy)/denom))
  close(rustNearestSegmentT(p,a,b),t,1e-12,'nearest segment t')
  const projected=nearestOnDraftSegment(p,a,b)
  close(projected.x,a.x+t*dx,1e-12,'projected x')
  close(projected.y,a.y+t*dy,1e-12,'projected y')
  close(projected.t,t,1e-12,'projected t');parity+=4
}
for(const a of [[0,0,0],[.17,-1.3,2.1],[-100,50,2]])
for(const b of [[1,2,3],[0,0,0],[-11,33,11]]){
  close(rustSegmentLength2D(a,b),Math.hypot(a[0]-b[0],a[1]-b[1]))
  close(rustSegmentLength3D(a,b),
    Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]))
  close(boundaryLength([0,1],[a,b],3),
    Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2])*100)
  parity+=3
}
for(const curve of [
  [{x:0,y:0},{x:5,y:0},{x:10,y:0}],
  [{x:0,y:0},{x:20,y:40},{x:40,y:-3}],
  [{x:1.12,y:4.5},{x:30,y:15.9},{x:-12,y:70}],
  [{x:10,y:-1},{x:10,y:-1},{x:10,y:-1}],
]){
  for(const [start,end] of [[0,1],[.1,.7],[.3,.95],[.5,.5],[1,0]]){
    const expected=quadraticJs(...curve,start,end)
    close(rustQuadraticArcLength(...curve,start,end),expected,1e-8,'curve ABI')
    close(quadraticArcLength(...curve,start,end),expected,1e-8,'curve public API')
    parity+=2
  }
}
const atHalf=quadraticAtLengthFraction(midA,midC,midB,.5)
close(atHalf.point.x,referenceMid.point.x,1e-8,'arc-length midpoint x')
close(atHalf.point.y,referenceMid.point.y,1e-8,'arc-length midpoint y')
assert.deepEqual(snapDraftGrid({x:2.6,y:-1.5}),{x:3,y:-1})
assert.equal(snapDraftPattern({x:0,y:0},[]),null)
console.log(JSON.stringify({pass:true,backend:rustGeometryKernelStatus().backend,
  version:rustGeometryKernelStatus().abiVersion,wasmBytes:wasm.byteLength,
  parityCases:parity,operations:['grid snapping','nearest 2D edge','2D and 3D selection lengths',
    'adaptive quadratic Bézier arclength']}))
