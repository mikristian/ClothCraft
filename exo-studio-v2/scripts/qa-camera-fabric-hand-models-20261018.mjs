import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--enable-webgl','--ignore-gpu-blocklist']})
try{
  for(const test of [
    {name:'mediapipe',base:'http://127.0.0.1:5194'},
    {name:'apple-vision',base:'http://127.0.0.1:5416'},
  ]){
    const page=await browser.newPage({viewport:{width:900,height:660}})
    const errors=[],remote=[]
    page.on('pageerror',error=>errors.push(error.message))
    page.on('request',request=>{if(/cdn\.jsdelivr|storage\.googleapis/.test(request.url()))remote.push(request.url())})
    if(test.name==='apple-vision'){
      await page.addInitScript(()=>{
        window.__exoFabricHandTrackerFactory=async()=>({detectForVideo:()=>({landmarks:[]}),close(){}})
      })
      await page.route(/\/vision\/hand(?:\/status)?$/,async route=>{
        const response=await route.fetch({url:route.request().url().replace(/127\.0\.0\.1:\d+/,'127.0.0.1:5193'),timeout:30000})
        await route.fulfill({response})
      })
    }
    await page.goto(`${test.base}/docs/qa/camera-fabric-hand-20261018/harness.html`,{waitUntil:'domcontentloaded',timeout:30000})
    await page.getByRole('button',{name:'Camera Fabric Hand',exact:true}).click()
    await page.waitForFunction(()=>['ready','error'].includes(document.querySelector('[data-camera-hand-state]')?.dataset.cameraHandState),null,{timeout:30000})
    if(test.name==='apple-vision'){
      await page.getByLabel('Hand tracking provider').selectOption('apple-vision')
      await page.waitForFunction(()=>{
        const panel=document.querySelector('[data-camera-hand-state]')
        return panel&&(panel.dataset.cameraHandState==='error'||(panel.dataset.cameraHandState==='ready'&&panel.innerText.includes('Apple Vision camera ready')))
      },null,{timeout:30000})
      await page.waitForTimeout(600)
    }
    const state=await page.locator('[data-camera-hand-state]').evaluate(node=>({status:node.dataset.cameraHandState,text:node.innerText}))
    assert.equal(state.status,'ready',JSON.stringify(state))
    assert.deepEqual(remote,[],`${test.name}: remote models loaded`)
    assert.deepEqual(errors,[])
    await page.getByRole('button',{name:'Stop camera'}).click()
    assert.equal(await page.locator('[data-camera-hand-state]').count(),0)
    console.log(`PASS ${test.name}: local hand detector ready, no remote model requests, camera stopped cleanly`)
    await page.close()
  }
}finally{await browser.close()}
