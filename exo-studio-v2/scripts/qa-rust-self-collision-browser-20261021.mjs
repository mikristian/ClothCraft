// Real Vite/Chrome source validation of production self-collision path.
// All simulations and particles are disposable in-memory fixtures.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const url=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
  const page=await browser.newPage()
  await page.goto(url,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const kernel=await import('/src/core/rustSelfCollisionKernel.js')
    const collisions=await import('/src/core/physics/selfCollision.js')
    const THREE=await import('/node_modules/three/build/three.module.js')
    const loaded=await kernel.initializeRustSelfCollisionKernel()
    const make=(layers=false,blocked=false)=>{
      const a={simIndex:0,pieceId:'a',invMass:1,layerIndex:0,
        position:new THREE.Vector3(0,0,0)}
      const b={simIndex:1,pieceId:'b',invMass:1,layerIndex:layers?1:0,
        wrapMode:layers?'right-arm':'',position:new THREE.Vector3(.005,0,0)}
      const scene={pieces:new Map([['a',{particles:[a]}],['b',{particles:[b]}]]),
        collisionExclusions:new Set(blocked?['0:1']:[]),fusedPiecePairs:new Set()}
      return {a,b,scene}
    }
    const basic=make()
    const originalBasic=[basic.a.position.x,basic.b.position.x]
    collisions.resolveSelfCollisions(basic.scene,.02)
    const layered=make(true)
    collisions.resolveSelfCollisions(layered.scene,.02)
    const excluded=make(false,true)
    collisions.resolveSelfCollisions(excluded.scene,.02)
    const fused=make()
    fused.scene.fusedPiecePairs.add('a|b')
    collisions.resolveSelfCollisions(fused.scene,.02)
    const pure=kernel.selfCollisionPairScalars(.02,.005*.005,1,1,0,0)
    return {loaded,status:kernel.rustSelfCollisionKernelStatus(),
      originalBasic,afterBasic:[basic.a.position.x,basic.b.position.x],
      afterLayered:[layered.a.position.x,layered.b.position.x],
      afterExcluded:[excluded.a.position.x,excluded.b.position.x],
      afterFused:[fused.a.position.x,fused.b.position.x],pure}
  })
  assert.equal(result.loaded,true)
  assert.equal(result.status.backend,'rust-wasm')
  assert.deepEqual(result.originalBasic,[0,.005])
  assert.equal(Math.abs(result.afterBasic[0]+.0075)<1e-15,true)
  assert.equal(Math.abs(result.afterBasic[1]-.0125)<1e-15,true)
  assert.deepEqual(result.afterExcluded,[0,.005])
  assert.deepEqual(result.afterFused,[0,.005])
  // An upper-layer right-arm particle is redirected OUTWARD (negative X
  // relative to the right-arm center), rather than preserving +X ordering.
  assert.ok(Math.abs(result.afterLayered[0]-.0015)<1e-15)
  assert.ok(Math.abs(result.afterLayered[1]+.0085)<1e-15)
  assert.equal(result.pure[0],.005)
  console.log(JSON.stringify({pass:true,url,backend:result.status.backend,
    pairFixtures:4,scalarFixture:true,layerOrdering:true,
    exclusionsPreserved:true,fusedPiecePolicyPreserved:true,
    realProductionCallPath:true,garmentWrites:0,solverCertified:false}))
}finally{await browser.close()}
