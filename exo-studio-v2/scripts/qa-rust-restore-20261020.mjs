import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createDefaultProject} from '../src/data/defaultProject.js'
import {validateSavedProject,readSavedProject,writeSavedProject} from '../src/core/projectRestore.js'
import {initializeRustRestoreKernel,restoreShapeCode,rustRestoreStatus} from '../src/core/rustRestoreKernel.js'
const valid=createDefaultProject()
const cases=[null,0,[],{}, {pieces:[]},{pieces:[],seams:[]},valid,
 {...valid,fabrics:null},{...valid,simulation:null},
 {...valid,pieces:[{id:'invalid',points:[{x:NaN,y:0}]}]},
 {...valid,pieces:[{id:'invalid',points:[{x:0,y:Infinity}]}]}]
let seed=0x15001500
for(let i=0;i<512;i++){
 seed=(Math.imul(seed,1664525)+1013904223)>>>0
 const v=seed%8
 cases.push(v===0?{...valid,pieces:null}:v===1?{...valid,seams:null}:v===2?{...valid,pieces:[]}:v===3?{...valid,seams:[]}:v===4?{...valid,pieces:[{}]}:v===5?{...valid,fabrics:[]}:v===6?{...valid,simulation:[]}:{...valid,pieces:[{id:'t',points:[{x:seed,y:2}]}]})
}
const evaluate=(p,legacy)=>{try{validateSavedProject(p,{legacy});return {ok:true}}catch(e){return {ok:false,message:e.message}}}
const baseline=cases.flatMap(p=>[evaluate(p,false),evaluate(p,true)])
assert.equal(rustRestoreStatus().backend,'javascript-fallback')
assert.equal(await initializeRustRestoreKernel({bytes:readFileSync('public/wasm/exo_restore_kernel.wasm')}),true)
assert.equal(rustRestoreStatus().backend,'rust-wasm')
assert.deepEqual(cases.flatMap(p=>[evaluate(p,false),evaluate(p,true)]),baseline)
assert.equal(restoreShapeCode(null),1)
assert.equal(restoreShapeCode({}),2)
assert.equal(restoreShapeCode({pieces:[],seams:[]}),0)
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}
const raw=JSON.stringify(valid)
writeSavedProject(storage,'project','backup',valid)
assert.equal(store.get('project'),raw)
assert.deepEqual(readSavedProject(storage,'project','backup').project,valid)
store.set('project','{"pieces":null}')
assert.equal(readSavedProject(storage,'project','backup').status,'backup')
assert.deepEqual(readSavedProject(storage,'project','backup').project,valid)
console.log(JSON.stringify({pass:true,backend:rustRestoreStatus().backend,validationCases:baseline.length,saveReopen:true,backupRecovery:true,exactErrors:true}))
