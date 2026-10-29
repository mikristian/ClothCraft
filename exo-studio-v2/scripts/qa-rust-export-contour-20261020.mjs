import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createTemplateProject} from '../src/data/templates.js'
import {prepareNativePatternExport} from '../src/core/nativePatternExportPreparation.js'
import {initializeRustExportContourKernel,exportEdgeKeep,exportAreaTerm,rustExportContourStatus} from '../src/core/rustExportContourKernel.js'

let seed=0x17001700
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
const cases=[]
for(let i=0;i<5000;i++){
 const a={x:(rand()-.5)*1000,y:(rand()-.5)*1000},b={x:(rand()-.5)*1000,y:(rand()-.5)*1000},min=rand()*100
 cases.push({a,b,min})
}
for(const gap of [0.009999999999,0.01,0.010000000001,0,Number.EPSILON])cases.push({a:{x:0,y:0},b:{x:gap,y:0},min:0.01})
for(const v of [NaN,Infinity,-Infinity])cases.push({a:{x:v,y:0},b:{x:1,y:1},min:0.01})
const before=cases.map(({a,b,min})=>({keep:exportEdgeKeep(a,b,min),term:exportAreaTerm(a,b)}))
const fixtureIds=['tee','hoodie','zip-hoodie','pants','skirt','jeans-501','sweatshirt','shorts','tank','dress']
const known=[]
for(const id of fixtureIds){try{known.push({id,project:createTemplateProject(id)})}catch{}}
const exportsBefore=known.map(({id,project})=>({id,result:prepareNativePatternExport(project),project:structuredClone(project)}))
assert.equal(await initializeRustExportContourKernel({bytes:readFileSync('public/wasm/exo_export_contour_kernel.wasm')}),true)
let maxAreaTermError=0
for(let i=0;i<cases.length;i++){
 const c=cases[i],expected=before[i],keep=exportEdgeKeep(c.a,c.b,c.min),term=exportAreaTerm(c.a,c.b)
 assert.equal(keep,expected.keep,`micro-edge ${i}`)
 if(Number.isNaN(expected.term))assert.ok(Number.isNaN(term))
 else {if(Number.isFinite(expected.term))maxAreaTermError=Math.max(maxAreaTermError,Math.abs(term-expected.term));assert.equal(term,expected.term)}
}
for(const {id,project} of known){const baseline=exportsBefore.find(x=>x.id===id),after=prepareNativePatternExport(project)
 assert.deepEqual(after,baseline.result,`${id}: manufacturing output changed`)
 assert.deepEqual(project,baseline.project,`${id}: editable project changed`)
}
const malformed={pieces:[{id:'tiny',points:[{x:0,y:0},{x:0.001,y:0},{x:0.002,y:0}]}],seams:[]}
assert.throws(()=>prepareNativePatternExport(malformed),/Panel tiny has fewer than three usable edges/)
console.log(JSON.stringify({pass:true,backend:rustExportContourStatus().backend,seed:'0x17001700',numericCases:cases.length,libraryFixtures:known.map(x=>x.id),maxAreaTermError,exactManufacturingOutput:true,originalProjectsUnchanged:true}))
