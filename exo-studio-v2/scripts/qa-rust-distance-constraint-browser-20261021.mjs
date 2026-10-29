// Real Chrome production step on disposable template state; no saved garments.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const source=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(source,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    // Vite HMR version-qualifies imports from physics.js. Read its real
    // transformed import so this verifies the SAME module instance used by
    // the production solver, rather than a second unqualified import.
    const physicsSource=await fetch('/src/core/physics.js').then(r=>r.text())
    const importPath=physicsSource.match(/from "(\/src\/core\/rustDistanceConstraintKernel\.js[^\"]*)"/)?.[1]
    if(!importPath)throw Error('Production physics module does not import Rust distance kernel')
    const native=await import(importPath)
    const physics=await import('/src/core/physics.js')
    const templates=await import('/src/data/templates.js')
    const loaded=await native.initializeRustDistanceConstraintKernel()
    const project=templates.createTeeTemplate()
    project.simulation={...project.simulation,collisions:false,selfCollision:false,
      substeps:1,iterations:3,wind:{enabled:false}}
    const immutableProject=JSON.stringify(project)
    const simulation=physics.buildSimulation(project)
    const before=native.rustDistanceConstraintStatus().calls
    const initial=simulation.pieces.get('front').particles[6].position.clone()
    physics.stepSimulation(simulation,project,1/60)
    const particles=[...simulation.pieces.values()].flatMap(piece=>piece.particles)
    return {loaded,status:native.rustDistanceConstraintStatus(),before,
      constraints:simulation.constraints.length,particles:particles.length,
      finite:particles.every(p=>Number.isFinite(p.position.x)&&Number.isFinite(p.position.y)&&Number.isFinite(p.position.z)),
      firstMoved:!simulation.pieces.get('front').particles[6].position.equals(initial),
      documentUnchanged:JSON.stringify(project)===immutableProject,
      strain:simulation.strain,elapsed:simulation.elapsed}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.equal(result.status.abiVersion,1)
  assert.ok(result.status.calls>result.before,JSON.stringify(result))
  assert.ok(result.constraints>0)
  assert.ok(result.particles>0)
  assert.equal(result.finite,true)
  assert.equal(result.documentUnchanged,true)
  assert.equal(result.firstMoved,true)
  assert.ok(result.elapsed>0)
  console.log(JSON.stringify({pass:true,source,backend:result.status.backend,
    constraints:result.constraints,particles:result.particles,
    kernelCalls:result.status.calls,documentUnchanged:true,solverCertified:false}))
}finally{await browser.close()}
