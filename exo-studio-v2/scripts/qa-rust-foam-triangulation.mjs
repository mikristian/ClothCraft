import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {initializeRustFoamTriangulationKernel, rustFoamTriangulate, rustFoamTriangulationStatus} from '../src/core/rustFoamTriangulationKernel.js'
import {createFoamPaddingGeometry} from '../src/core/foamPaddingGeometry.js'
import {exportFoamPaddingSvg} from '../src/core/foamPaddingPatternExport.js'

const EPS = 1e-8
const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
function baseline(p) {
  const remain = p.map((_,i)=>i), indices=[]
  let guard=0
  while (remain.length>3 && guard++<p.length*p.length) {
    let found=false
    for(let j=0;j<remain.length;j++) {
      const a=remain[(j+remain.length-1)%remain.length],b=remain[j],c=remain[(j+1)%remain.length]
      if(cross(p[a],p[b],p[c])<=EPS)continue
      const inside=q=>cross(p[a],p[b],q)>=-EPS&&cross(p[b],p[c],q)>=-EPS&&cross(p[c],p[a],q)>=-EPS
      if(remain.some(k=>k!==a&&k!==b&&k!==c&&inside(p[k])))continue
      indices.push(a,b,c);remain.splice(j,1);found=true;break
    }
    if(!found)throw Error('TRIANGULATION_FAILED')
  }
  if(remain.length!==3)throw Error('TRIANGULATION_FAILED')
  return [...indices,...remain]
}
const square=[[0,0],[8,0],[8,8],[0,8]]
const pad={name:'Pad',points:square.map(([x,y])=>({x,y})),widthCm:12,heightCm:12,depthCm:1.2,edgeWidthCm:.2}
const beforeShape=createFoamPaddingGeometry({points:square,depthCm:1.2,edgeWidthCm:.2})
const beforeSvg=exportFoamPaddingSvg(pad)
assert.equal(await initializeRustFoamTriangulationKernel({bytes:readFileSync('public/wasm/exo_foam_triangulation_kernel.wasm')}),true)
assert.equal(rustFoamTriangulationStatus().backend,'rust-wasm')
let tested=0
function verify(points){
  let expected, actual
  try{expected=baseline(points)}catch(e){expected=e.message}
  try{actual=rustFoamTriangulate(points)}catch(e){actual=e.message}
  assert.deepEqual(actual,expected,JSON.stringify(points))
  tested++
}
verify(square)
verify([[0,0],[7,0],[7,2],[3,2],[3,7],[0,7]])
verify([...square].reverse())
let seed=0x4b1d
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
for(let count=3;count<=26;count++)for(let rep=0;rep<100;rep++){
  const angles=Array.from({length:count},()=>random()*2*Math.PI).sort((a,b)=>a-b)
  const points=angles.map(t=>{const r=3+random()*4;return [Math.cos(t)*r,Math.sin(t)*r]})
  verify(points)
}
assert.deepEqual(createFoamPaddingGeometry({points:square,depthCm:1.2,edgeWidthCm:.2}),beforeShape)
assert.equal(exportFoamPaddingSvg(pad),beforeSvg)
console.log(JSON.stringify({pass:true, backend:rustFoamTriangulationStatus().backend, differentialCases:tested, geometryExact:true, svgByteExact:true}))
