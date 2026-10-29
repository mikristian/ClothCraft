// Focused browser acceptance of a Rust-computed POM label in the live editor.
// Opens an isolated context; does not edit the user's document or preference store.
import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try {
  const context=await browser.newContext({viewport:{width:1700,height:1080}})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5188/?desktop=1&testSession=rust-pom',{waitUntil:'domcontentloaded'})
  await page.locator('.pattern-canvas').waitFor({state:'visible',timeout:20000})
  const frontendReady=await page.evaluate(async()=>{
    const module=await import('/src/core/rustPomKernel.js')
    const success=await module.initializeRustPomKernel()
    return {success,ready:module.rustPomKernelReady()}
  })
  assert.equal(frontendReady.ready,true,'POM WASM must instantiate inside the actual application')
  const piece=page.locator('.pattern-piece[data-piece-id="front"]')
  await piece.locator('.pattern-fill').first().click({force:true})
  const label=page.locator('[data-draft-measure-guide="front-chest"] .clo-pom-measurement-label')
  await label.waitFor({state:'visible',timeout:4000})
  const backend=page.locator('[data-draft-measure-guide="front-chest"]')
  await page.waitForFunction(()=>document.querySelector('[data-draft-measure-guide="front-chest"]')?.getAttribute('data-pom-backend')==='rust-wasm',null,{timeout:5000})
  assert.equal(await backend.getAttribute('data-pom-backend'),'rust-wasm')
  const observation=await page.evaluate(async()=>{
    const module=await import('/src/core/rustPomKernel.js')
    const guide=document.querySelector('[data-draft-measure-guide="front-chest"]')
    const line=guide?.querySelector('line')
    const text=guide?.querySelector('.clo-pom-measurement-label')
    if(!guide||!line||!text)return null
    const a={x:Number(line.getAttribute('x1')),y:Number(line.getAttribute('y1'))}
    const b={x:Number(line.getAttribute('x2')),y:Number(line.getAttribute('y2'))}
    const labelPos={x:Number(text.getAttribute('x')),y:Number(text.getAttribute('y'))}
    const result=module.rustPomLabelAnchor(a,b,{dx:labelPos.x-(a.x+b.x)*.5,dy:labelPos.y-(a.y+b.y)*.5})
    return {rendered:labelPos,rust:result,backend:module.rustPomKernelReady()}
  })
  assert(observation?.backend,'POM rendering requires Rust WASM loaded')
  assert.ok(Math.abs(observation.rendered.x-observation.rust.x)<1e-8)
  assert.ok(Math.abs(observation.rendered.y-observation.rust.y)<1e-8)
  assert.deepEqual(errors,[],'POM browser view must have no uncaught application errors')
  console.log(JSON.stringify({pass:true,view:'EXO 2D Pattern Editor',operation:'Rust POM label',observation}))
} finally {
  await browser.close()
}
