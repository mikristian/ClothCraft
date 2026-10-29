// Source Chrome parity and warmed production benchmark. Uses installed Chrome;
// never downloads browser binaries. Run after build-rust-pbd-kernel.mjs.
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'
const server = await createServer({ server: { host: '127.0.0.1', port: 5187, strictPort: true } })
let browser
try {
  await server.listen()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:5187')
  const result = await page.evaluate(async () => {
    const { buildSimulation, stepSimulation } = await import('/src/core/physics.js')
    const { createTemplateProject } = await import('/src/data/templates.js')
    const { initializeRustPbdKernel, rustPbdKernelStatus } = await import('/src/core/rustPbdKernel.js')
    if (!await initializeRustPbdKernel()) throw new Error(JSON.stringify(rustPbdKernelStatus()))
    const positions = sim => [...sim.pieces.values()].flatMap(piece => piece.particles.flatMap(p => [p.position.x,p.position.y,p.position.z]))
    const parity = [], benchmarks = []
    for (const name of ['tee','pants']) {
      for (const frames of [1,30]) {
        const project = createTemplateProject(name)
        const old = buildSimulation(project), batch = buildSimulation(project)
        old.distanceSweep = null
        for (let i=0;i<frames;i++) { stepSimulation(old,project); stepSimulation(batch,project) }
        const a=positions(old), b=positions(batch)
        let maxError=0
        for(let i=0;i<a.length;i++)maxError=Math.max(maxError,Math.abs(a[i]-b[i]))
        parity.push({name,frames,maxError,pass:Number.isFinite(maxError)&&maxError<=2e-12})
      }
      // Paired runs start from identical authored templates, warm equally and
      // alternate timing order. Count packing, validation and unpacking in stage.
      const trials=[]
      for(let trial=0;trial<3;trial++) {
        const project=createTemplateProject(name)
        const old=buildSimulation(project), batch=buildSimulation(project)
        let oldStage=0,batchStage=0
        const native=batch.distanceSweep
        old.distanceSweep=(reverse,fallback,constraints)=>{
          const start=performance.now()
          for(let i=0;i<constraints.length;i++)fallback(constraints[reverse?constraints.length-1-i:i])
          oldStage+=performance.now()-start
          return true
        }
        batch.distanceSweep=(...args)=>{const start=performance.now(); const result=native(...args); batchStage+=performance.now()-start; return result}
        for(let i=0;i<8;i++){stepSimulation(old,project);stepSimulation(batch,project)}
        oldStage=0;batchStage=0
        let oldTotal=0,batchTotal=0
        for(let i=0;i<16;i++) {
          const runOld=()=>{const start=performance.now();stepSimulation(old,project);oldTotal+=performance.now()-start}
          const runBatch=()=>{const start=performance.now();stepSimulation(batch,project);batchTotal+=performance.now()-start}
          if((i+trial)%2){runBatch();runOld()}else{runOld();runBatch()}
        }
        trials.push({oldStage,batchStage,oldTotal,batchTotal})
      }
      const median=key=>trials.map(v=>v[key]).sort((a,b)=>a-b)[1]
      benchmarks.push({name,stepsPerTrial:16,trials,medianOldStage:median('oldStage'),medianBatchStage:median('batchStage'),pass:median('batchStage')<=median('oldStage')})
    }
    return {backend:rustPbdKernelStatus(),parity,benchmarks}
  })
  console.log(JSON.stringify(result,null,2))
  assert.equal(result.backend.backend,'rust-wasm','Production Rust WASM ABI loaded')
  assert.ok(result.backend.committedSweeps>0&&result.backend.committedConstraints>0,
    'Production solver must actually execute and commit Rust distance sweeps')
  assert.ok(result.parity.every(v=>v.pass),'Production frame parity')
  assert.ok(result.benchmarks.every(v=>v.pass),'Warmed distance stage regression')
} finally { await browser?.close(); await server.close() }
