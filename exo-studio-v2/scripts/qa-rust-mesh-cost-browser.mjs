import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'

// Isolated V2 source app/browser check. All operations use temporary values;
// no session or authored project is written.
const browser=await chromium.launch({headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try {
  const page=await browser.newPage({viewport:{width:1460,height:900}})
  await page.goto('http://127.0.0.1:5188/?desktop=1&testSession=rust-mesh-cost',
    {waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const meshKernel=await import('/src/core/rustMeshSelectionKernel.js')
    const mesh=await import('/src/core/meshSelection.js')
    const costKernel=await import('/src/core/rustFabricCostKernel.js')
    const [meshLoaded,costLoaded]=await Promise.all([
      meshKernel.initializeRustMeshSelectionKernel(),
      costKernel.initializeRustFabricCostKernel(),
    ])
    const face={a:5,b:12,c:19}
    const selection=mesh.mergeMeshFaceSelection(null,'front',3,face)
    const toggled=mesh.mergeMeshFaceSelection(selection,'front',3,face,true)
    const costs=costKernel.calculateFabricCosts([
      {lengthMeters:1.25,price:12,requested:3,placed:3,unused:0},
      {lengthMeters:.75,price:4,requested:2,placed:2,unused:0},
    ],[{start:0,count:2}])
    return {meshLoaded,costLoaded,meshStatus:meshKernel.rustMeshSelectionKernelStatus(),
      costStatus:costKernel.rustFabricCostKernelStatus(),selection,toggled,costs}
  })
  assert.equal(result.meshLoaded,true)
  assert.equal(result.costLoaded,true)
  assert.equal(result.meshStatus.ready,true)
  assert.equal(result.costStatus.backend,'rust-wasm')
  assert.deepEqual(result.selection.triangleIndices,[3])
  assert.deepEqual(result.selection.vertices,[5,12,19])
  assert.equal(result.toggled,null)
  assert.equal(result.costs.totals[0].materialCost,18)
  assert.equal(result.costs.totals[0].ready,true)
  console.log(JSON.stringify({pass:true,view:'EXO V2 browser mesh and manufacturing',...result}))
} finally { await browser.close() }
