import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeFabricOptics} from '../src/core/fabricSurfaceModel.js'
import {describeTextileSurface,meshYarnCoverage,textileRelief} from '../src/core/textileProcedurals.js'
import {initializeRustTextileOpticsKernel,rustTextileOpticsStatus} from '../src/core/rustTextileOpticsKernel.js'

let seed=0x21fab456
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
const topologies=['mesh-grid','tulle-net','power-mesh','athletic-mesh','unknown']
const cases=Array.from({length:4096},()=>({topology:topologies[Math.floor(rand()*topologies.length)],u:rand()*4-2,v:rand()*4-2}))
cases.push(...[0,1,-1,Number.EPSILON,Math.PI/2,-0.5,NaN,Infinity,-Infinity].map(x=>({topology:'mesh-grid',u:x,v:0})))
const materials=Array.from({length:256},(_,i)=>({id:`material-${i}`,name:i%2?'Denim':'Terry',
  opacity:(rand()-.25)*2,displacementMm:rand()*4,roughness:rand()*3-1,
  metalness:rand()*3-1,sheen:rand()*4-1,normalStrength:rand()*8-1,
  fiberAngleDeg:rand()*1000-500,roughnesss:rand(),weaveScaleCm:rand()*20,
  surfaceFamily:i%2?'twill':'terry-knit'}))
materials.push({opacity:NaN,displacementMm:Infinity,roughness:null,metalness:'0.45',sheen:'',fiberAngleDeg:'-180'})
const reference=cases.map(({topology,u,v})=>meshYarnCoverage(topology,u,v))
const optics=materials.map(m=>({settings:normalizeFabricOptics(m),surface:describeTextileSurface(m)}))
const textile=cases.slice(0,512).map(({u,v})=>textileRelief('mesh',u,v,'tulle-net'))
assert.equal(rustTextileOpticsStatus().backend,'javascript-fallback')
assert.equal(await initializeRustTextileOpticsKernel({bytes:readFileSync('public/wasm/exo_textile_optics_kernel.wasm')}),true)
assert.equal(rustTextileOpticsStatus().backend,'rust-wasm')
let exact=0,maxDiff=0,nonfinite=0
for(const [i,{topology,u,v}] of cases.entries()){
 const a=reference[i],b=meshYarnCoverage(topology,u,v)
 if(Number.isNaN(a)){assert.ok(Number.isNaN(b),`coverage ${i}`);nonfinite++;continue}
 const diff=Math.abs(a-b);maxDiff=Math.max(maxDiff,diff)
 assert.ok(diff<=1e-12*Math.max(1,Math.abs(a)),`coverage ${i} topology=${topology} error=${diff}`)
 if(Object.is(a,b))exact++
}
for(const [i,m] of materials.entries()){
 const actual={settings:normalizeFabricOptics(m),surface:describeTextileSurface(m)}
 assert.deepEqual(actual,optics[i],`material ${i}`)
}
for(const [i,{u,v}] of cases.slice(0,512).entries()){
 const result=textileRelief('mesh',u,v,'tulle-net')
 assert.ok(Math.abs(result-textile[i])<=1e-12,`mesh textile relief ${i}`)
}
console.log(JSON.stringify({pass:true,backend:rustTextileOpticsStatus().backend,
 topologies:topologies.length,numericCases:cases.length,exactCoverageCases:exact,
 nonfinite,maxAbsoluteDifference:maxDiff,materials:materials.length,
 fullReliefCases:textile.length,visualOnly:true,originalGarmentsUnchanged:true}))
