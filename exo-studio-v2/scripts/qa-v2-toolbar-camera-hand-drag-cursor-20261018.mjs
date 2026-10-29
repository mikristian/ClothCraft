// Live V2 UI + isolated native Rust session. The running signed-app garment
// remains untouched. Camera use is mocked, but canvas picking/grab is real.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,
  args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--enable-webgl','--ignore-gpu-blocklist']})
try{
  const page=await browser.newPage({viewport:{width:1440,height:940}})
  const errors=[],actions=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.addInitScript(()=>{
    window.__qaHandObservation={x:.27,y:.42,pinched:false}
    window.__exoFabricHandTrackerFactory=async()=>({
      detectForVideo:()=>{
        const hand=window.__qaHandObservation
        if(!hand)return {landmarks:[]}
        const landmarks=Array.from({length:21},()=>({x:.5,y:.5}))
        landmarks[0]={x:.5,y:.8};landmarks[5]={x:.43,y:.52}
        landmarks[9]={x:.5,y:.5};landmarks[17]={x:.66,y:.52}
        landmarks[8]={x:1-hand.x,y:hand.y}
        landmarks[4]={x:1-hand.x+(hand.pinched?.025:.24),y:hand.y}
        return {landmarks:[landmarks]}
      },
      close(){}
    })
  })
  await page.route(/\/workspace$/,async route=>{
    try{actions.push(JSON.parse(route.request().postData()||'{}').op)}catch{}
    const response=await route.fetch({url:'http://127.0.0.1:5193/workspace',timeout:30000})
    await route.fulfill({response})
  })
  await page.goto('http://127.0.0.1:5416/?desktop=1&engine=clothcraft&qa=toolbar-hand-drag-cursor',{waitUntil:'domcontentloaded',timeout:60000})
  await page.locator('[data-native-clothcraft="true"]').waitFor({timeout:45000})
  const trigger=page.getByRole('button',{name:'Camera Fabric Hand',exact:true})
  assert.equal(await trigger.count(),1)
  const toolbar=page.locator('.cc-corner-tool-host [data-tool-family="camera-hand"]')
  assert.equal(await toolbar.count(),1,'Camera Hand must be nested in 3D CLO toolbar')
  assert.equal(await toolbar.locator('> button').count(),1)
  await trigger.click()
  const widget=page.locator('.cc-scene > [data-draggable-camera-widget="true"]')
  await widget.waitFor({state:'visible',timeout:8000})
  await page.waitForFunction(()=>document.querySelector('[data-camera-hand-state]')?.dataset.cameraHandState==='ready',null,{timeout:18000})
  const before=await widget.boundingBox()
  const view=await page.locator('.cc-viewport-3d').boundingBox()
  console.log('camera viewer initial bounds',JSON.stringify({before,view}))
  assert.ok(Math.abs((before.x+before.width)-(view.x+view.width))<25,'Preview must dock to right corner')
  const heading=widget.getByLabel('Drag camera viewer')
  const headRect=await heading.boundingBox()
  await page.mouse.move(headRect.x+23,headRect.y+16)
  await page.mouse.down()
  await page.mouse.move(headRect.x-20,headRect.y-51,{steps:7})
  await page.mouse.up()
  const after=await widget.boundingBox()
  assert.ok(before.x-after.x>28&&before.y-after.y>28,'Dragging heading should reposition camera widget')
  assert.ok(after.x>=view.x-1&&after.y>=view.y-1,'Widget must stay within viewport')

  const send=async detail=>page.evaluate(payload=>{window.__qaHandObservation=payload},detail)
  await send({x:.27,y:.42,pinched:false})
  const cursor=page.locator('.cc-viewport-3d .cc-camera-fabric-cursor')
  const inspect=detail=>page.evaluate(payload=>{
    window.dispatchEvent(new CustomEvent('exo-clothcraft-camera-fabric-hand',{detail:payload}))
    const cursor=document.querySelector('.cc-viewport-3d .cc-camera-fabric-cursor')
    const canvas=document.querySelector('.cc-viewport-3d .cc-scene canvas')
    return {visible:cursor?.dataset.visible,grabbing:cursor?.dataset.grabbing,
      x:canvas?.dataset.cameraHandCursorX,grabSource:canvas?.dataset.fabricGrabSource}
  },detail)
  assert.equal((await inspect({x:.27,y:.42,tracking:true,pinched:false})).visible,'true')
  const canvas=page.locator('.cc-viewport-3d .cc-scene canvas').first()
  assert.equal((await inspect({x:.27,y:.42,tracking:true,pinched:false})).x,'0.2700')
  assert.equal(await cursor.evaluate(el=>getComputedStyle(el).pointerEvents),'none')
  await send({x:.65,y:.62,pinched:false})
  await page.waitForFunction(()=>document.querySelector('.cc-viewport-3d canvas')?.dataset.cameraHandCursorX==='0.6500',null,{timeout:6000})
  // Pick a real triangle under the camera cursor, start the native spring,
  // drag and release it. It must use /workspace op:'grab'.
  let pick=null
  for(let y=.18;y<.82&&!pick;y+=.07){
    for(let x=.18;x<.82;x+=.07){
      await send({x,y,pinched:true})
      await page.waitForTimeout(85)
      if(await canvas.getAttribute('data-fabric-grab-source')==='camera'){pick={x,y};break}
    }
  }
  assert.ok(pick,'No native garment surface found for camera hand pinch')
  assert.equal((await inspect({x:pick.x,y:pick.y,tracking:true,pinched:true})).grabbing,'true')
  await page.waitForTimeout(450)
  await send({x:Math.min(.92,pick.x+.045),y:pick.y+.04,pinched:true})
  await page.waitForTimeout(450)
  await send({x:pick.x,y:pick.y,pinched:false})
  await page.waitForTimeout(250)
  assert.equal(await canvas.getAttribute('data-fabric-grab-state'),'idle')
  assert.equal(await cursor.getAttribute('data-visible'),'true','Open fingers should leave mouse cursor visible')
  assert.equal(await cursor.getAttribute('data-grabbing'),'false')
  await send(null)
  await page.waitForFunction(()=>document.querySelector('.cc-camera-fabric-cursor')?.dataset.visible==='false',null,{timeout:6000})
  assert.ok(actions.filter(op=>op==='grab').length>=2,'Native Rust must receive grab and release')
  await page.screenshot({path:'screenshots/qa-v2-camera-hand-toolbar-widget-20261018.png'})
  await widget.getByRole('button',{name:'Stop camera'}).click()
  assert.equal(await widget.count(),0)
  assert.equal(await trigger.getAttribute('aria-pressed'),'false')
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({passed:true,toolbar:true,widgetDraggable:true,
    before:{x:Math.round(before.x),y:Math.round(before.y)},after:{x:Math.round(after.x),y:Math.round(after.y)},
    handCursor:true,nativeGrabCalls:actions.filter(op=>op==='grab').length,
    cameraReleased:true,pageErrors:errors}))
}finally{await browser.close()}
