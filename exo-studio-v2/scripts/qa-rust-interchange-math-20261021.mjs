import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createTemplateProject} from '../src/data/templates.js'
import {projectToGarmentCode,garmentCodeToProject} from '../src/core/garmentCode.js'
import {parseSeamlyMeasurements} from '../src/core/seamlyMeasurements.js'
import {initializeRustInterchangeMathKernel,rustInterchangeMathStatus,rustRelativeControl,rustAbsoluteControl,rustSeamlyCentimeters} from '../src/core/rustInterchangeMathKernel.js'

let seed=0x21021337
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
const random=()=>((rand()-.5)*10000)
const vectors=Array.from({length:2000},()=>({a:{x:random(),y:random()},b:{x:random(),y:random()},c:{cx:random(),cy:random()},rel:[random()/10000,random()/10000]}))
vectors.push({a:{x:2,y:3},b:{x:2,y:3},c:{cx:6,cy:7},rel:[null,'0.45']})
const capture=(f)=>{try{return {ok:true,result:f()}}catch(e){return{ok:false,error:e.message}}}
const svgCases=[
  '<smis><unit>cm</unit><body-measurements><m name="height" value="180"/><m name="bust_circ" value="97.75"/></body-measurements></smis>',
  '<smis><unit>mm</unit><body-measurements><m name="waist_circ" value="850"/></body-measurements></smis>',
  '<smis><unit>inch</unit><body-measurements><m name="neck_circ" value="15.25"/></body-measurements></smis>',
  '<smms><unit>in</unit><body-measurements><m name="bust_circ" base="40" size_increase="-0.5" height_increase="0.25"/></body-measurements></smms>',
  '<smms><unit>mm</unit><body-measurements><m name="hip_circ" base="1020" size_increase="-20" height_increase="5"/></body-measurements></smms>',
  '<smis><unit>ft</unit><body-measurements><m name="waist_circ" value="5"/></body-measurements></smis>',
  '<smis><unit>cm</unit><body-measurements><m name="BAD name" value="7"/></body-measurements></smis>',
  '<smis><unit>cm</unit><body-measurements><m name="height" value="22 + 10"/></body-measurements></smis>',
  '<!DOCTYPE x><smis><unit>cm</unit></smis>',
]
const templates=['tee','hoodie','zip-hoodie','pants','skirt','jeans-501','shorts','tank','dress','sweatshirt']
const cases=templates.map(id=>({id,project:createTemplateProject(id)}))
const baseline=cases.map(({id,project})=>({id,spec:projectToGarmentCode(project),source:structuredClone(project)}))
const measurements=svgCases.map(xml=>capture(()=>parseSeamlyMeasurements(xml,{filename:'isolated.smis'})))
const baselineMath=vectors.map(({a,b,c,rel})=>({forward:rustRelativeControl(a,b,c),inverse:rustAbsoluteControl(a,b,rel)}))
assert.equal(rustInterchangeMathStatus().backend,'javascript-fallback')
assert.equal(await initializeRustInterchangeMathKernel({bytes:readFileSync('public/wasm/exo_interchange_math_kernel.wasm')}),true)
assert.equal(rustInterchangeMathStatus().backend,'rust-wasm')
let scalarParity=0
for(let i=0;i<vectors.length;i++){
  const v=vectors[i],expected=baselineMath[i]
  const after={forward:rustRelativeControl(v.a,v.b,v.c),inverse:rustAbsoluteControl(v.a,v.b,v.rel)}
  assert.deepEqual(after,expected,`vector ${i}`)
  scalarParity+=4
}
for(const xml of svgCases)assert.deepEqual(capture(()=>parseSeamlyMeasurements(xml,{filename:'isolated.smis'})),measurements[svgCases.indexOf(xml)])
for(const {id,project} of cases){
  const expected=baseline.find(x=>x.id===id)
  assert.deepEqual(projectToGarmentCode(project),expected.spec,`${id} converted GarmentCode changed`)
  assert.deepEqual(project,expected.source,`${id} source project mutated`)
  const imported=garmentCodeToProject(expected.spec,project)
  assert.equal(imported.pieces.length,project.pieces.length)
  assert.equal(imported.seams.length,project.seams.length)
}
assert.equal(rustSeamlyCentimeters(2.5,2.54),6.35)
console.log(JSON.stringify({pass:true,backend:rustInterchangeMathStatus().backend,
  vectors:vectors.length,scalarParityCases:scalarParity,templateFixtures:cases.length,
  seamlyFixtures:svgCases.length,exactJsonOutput:true,originalProjectImmutability:true}))
