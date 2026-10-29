// RUST-027 real Chrome source acceptance; all settings and frames are disposable.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const url=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(url,{waitUntil:'domcontentloaded'})
  const results=await page.evaluate(async()=>{
    const wasm=await import('/src/core/rustTimestepKernel.js')
    const {resolveSolverTimestep}=await import('/src/core/physics/timestep.js')
    const loaded=await wasm.initializeRustTimestepKernel()
    const cases=[
      {name:'paused-invalid-thickness',settings:{gravity:-1},dt:0,thickness:-Infinity},
      {name:'invalid-dt',settings:{gravity:-1},dt:-1,thickness:-1},
      {name:'nan-dt',settings:{},dt:NaN,thickness:0.002},
      {name:'invalid-thickness',settings:{gravity:-1},dt:1/60,thickness:-1},
      {name:'gravity-before-margin',settings:{gravity:-1,selfCollisionMargin:-2},dt:1/60,thickness:0.002},
      {name:'margin-after-gravity',settings:{gravity:0,selfCollisionMargin:-1},dt:1/60,thickness:0.002},
      {name:'negative-half-substeps',settings:{substeps:-0.5,gravity:9.81},dt:1/60,thickness:0.002},
      {name:'negative-one-half-substeps',settings:{substeps:-1.5},dt:1/30,thickness:0.002},
      {name:'nan-substeps',settings:{substeps:NaN,iterations:NaN},dt:1/60,thickness:0.002},
      {name:'nan-gravity',settings:{gravity:NaN},dt:1/60,thickness:0.002},
      {name:'nan-margin',settings:{selfCollisionMargin:NaN},dt:1/60,thickness:0.002},
      {name:'schedule-default',settings:{},dt:1/60,thickness:0.002},
      {name:'schedule-clamped',settings:{substeps:4,iterations:14,gravity:0},dt:1,thickness:0.004},
      {name:'schedule-custom',settings:{substeps:3,iterations:12,gravity:10,selfCollisionMargin:0.005},dt:1/90,thickness:0.003},
    ]
    const snapshots=cases.map(x=>JSON.stringify(x))
    const evaluated=cases.map(({name,settings,dt,thickness},i)=>{
      try {return {name,value:resolveSolverTimestep(settings,dt,thickness),unchanged:snapshots[i]===JSON.stringify(cases[i])}}
      catch(e){return {name,error:e.message,type:e.name,unchanged:snapshots[i]===JSON.stringify(cases[i])}}
    })
    return {loaded,status:wasm.rustTimestepStatus(),evaluated}
  })
  assert.equal(results.loaded,true,JSON.stringify(results.status))
  assert.equal(results.status.backend,'rust-wasm')
  const byName=Object.fromEntries(results.evaluated.map(x=>[x.name,x]))
  assert.equal(byName['paused-invalid-thickness'].value,null)
  for(const [name,type,error] of [
    ['invalid-dt','RangeError','Invalid simulation dt: -1'],
    ['nan-dt','RangeError','Invalid simulation dt: NaN'],
    ['invalid-thickness','RangeError','Invalid maximum cloth thickness: -1'],
    ['gravity-before-margin','RangeError','Invalid simulation gravity: -1'],
    ['margin-after-gravity','RangeError','Invalid self-collision margin: -1'],
    ['nan-gravity','RangeError','Invalid simulation gravity: NaN'],
    ['nan-margin','RangeError','Invalid self-collision margin: NaN'],
  ]) {assert.equal(byName[name].type,type,name);assert.equal(byName[name].error,error,name)}
  assert.equal(byName['negative-half-substeps'].value.substeps,1)
  assert.equal(byName['negative-one-half-substeps'].value.substeps,1)
  assert.equal(byName['nan-substeps'].value.substeps,1)
  assert.equal(byName['nan-substeps'].value.requestedIterations,7)
  const defaults=byName['schedule-default'].value
  assert.equal(defaults.substeps,1)
  assert.equal(defaults.iterations,7)
  assert.equal(defaults.safeDt,1/60)
  const clamped=byName['schedule-clamped'].value
  assert.equal(clamped.safeDt,1/30)
  assert.equal(clamped.substeps,4)
  assert.equal(clamped.iterations,4)
  const custom=byName['schedule-custom'].value
  assert.equal(custom.substeps,3)
  assert.equal(custom.iterations,4)
  assert.equal(custom.selfCollisionDistance,0.011)
  assert.ok(results.evaluated.every(x=>x.unchanged))
  console.log(JSON.stringify({pass:true,url,backend:results.status.backend,cases:results.evaluated.length,
    exactErrorMessages:true,pausedFrameNoOp:true,negativeHalfRounding:true,nanCoercion:true,
    validSchedules:3,settingsUnchanged:true}))
}finally{await browser.close()}
