// Exercise the signed V2 browser UI with an isolated Rust backend. Never send
// play/grab operations to the user's running native garment workspace.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--enable-webgl','--ignore-gpu-blocklist']})
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}})
  const errors=[],remote=[],operations=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{if(/cdn\.jsdelivr|storage\.googleapis/.test(request.url()))remote.push(request.url())})
  await page.route(/\/workspace$/,async route=>{
    try{operations.push(JSON.parse(route.request().postData()||'{}').op)}catch{}
    const response=await route.fetch({url:'http://127.0.0.1:5193/workspace',timeout:30000})
    await route.fulfill({response})
  })
  await page.route(/\/vision\/hand(?:\/status)?$/,async route=>{
    // The native Vision binary is exercised in its own integration test.
    // Keep this signed-UI test deterministic under heavy concurrent Rust
    // activity: verify only the provider switch and camera lifecycle here.
    const status=route.request().url().endsWith('/status')
    await route.fulfill({status:200,contentType:'application/json',
      headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:5386','Access-Control-Allow-Headers':'Content-Type'},
      body:JSON.stringify(status?{ok:true,available:true,provider:'apple-vision'}:{ok:true,provider:'apple-vision',landmarks:[]})})
  })
  await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft&qa=native-hand-camera-install',{waitUntil:'domcontentloaded',timeout:60000})
  await page.locator('[data-native-clothcraft="true"]').waitFor({timeout:40000})
  const control=page.getByRole('button',{name:'Camera Fabric Hand',exact:true})
  await control.waitFor({state:'visible',timeout:15000})
  assert.equal(await page.locator('.clo-corner-toolkit-3d [data-tool-family="camera-hand"] > button').count(),1,'Camera Hand belongs in the existing 3D toolbar')
  await control.click()
  assert.equal(await page.locator('.cc-viewport-3d .cc-scene > [data-draggable-camera-widget="true"]').count(),1,'Camera preview must float inside the 3D viewport')
  await page.waitForFunction(()=>['ready','error'].includes(document.querySelector('[data-camera-hand-state]')?.dataset.cameraHandState),null,{timeout:30000})
  await page.waitForTimeout(200)
  await page.getByLabel('Hand tracking provider').selectOption('apple-vision')
  await page.waitForFunction(()=>{
    const panel=document.querySelector('[data-camera-hand-state]')
    return panel&&(panel.dataset.cameraHandState==='error'||(panel.dataset.cameraHandState==='ready'&&panel.innerText.includes('Apple Vision camera ready')))
  },null,{timeout:30000})
  const provider=await page.locator('[data-camera-hand-state]').evaluate(element=>({state:element.dataset.cameraHandState,text:element.innerText}))
  assert.equal(provider.state,'ready',JSON.stringify(provider))
  await page.locator('.cc-viewport-3d').screenshot({path:'screenshots/qa-installed-v2-camera-fabric-hand-20261018.png'})
  await page.getByRole('button',{name:'Stop camera'}).click()
  assert.equal(await page.locator('[data-camera-hand-state]').count(),0)
  assert.deepEqual(remote,[])
  assert.deepEqual(errors,[])
  assert.ok(operations.includes('snapshot'))
  console.log('PASS installed V2 camera button, MediaPipe+Apple Vision switch, local resources, camera release, and isolated backend')
}finally{await browser.close()}
