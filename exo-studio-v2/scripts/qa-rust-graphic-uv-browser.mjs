/** Exercise EXO's *actual browser* loading the Rust WASM resource via Vite.
 * Runs a short-lived isolated Vite instance; never opens/saves a user's project.
 */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const port=process.env.EXO_RUST_GRAPHICS_QA_PORT || '5262'
const origin=`http://127.0.0.1:${port}`
const vite=spawn('./node_modules/.bin/vite',['--host','127.0.0.1','--port',port,'--strictPort'],{
 stdio:['ignore','pipe','pipe'],env:{...process.env,VITE_CLOTHCRAFT_BRIDGE_URL:'http://127.0.0.1:5385'}
})
let browser
try{
 let alive=false
 for(let i=0;i<90;i++){
  if(vite.exitCode!=null)throw new Error('Vite exited before browser QA')
  try{const response=await fetch(`${origin}/graphic-presets/exo-graphic-uv.wasm`);if(response.ok){assert.equal(response.headers.get('content-type')?.includes('wasm'),true,'WASM MIME type must be served correctly');alive=true;break}}catch{}
  await sleep(150)
 }
 if(!alive)throw new Error('Could not start isolated Vite server')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist']})
 const page=await browser.newPage()
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:30000})
 const result=await page.evaluate(async()=>{
  const lib=await import('/src/core/nativeGarmentGraphics.js')
  if(!(await lib.initRustGraphicUV()))throw Error('Rust graphic module did not activate')
  if(!lib.rustGraphicUVReady())throw Error('Rust UV module reports not ready')
  const graphic={id:'qa',name:'art',panel:'front',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',width:120,height:60,center:[.5,.58],scale:.44,rotation:35,positionMm:[175,230],widthMm:100,heightMm:50}
  const uv=lib.graphicPlacementInUV(graphic)
  const physical=lib.physicalGraphicPlacement(graphic,.4,.5)
  return{active:lib.rustGraphicUVReady(),u:uv.u,v:uv.v,physicalWidthUV:physical.widthUV,physicalY:physical.v,loadedWasm:performance.getEntriesByType('resource').some(x=>x.name.includes('exo-graphic-uv.wasm'))}
 })
 assert.equal(result.active,true)
 assert.equal(result.loadedWasm,true,'Browser must fetch the real WASM asset')
 assert.ok(Math.abs(result.u-.5)<1e-12 && Math.abs(result.v-.42)<1e-12)
 // positionMm is the graphic's TOP-LEFT; physical UV placement translates
 // the actual ink center by half the independently sized width and height.
 assert.ok(Math.abs(result.physicalWidthUV-.25)<1e-12 && Math.abs(result.physicalY-.49)<1e-12)
 assert.deepEqual(errors,[],'App page must have no uncaught JS errors')
 console.log(JSON.stringify({pass:true,source:'isolated Chromium + Vite',rustWasmLoaded:true,results:result},null,2))
}finally{
 await browser?.close()
 vite.kill('SIGTERM')
}
