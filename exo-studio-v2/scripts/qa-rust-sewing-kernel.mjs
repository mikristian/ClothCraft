import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {sewingLengthDiagnostic,inspectSewingLengths} from '../src/core/sewingLengthDiagnostics.js'
import {initializeRustSewingKernel,rustSewingKernelStatus,rustSewingKernelReady} from '../src/core/rustSewingKernel.js'

assert.equal(rustSewingKernelReady(),false,'Reference JS fallback must be tested before WASM load')
const measurements=[]
for(const a of [.001,.1,1,8,10,25,26.17,26.18,40,125,201.25]){
  for(const b of [.001,.12,1,8,9.5,10,24.5,26.18,40,125,204.3]){
    measurements.push({
      seamId:`seam-${measurements.length}`,
      first:{length2DCm:a,length3DCm:a*1.2},
      second:{length2DCm:b,length3DCm:b*1.1},
    })
  }
}
measurements.push({seamId:'invalid-NaN',first:{length2DCm:NaN},second:{length2DCm:8}})
measurements.push({seamId:'invalid-negative',first:{length2DCm:3},second:{length2DCm:-5}})
measurements.push({seamId:'missing'})
const options=[
  {},{lengthOn:false,ratioOn:false},{lengthOn:false,ratioOn:true},
  {lengthOn:true,ratioOn:false},{lengthThreshold:0,ratioThreshold:0},
  {lengthThreshold:.5,ratioThreshold:10},{lengthThreshold:100,ratioThreshold:100},
  {lengthThreshold:-1,ratioThreshold:-2},
]
const expected=options.map(o=>inspectSewingLengths(measurements,o))
const bytes=readFileSync('public/wasm/exo_sewing_kernel.wasm')
assert.equal(await initializeRustSewingKernel({bytes}),true,rustSewingKernelStatus().error)
assert.equal(rustSewingKernelStatus().backend,'rust-wasm')
assert.equal(rustSewingKernelStatus().abiVersion,1)
let cases=0
for(let i=0;i<options.length;i++){
  const actual=inspectSewingLengths(measurements,options[i])
  const original=expected[i]
  assert.deepEqual(
    {total:actual.total,measured:actual.measured,warnings:actual.warnings,unavailable:actual.unavailable},
    {total:original.total,measured:original.measured,warnings:original.warnings,unavailable:original.unavailable})
  for(let j=0;j<measurements.length;j++){
    const a=actual.rows[j], b=original.rows[j]
    for(const key of ['seamId','valid','firstCm','secondCm','first3DCm','second3DCm','warning']){
      assert.deepEqual(a[key],b[key],`${i}/${j} property ${key}`)
    }
    for(const key of ['signedDifferenceCm','absoluteDifferenceCm','differencePercent']){
      if(b[key]===null){assert.equal(a[key],null);continue}
      assert.ok(Math.abs(a[key]-b[key])<=1e-11*Math.max(1,Math.abs(b[key])),
        `${i}/${j} property ${key}: ${a[key]} != ${b[key]}`)
    }
    cases++
  }
}
assert.equal(sewingLengthDiagnostic({
  seamId:'boundary',first:{length2DCm:10},second:{length2DCm:9.5},
},{lengthThreshold:.5,ratioOn:false}).warning,false)
console.log(JSON.stringify({pass:true,backend:'rust-wasm',cases,wasmBytes:bytes.byteLength}))
