import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {assessSimulationFit} from '../src/core/physics/qualityGate.js'
import {initializeRustFitTelemetryKernel,rustFitTelemetryStatus,rustFitThreshold} from '../src/core/rustFitTelemetryKernel.js'
let seed=26026;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
const cases=[]
const values=[undefined,null,0,-0,-1,0.5,5,15,100,NaN,Infinity,-Infinity,'','0','20','bad',true,false]
for(const a of values)for(const b of values)cases.push({quality:{structural:{maxStrainPercent:a},sewing:{maxGapMm:b},collision:{maximumIntrusionMm:a,triangleCcdVerified:true,allFrameIntersectionFree:true}},options:{maximumStructuralStrainPercent:b,maximumSeamGapMm:a,maximumPenetrationMm:b}})
for(let i=0;i<2500;i++){const value=()=>random()<.15?values[Math.floor(random()*values.length)]:(random()-.4)*1e4;cases.push({quality:{structural:{maxStrainPercent:value()},sewing:{maxGapMm:value()},collision:{maximumIntrusionMm:value(),triangleCcdVerified:random()>.5,allFrameIntersectionFree:random()>.5}},options:{maximumStructuralStrainPercent:value(),maximumSeamGapMm:value(),maximumPenetrationMm:value()}})}
cases.push({quality:{collision:{maximumIntrusionMm:null}}},{quality:{}},{quality:{collision:{maximumIntrusionMm:'not-number'}}})
const expected=cases.map(c=>assessSimulationFit(c.quality,c.options))
assert.equal(rustFitTelemetryStatus().backend,'javascript-fallback')
assert.equal(await initializeRustFitTelemetryKernel({bytes:new Uint8Array([0])}),false)
assert.equal(await initializeRustFitTelemetryKernel({bytes:readFileSync('public/wasm/exo_fit_telemetry_kernel.wasm')}),true)
assert.equal(rustFitTelemetryStatus().backend,'rust-wasm')
cases.forEach((c,i)=>assert.deepEqual(assessSimulationFit(c.quality,c.options),expected[i],`report ${i}`))
for(const x of [NaN,Infinity,-Infinity,0,-0,5,15,100])for(const limit of [NaN,Infinity,-Infinity,0,5,15])assert.equal(rustFitThreshold(x,limit),!Number.isFinite(x)?0:x>limit?2:1)
assert.ok(expected.every(r=>r.factoryApproved===false))
console.log(JSON.stringify({pass:true,reports:cases.length,exact:true,factoryApproved:false}))
