// A small, read-only check for the signed EXO desktop/web coupling.
// It catches accidentally shipped development ports 5191/5193.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const base='http://127.0.0.1:5386'
const native='http://127.0.0.1:5385'
const health=await fetch(native+'/health',{signal:AbortSignal.timeout(6000)}).then(r=>r.json())
assert.equal(health.ok,true,'Signed EXO native bridge must be healthy')
assert.equal(health.nativeReady,true,'EXO native Rust backend must be ready')
// A release must restore actual authored 2D and 3D geometry. The workspace
// deliberately defaults to CPU VBD until GPU long-run physical parity passes;
// requiring GPU here would reject the safer installed runtime and roll back
// unrelated UI updates. Keep all geometry, WASM and browser checks below.
const snapshotResponse=await fetch(native+'/workspace',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({op:'snapshot'}),signal:AbortSignal.timeout(30000),
})
const snapshot=await snapshotResponse.json()
assert.equal(snapshotResponse.status,200,'Native saved garment startup failed: '+snapshot.error)
assert.equal(snapshot.ok,true,snapshot.error||'Native saved garment unavailable')
assert.match(snapshot.data?.backend||'',/ClothCraft (?:GPU|CPU) VBD \+ (?:CPU )?OGC/,
  'Signed desktop EXO V2 must start an identified Rust VBD + OGC solver')
assert.ok((snapshot.data?.panels||[]).length>=2,
  'Signed V2 must restore both authored 2D pattern panels')
assert.ok((snapshot.data?.triangles||[]).length>0,
  'Signed V2 must restore 3D garment triangles')
// Reject a web-only release that forgot the native-compatible Rust WASM asset.
const wasmResponse=await fetch(base+'/wasm/exo_fabric_kernel.wasm',
  {signal:AbortSignal.timeout(6000)})
assert.equal(wasmResponse.status,200,'Compiled Rust fabric WASM must ship with signed app')
const moduleResult=await WebAssembly.instantiate(await wasmResponse.arrayBuffer(),{})
assert.equal(moduleResult.instance.exports.exo_fabric_kernel_abi_version(),2,
  'Signed app must ship the current EXO Rust fabric ABI v2')
const geometryResponse=await fetch(base+'/wasm/exo_geometry_kernel.wasm',
  {signal:AbortSignal.timeout(6000)})
assert.equal(geometryResponse.status,200,'Signed EXO app must include compiled Rust CAD geometry')
const geometry=await WebAssembly.instantiate(await geometryResponse.arrayBuffer(),{})
assert.equal(geometry.instance.exports.exo_geometry_abi_version(),1,
  'Signed app must ship geometry ABI version 1')
assert.equal(geometry.instance.exports.exo_nearest_segment_t(2.5,3,0,0,10,0),.25,
  'Signed app must execute Rust CAD segment projection')

const browser=await chromium.launch({
  headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal'],
})
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}})
  const errors=[],badPorts=[],warnings=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('requestfailed',request=>{
    if(/127\.0\.0\.1:(5191|5193)\//.test(request.url()))badPorts.push(request.url())
  })
  page.on('console',message=>{
    if(message.text().includes('Texture marked for update but no image data found'))warnings.push(message.text())
  })
  await page.goto(base+'/?desktop=1&engine=clothcraft&testSession=signed-native-bridge-smoke',
    {waitUntil:'domcontentloaded',timeout:30000})
  // A cold, signed macOS Rust/WebGL startup can take longer than the warm
  // development test; continue demanding real pattern geometry and no errors.
  await page.locator('.cc-board [data-panel]').first().waitFor({state:'visible',timeout:45000})
  const sceneCanvas=page.locator('.cc-scene canvas').first()
  await sceneCanvas.waitFor({state:'visible',timeout:45000})
  const sceneDimensions=await sceneCanvas.evaluate(canvas=>({
    width:canvas.width,height:canvas.height,
    clientWidth:canvas.clientWidth,clientHeight:canvas.clientHeight,
  }))
  assert.ok(Object.values(sceneDimensions).every(value=>value>0),
    '3D viewport canvas must have a real onscreen rendering surface')
  const panels=await page.locator('.cc-board [data-panel]').count()
  const editor=await page.locator('body').innerText()
  assert.ok(panels>=1,'Native pattern board should show at least one panel')
  assert.doesNotMatch(editor,/Failed to fetch|NetworkError when attempting to fetch a resource/)
  assert.deepEqual(errors,[])
  assert.deepEqual(badPorts,[])
  assert.deepEqual(warnings,[])
  console.log(JSON.stringify({pass:true,nativeReady:true,backend:snapshot.data.backend,gpuSimulation:/GPU VBD/.test(snapshot.data.backend),rustFabricWasmAbi:2,
    rustGeometryWasmAbi:1,panels,triangles:snapshot.data.triangles.length,
    sceneCanvas:sceneDimensions,
    badPorts:0,pageErrors:0,textureWarnings:0}))
}finally{
  await browser.close()
}
