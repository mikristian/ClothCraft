import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {materialGuideSpans} from './patternGuideTracks.js'
import {
  initializeRustMaterialGuideKernel,rustMaterialGuideKernelReady,
  rustMaterialGuideKernelStatus,
} from './rustMaterialGuideKernel.js'

function reference(triangles,points,station,vertical=false){
  if(!Number.isFinite(station)||!Array.isArray(triangles)||!Array.isArray(points))return []
  const occupied=[]
  const along=p=>vertical?p[0]:p[1]
  const across=p=>vertical?p[1]:p[0]
  for(const triangle of triangles){
    if(!Array.isArray(triangle)||triangle.length!==3)continue
    const vertices=triangle.map(index=>points[index])
    if(vertices.some(p=>!Array.isArray(p)||p.length<2||!Number.isFinite(p[0])||!Number.isFinite(p[1])))continue
    const [a,b,c]=vertices
    if(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<1e-12)continue
    const intersections=[]
    for(let i=0;i<3;i++){
      const p=vertices[i],q=vertices[(i+1)%3]
      const dp=along(p)-station,dq=along(q)-station
      if(Math.abs(dp)<1e-10&&Math.abs(dq)<1e-10){
        intersections.push(across(p),across(q))
      }else if(dp*dq<=0&&Math.abs(along(q)-along(p))>1e-12){
        const t=(station-along(p))/(along(q)-along(p))
        if(t>=-1e-10&&t<=1+1e-10)intersections.push(across(p)+(across(q)-across(p))*t)
      }
    }
    if(intersections.length<2)continue
    const lo=Math.min(...intersections),hi=Math.max(...intersections)
    if(hi-lo>1e-7)occupied.push([lo,hi])
  }
  occupied.sort((a,b)=>a[0]-b[0])
  const merged=[]
  for(const [a,b] of occupied){
    const last=merged.at(-1)
    if(last&&a<=last[1]+1e-7)last[1]=Math.max(last[1],b)
    else merged.push([a,b])
  }
  return merged
}

test('native WASM exactly preserves occupied triangle guide spans and epsilon union',async()=>{
  assert.equal(rustMaterialGuideKernelReady(),false)
  const points=[[0,0],[.4,0],[.4,.3],[0,.3],[0,.5],[.4,.5],[.4,.9],[0,.9]]
  const triangles=[[0,1,2],[0,2,3],[4,5,6],[4,6,7]]
  assert.deepEqual(materialGuideSpans(triangles,points,.2,true),[[0,.3],[.5,.9]])
  const bytes=await readFile('public/wasm/exo_material_guide_kernel.wasm')
  assert.equal(await initializeRustMaterialGuideKernel({bytes}),true,rustMaterialGuideKernelStatus().error)
  assert.equal(rustMaterialGuideKernelStatus().backend,'rust-wasm')
  let seed=0x74826125
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const stations=[-2,0,1e-12,1e-10,1e-7,.2,.3,.4,.5,.7,.9,1,2,NaN,Infinity]
  const cases=[{points,triangles}]
  cases.push({points:[],triangles:[]})
  cases.push({points,triangles:[[0,1],[0,1,2,3],null,[0,'missing',2],[0,-1,2],[0,99,2],[0,1,2]]})
  for(const offset of [0,1e-9,5e-8,1e-7,2e-7]){
    cases.push({points:[[0,0],[1,0],[0,1],[1+offset,0],[2+offset,0],[1+offset,1]],triangles:[[0,1,2],[3,4,5]]})
  }
  cases.push({points:[[0,0],[1,1],[2,2],[0,0],[1,NaN],[1,0],null],triangles:[[0,1,2],[3,4,5],[0,1,6],[0,5,5],[0,1,5]]})
  for(let c=0;c<180;c++){
    const pts=Array.from({length:14},()=>[(random()-.5)*4,(random()-.5)*4])
    const tris=Array.from({length:18},()=>Array.from({length:3},()=>Math.floor(random()*pts.length)))
    cases.push({points:pts,triangles:tris})
  }
  let comparisons=0
  for(const {points:pts,triangles:tris} of cases){
    for(const vertical of [false,true]){
      for(const station of stations){
        const actual=materialGuideSpans(tris,pts,station,vertical)
        const expected=reference(tris,pts,station,vertical)
        assert.deepEqual(actual,expected,`case ${comparisons} vertical=${vertical} station=${station}`)
        comparisons++
      }
    }
  }
  assert(comparisons>5000)
})

test('large occupied guide batches retain synchronous fallback results',async()=>{
  const pts=[[0,0],[1,0],[0,1]]
  const triangles=Array.from({length:250001},()=>[0,1,2])
  assert.deepEqual(materialGuideSpans(triangles,pts,.25),[[0,.75]])
})
