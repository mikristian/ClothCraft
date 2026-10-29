import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {inferPatternBodyRole,resolvePatternArrangement,arrangePatternProject} from '../src/core/patternBodyArrangement.js'
import {initializeRustBodyArrangementKernel,rustBodyArrangementKernelStatus} from '../src/core/rustBodyArrangementKernel.js'
import {createTemplateProject} from '../src/data/templates.js'
// Load original source from Git HEAD without modifying any repository file.
const original=execFileSync('git',['show','HEAD:src/core/patternBodyArrangement.js'],{encoding:'utf8'})
const dir=mkdtempSync(join(tmpdir(),'exo-body-original-'))
const file=join(dir,'original.mjs')
writeFileSync(file,original)
const previous=await import(pathToFileURL(file).href)
const names=['left','right','front','back','rear','sleeve','arm','hood','cuff','wrist','waistband','waist','belt','neckband','collar','neck','ribneck','pocket','facing','lining','interfacing','leg','skirt','panel','unknown','pants','denim']
let seed=20261020,checks=0
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const cases=[]
for(let i=0;i<1500;i++){
  const tokens=Array.from({length:1+Math.floor(rand()*6)},()=>names[Math.floor(rand()*names.length)])
  const context=Array.from({length:1+Math.floor(rand()*3)},()=>['dress','pants','skirt','hoodie','unknown','jeans'][Math.floor(rand()*6)])
  cases.push([{id:tokens.join('-'),name:tokens.slice().reverse().join(' '),points:[{y:0},{y:15+Math.floor(rand()*120)}],arrangement3d:i%4===0?{wrap:'authored',x:1,y:2,z:3}:i%4===1?{x:0,y:0,z:0}:{x:.3}}, {templateId:context.join('-'),name:'Sample'}])
}
for(const id of ['pants','hoodie','tshirt','skirt','dress','shorts']){
  try{const project=createTemplateProject(id);if(project?.pieces)for(const piece of project.pieces)cases.push([piece,project])}catch{}
}
const verify=()=>{for(const [piece,project] of cases){
  assert.deepStrictEqual(inferPatternBodyRole(piece,project),previous.inferPatternBodyRole(piece,project));checks++
  assert.deepStrictEqual(resolvePatternArrangement(piece,project),previous.resolvePatternArrangement(piece,project));checks++
  const p={...project,pieces:[piece]}
  assert.deepStrictEqual(arrangePatternProject(p),previous.arrangePatternProject(p));checks++
}}
verify()
assert.equal(await initializeRustBodyArrangementKernel({bytes:readFileSync('public/wasm/exo_body_arrangement_kernel.wasm')}),true)
verify()
rmSync(dir,{recursive:true,force:true})
console.log(JSON.stringify({pass:true,cases:cases.length,checks,backend:rustBodyArrangementKernelStatus().backend}))
