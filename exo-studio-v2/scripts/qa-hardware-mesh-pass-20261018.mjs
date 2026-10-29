import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
try {
 const page=await browser.newPage({viewport:{width:1100,height:850}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5208/docs/qa/hardware-curved-20261018/harness.html')
 const results=await page.evaluate(async()=>{
  const {listHardwarePresets}=await import('/src/data/hardwarePresets.js')
  const {createProceduralHardwarePreview}=await import('/src/core/proceduralHardwarePreview.js')
  const THREE=await import('/node_modules/three/build/three.module.js')
  const results=[]
  for(const p of listHardwarePresets().filter(p=>!p.modelAsset)){
   const r=createProceduralHardwarePreview(p);let meshes=0,vertices=0
   r.object.traverse(o=>{if(o.isMesh){meshes++;const a=o.geometry.attributes.position?.array;vertices+=(a?.length||0)/3;if(a&&!Array.from(a).every(Number.isFinite))throw new Error(p.id+' nonfinite')}})
   if(!meshes||!vertices)throw new Error(p.id+' empty')
   if(r.setClosure){r.setClosure(0);r.setClosure(1);r.setRoll(true);r.setRoll(false)}
   results.push({id:p.id,meshes,vertices});r.dispose?.()
  }
  document.body.innerHTML='<div id="qa" style="width:440px;height:650px;background:#161b24"></div>'
  const React=await import('/node_modules/.vite/deps/react.js')
  const ReactDOM=await import('/node_modules/.vite/deps/react-dom_client.js')
  const {default:Preview}=await import('/src/components/PremiumHardware3DPreview.jsx')
  ReactDOM.default.createRoot(document.getElementById('qa')).render(React.default.createElement(Preview,{preset:listHardwarePresets().find(p=>p.id==='metal-jeans-zipper')}))
  return results
 })
 await page.locator('[data-model-status="loaded"]').waitFor({timeout:20000})
 await page.getByLabel('Zipper preview closure').fill('0.25')
 await page.getByLabel('Toggle zipper roll preview').click()
 assert.equal(await page.getByLabel('Toggle zipper roll preview').getAttribute('aria-pressed'),'true')
 await page.screenshot({path:'/tmp/exo-hardware-rolled-20261018.png'})
 await page.getByLabel('Toggle zipper roll preview').click()
 await page.screenshot({path:'/tmp/exo-hardware-straight-20261018.png'})
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({pass:true,results,zipperControls:true,errors},null,2))
} finally {await browser.close()}
