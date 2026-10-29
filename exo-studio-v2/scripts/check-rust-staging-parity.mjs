import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import * as THREE from 'three'
import {stagedPanelPositions,setStagedGeometry} from '../src/core/staging.js'
import {initializeRustStagingKernel,rustStagingStatus} from '../src/core/rustStagingKernel.js'
const cases=[]
let seed=371
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
for(let i=0;i<250;i++){
 const width=i%10===0?0:(i%8===0?0.002:.15+random()*140)
 const flatVertices=Array.from({length:16},(_,j)=>new THREE.Vector2((j%4)*width/3,Math.floor(j/4)*10))
 const wrap=i%2===0?'front':'back'
 const arrangement3d={wrap,x:(random()-.5)*.6,y:1,z:(random()-.5)*.5,flip:i%3===0,
   stagingOffsetX:(random()-.5),stagingOffsetY:(random()-.5),stagingOffsetZ:(random()-.5),
   stagingRotationX:i%4?0:14,stagingRotationY:i%5?0:25,stagingRotationZ:i%6?0:-12}
 cases.push([{flatVertices,piece:{arrangement3d}},{heightCm:150+random()*85}])
}
const frozen=cases.map(args=>stagedPanelPositions(...args).map(v=>v.toArray()))
const blends=[]
for(let i=0;i<200;i++){
 const staged=[new THREE.Vector3(random(),random(),random())]
 const fitted=[new THREE.Vector3(random(),random(),random())]
 const t=i%9===0?0:i%9===1?1:i%9===2?-5:i%9===3?5:random()
 const geometry=new THREE.BufferGeometry()
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3))
 assert.equal(setStagedGeometry(geometry,staged,fitted,t),true)
 blends.push({staged,fitted,t,expected:Array.from(geometry.attributes.position.array)})
}
assert.equal(rustStagingStatus().backend,'javascript-fallback')
assert.equal(await initializeRustStagingKernel({bytes:Uint8Array.of(0)}),false)
assert.equal(await initializeRustStagingKernel({bytes:readFileSync('public/wasm/exo_staging_kernel.wasm')}),true)
for(let i=0;i<cases.length;i++){
 const actual=stagedPanelPositions(...cases[i]).map(v=>v.toArray())
 assert.deepEqual(actual,frozen[i],`exact staged panel parity ${i}`)
}
for(let i=0;i<blends.length;i++){
 const {staged,fitted,t,expected}=blends[i]
 const geometry=new THREE.BufferGeometry()
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0],3))
 assert.equal(setStagedGeometry(geometry,staged,fitted,t),true)
 assert.deepEqual(Array.from(geometry.attributes.position.array),expected,`exact geometry blend parity ${i}`)
}
console.log(JSON.stringify({pass:true,stagingCases:cases.length,blendCases:blends.length,backend:rustStagingStatus().backend}))
