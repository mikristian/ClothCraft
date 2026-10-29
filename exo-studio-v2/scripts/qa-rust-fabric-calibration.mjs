import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import * as calibration from '../src/core/fabricCalibration.js'
import {initializeRustFabricKernel,rustFabricKernelStatus} from '../src/core/rustFabricKernel.js'
import {FABRIC_PRESETS,createDefaultProject} from '../src/data/defaultProject.js'
import {CLOTHCRAFT_FABRICS,presetProperties} from '../src/core/clothcraftFabrics.js'
import {fabricPresetPayload,parseFabricPreset} from '../src/core/fabricPresetFiles.js'
import {writeSavedProject,readSavedProject} from '../src/core/projectRestore.js'

const close=(actual,expected)=>{
  if(typeof expected==='number'){
    if(!Number.isFinite(expected))assert.ok(Object.is(actual,expected))
    else assert.ok(Math.abs(actual-expected)<=1e-12*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`)
  }else if(expected&&typeof expected==='object'){
    assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort())
    for(const key of Object.keys(expected))close(actual[key],expected[key])
  }else assert.equal(actual,expected)
}
const cases=[]
const add=(name,...args)=>cases.push({name,args})
// Reproducible independent numeric specimens, including nonuniform tensile curves.
let seed=0x11fabc23
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/0x100000000)
for(let i=0;i<128;i++){
  const widthMm=10+rand()*90,gaugeLengthMm=80+rand()*320
  const observations=Array.from({length:2+(i%5)},(_,j)=>({
    extensionMm:gaugeLengthMm*(0.002+(j+1)*0.02*rand()),
    forceN:0.01+rand()*6,
  }))
  add('estimateTensileStiffness',{widthMm,gaugeLengthMm,observations})
  add('fabricAreaMassKg',0.1+rand()*4,30+rand()*600)
  add('estimateShearStiffness',{widthMm,forceN:0.01+rand()*3,shearAngleDeg:1+rand()*40})
  add('estimateCantileverBending',{gsm:50+rand()*500,overhangMm:60+rand()*90,tipDeflectionMm:1+rand()*5})
  add('frictionFromInclineAngle',1+rand()*82)
}
for(const fabric of Object.values(FABRIC_PRESETS)){
  add('fabricAreaMassKg',1.234,fabric.gsm)
  add('estimateCantileverBending',{gsm:fabric.gsm,overhangMm:73,tipDeflectionMm:4})
}
// Synthetic measured loads exercise each native preset's stiffness, without
// treating stretch percentages as measurements or changing preset parameters.
for(const preset of CLOTHCRAFT_FABRICS){
  const p=presetProperties(preset,{compression_ratio:.5,compression_transition:.05})
  for(const stiffness of [p.warp,p.weft])add('estimateTensileStiffness',{
    widthMm:30,gaugeLengthMm:200,observations:[
      {extensionMm:2,forceN:stiffness*.01*.03},
      {extensionMm:4,forceN:stiffness*.02*.03*1.03},
      {extensionMm:7,forceN:stiffness*.035*.03*.98},
    ],
  })
  add('estimateShearStiffness',{widthMm:30,forceN:p.shear*.03*Math.tan(.1),shearAngleDeg:.1*180/Math.PI})
}
for(const angle of [.001,10,44.999,45,84.999,'30'])add('frictionFromInclineAngle',angle)
add('fabricAreaMassKg','2','450')
add('estimateTensileStiffness',{widthMm:'30',gaugeLengthMm:'200',observations:[{extensionMm:'2',forceN:'.12'}]})
add('estimateTensileStiffness',{widthMm:30,gaugeLengthMm:200,observations:[{extensionMm:200,forceN:1}]})
for(const bad of [0,-1,NaN,Infinity,null,'bad']){
  add('fabricAreaMassKg',bad,220)
  add('frictionFromInclineAngle',bad)
  add('estimateTensileStiffness',{widthMm:30,gaugeLengthMm:200,observations:[{extensionMm:2,forceN:bad}]})
  add('estimateShearStiffness',{widthMm:bad,forceN:1,shearAngleDeg:10})
  add('estimateCantileverBending',{gsm:220,overhangMm:100,tipDeflectionMm:5,gravity:bad})
}
add('estimateTensileStiffness',{widthMm:30,gaugeLengthMm:200,observations:[]})
add('estimateTensileStiffness',{widthMm:30,gaugeLengthMm:200,observations:[{extensionMm:201,forceN:1}]})
add('estimateShearStiffness',{widthMm:30,forceN:1,shearAngleDeg:45})
add('estimateCantileverBending',{gsm:220,overhangMm:100,tipDeflectionMm:15})
add('frictionFromInclineAngle',85)
const run=({name,args})=>{
  try{return {value:calibration[name](...args)}}
  catch(error){return {error:error.constructor.name,message:error.message}}
}
const before=cases.map(run)
assert.equal(rustFabricKernelStatus().backend,'javascript-fallback')
const project=createDefaultProject()
const projectBytes=JSON.stringify(project)
const nativePresets=CLOTHCRAFT_FABRICS.map(p=>({name:p.name,properties:presetProperties(p,{compression_ratio:.5,compression_transition:.05})}))
const presetBytes=nativePresets.map(f=>JSON.stringify(fabricPresetPayload(f,'native')))
const parseOutcome=json=>{try{return {fabric:parseFabricPreset(json).fabric}}catch(error){return {error:error.message}}}
const presetOutcomes=presetBytes.map(parseOutcome)
const presetsBefore=JSON.stringify([FABRIC_PRESETS,CLOTHCRAFT_FABRICS])
assert.equal(await initializeRustFabricKernel({bytes:readFileSync('public/wasm/exo_fabric_kernel.wasm')}),true)
assert.equal(rustFabricKernelStatus().backend,'rust-wasm')
cases.forEach((c,i)=>close(run(c),before[i]))
assert.equal(JSON.stringify([FABRIC_PRESETS,CLOTHCRAFT_FABRICS]),presetsBefore)
// Exercise the application save/restore API, including calibration inputs/results.
project.nativeFabrics=nativePresets
project.calibrationEvidence={measurements:cases.slice(0,2),metrics:before.slice(0,2)}
const stored=new Map()
const storage={getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)}
writeSavedProject(storage,'project','backup',project)
const restored=readSavedProject(storage,'project','backup').project
assert.deepEqual(restored,project)
for(const fabric of Object.values(restored.fabrics)){
  if(fabric.gsm)close(calibration.fabricAreaMassKg(1.234,fabric.gsm),1.234*fabric.gsm/1000)
}
for(const [i,fabric] of nativePresets.entries()){
  const bytes=JSON.stringify(fabricPresetPayload(fabric,'native'))
  assert.equal(bytes,presetBytes[i])
  assert.deepEqual(parseOutcome(bytes),presetOutcomes[i])
  if(presetOutcomes[i].fabric)assert.deepEqual(presetOutcomes[i].fabric,fabric)
}
assert.equal(JSON.stringify({...project,nativeFabrics:undefined,calibrationEvidence:undefined}),projectBytes)
console.log(JSON.stringify({pass:true,backend:rustFabricKernelStatus().backend,differentialCases:cases.length,
  draftPresets:Object.keys(FABRIC_PRESETS).length,nativePresetDifferential:nativePresets.length,nativePresetRoundTrips:presetOutcomes.filter(p=>p.fabric).length,existingPresetRejections:presetOutcomes.filter(p=>p.error).length,savedProjectParity:true,
  units:['kg','N/m','N·m','dimensionless'],nativeSolverValidated:false}))
