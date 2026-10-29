// Source Chrome: actual textile material path, optical only; no saved projects.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const url=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
 const page=await browser.newPage()
 await page.goto(url,{waitUntil:'domcontentloaded'})
 const result=await page.evaluate(async()=>{
  const kernel=await import('/src/core/rustTextileOpticsKernel.js')
  const surface=await import('/src/core/fabricSurfaceModel.js')
  const textile=await import('/src/core/textileProcedurals.js')
  const loaded=await kernel.initializeRustTextileOpticsKernel()
  const materials=[{name:'Tulle net',surfaceFamily:'mesh',roughness:.62,opacity:.6},
   {name:'Power mesh',surfaceFamily:'mesh',roughness:.45},
   {name:'Denim twill',surfaceFamily:'twill',weaveScaleCm:3.5}]
  const optics=materials.map(fabric=>surface.normalizeFabricOptics(fabric))
  const surfaces=materials.map(fabric=>textile.describeTextileSurface(fabric))
  const mesh=surfaces.slice(0,2).map(s=>textile.meshYarnCoverage(s.meshTopology,.137,.721))
  const gradients=surfaces.map(s=>textile.textileRelief(s.family,.37,.61,s.meshTopology))
  return {loaded,status:kernel.rustTextileOpticsStatus(),optics,surfaces,mesh,gradients}
 })
 assert.equal(result.loaded,true)
 assert.equal(result.status.backend,'rust-wasm')
 assert.equal(result.status.abiVersion,1)
 assert.equal(result.optics.length,3)
 assert.equal(result.surfaces[0].meshTopology,'tulle-net')
 assert.equal(result.surfaces[1].meshTopology,'power-mesh')
 assert.ok([...result.mesh,...result.gradients].every(Number.isFinite))
 console.log(JSON.stringify({pass:true,url,backend:result.status.backend,abi:1,
  materialFixtures:result.optics.length,visualOnly:true,garmentWrites:0}))
}finally{await browser.close()}
