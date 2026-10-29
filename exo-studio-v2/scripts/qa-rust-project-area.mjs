import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createTemplateProject} from '../src/data/templates.js'
import {polygonArea,pieceArea,projectArea,seamAllowanceBoundary,edgeLength,edgeRangeLength,seamLengthReport} from '../src/core/project.js'
import {initializeRustProjectAreaKernel,rustProjectAreaStatus} from '../src/core/rustProjectAreaKernel.js'
const templateIds=['tee','hoodie','zip-hoodie','pants','skirt','jeans-501','shorts','tank','dress','sweatshirt']
const projects=templateIds.map(createTemplateProject)
const fixture=()=>projects.map(project=>({id:project.id,area:projectArea(project),pieces:project.pieces.map(p=>({id:p.id,area:pieceArea(p),winding:seamAllowanceBoundary(p),lengths:p.points.map((_,i)=>[edgeLength(p,i),edgeRangeLength(p,i,.2,.8)])})),seams:(project.seams||[]).map(s=>({id:s.id,report:seamLengthReport(project,s)}))}))
const baseline=fixture()
const polygonBaseline=points=>{let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a.x*b.y-b.x*a.y}return Math.abs(sum)/2}
assert.equal(await initializeRustProjectAreaKernel({bytes:readFileSync('public/wasm/exo_project_area_kernel.wasm')}),true)
assert.equal(rustProjectAreaStatus().backend,'rust-wasm')
assert.deepEqual(fixture(),baseline,'10 templates: project/piece/edge/seam/winding exact')
let cases=0,seed=0x71ed2a11
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
for(let count=3;count<=102;count++)for(let iter=0;iter<20;iter++){
  const points=Array.from({length:count},()=>({x:(random()-.5)*1000,y:(random()-.5)*1000,id:`p${count}`}))
  assert.equal(polygonArea(points),polygonBaseline(points),`polygon ${count}/${iter}`)
  cases++
}
console.log(JSON.stringify({pass:true,backend:rustProjectAreaStatus().backend,templates:templateIds.length,seededCases:cases,exactFixtureParity:true}))
