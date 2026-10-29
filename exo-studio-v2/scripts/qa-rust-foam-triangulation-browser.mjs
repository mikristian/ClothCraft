import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const url = process.env.EXO_SOURCE_URL || 'http://127.0.0.1:5297/'
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page = await browser.newPage()
  await page.goto(url, {waitUntil:'domcontentloaded'})
  const result = await page.evaluate(async () => {
    const wasm = await import('/src/core/rustFoamTriangulationKernel.js')
    const geometry = await import('/src/core/foamPaddingGeometry.js')
    const svg = await import('/src/core/foamPaddingPatternExport.js')
    const initialized = await wasm.initializeRustFoamTriangulationKernel()
    const square = [[0,0],[8,0],[8,8],[0,8]]
    const triangles = wasm.rustFoamTriangulate(square)
    const shape = geometry.createFoamPaddingGeometry({points:square,depthCm:1.2,edgeWidthCm:.2})
    const exported = svg.exportFoamPaddingSvg({points:square.map(([x,y])=>({x,y})),widthCm:12,heightCm:12,depthCm:1.2,edgeWidthCm:.2})
    const invalid = geometry.createFoamPaddingGeometry({points:[[0,0],[8,8],[0,8],[8,0]],depthCm:1,edgeWidthCm:.2})
    return {initialized,status:wasm.rustFoamTriangulationStatus(),triangles,shapeValid:shape.valid,
      bottomIndices:shape.meshes?.bottom?.indices,svgIncludesCut:exported.includes('foam-cut-line'),invalidCode:invalid.error?.code}
  })
  assert.equal(result.initialized,true,JSON.stringify(result.status))
  assert.equal(result.status.backend,'rust-wasm')
  assert.deepEqual(result.triangles,[3,0,1,1,2,3])
  assert.equal(result.shapeValid,true)
  assert.deepEqual(result.bottomIndices,[1,0,3,3,2,1])
  assert.equal(result.svgIncludesCut,true)
  assert.equal(result.invalidCode,'DEGENERATE_AREA')
  console.log(JSON.stringify({pass:true,url,backend:result.status.backend,topology:result.triangles,svg:true,errorPriority:true}))
} finally {await browser.close()}
