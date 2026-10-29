import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const source=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(source,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustFabricKernel.js')
    const calibration=await import('/src/core/fabricCalibration.js')
    const loaded=await kernel.initializeRustFabricKernel()
    const status=kernel.rustFabricKernelStatus()
    const outputs={
      massKg:calibration.fabricAreaMassKg(2,450),
      tensile:calibration.estimateTensileStiffness({widthMm:30,gaugeLengthMm:200,observations:[{extensionMm:2,forceN:.12},{extensionMm:4,forceN:.24}]}),
      shearNPerM:calibration.estimateShearStiffness({widthMm:30,forceN:.09,shearAngleDeg:10}),
      bendingNm:calibration.estimateCantileverBending({gsm:220,overhangMm:100,tipDeflectionMm:5}),
      friction:calibration.frictionFromInclineAngle(45),
    }
    return {loaded,status,outputs,wasmAbi:(await WebAssembly.instantiate(await (await fetch('/wasm/exo_fabric_kernel.wasm')).arrayBuffer())).instance.exports.exo_fabric_kernel_abi_version()}
  })
  const close=(value,target)=>assert.ok(Number.isFinite(value)&&Math.abs(value-target)<=1e-10*Math.max(1,Math.abs(target)),`${value} != ${target}`)
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.equal(result.status.abiVersion,2)
  assert.equal(result.wasmAbi,2)
  close(result.outputs.massKg,.9)
  close(result.outputs.tensile.stiffnessNPerM,400)
  close(result.outputs.tensile.rmsErrorNPerM,0)
  close(result.outputs.tensile.maxMeasuredStrain,.02)
  assert.equal(result.outputs.tensile.points,2)
  close(result.outputs.shearNPerM,.09/(.03*Math.tan(10*Math.PI/180)))
  close(result.outputs.bendingNm,.22*9.80665*.1**4/(8*.005))
  close(result.outputs.friction,1)
  console.log(JSON.stringify({pass:true,source,chrome:true,loaded:result.loaded,backend:result.status.backend,abiVersion:result.status.abiVersion,functions:5,outputs:result.outputs}))
}finally{await browser.close()}
