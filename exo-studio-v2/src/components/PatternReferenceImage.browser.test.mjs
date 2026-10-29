// Isolated live 2D photo regression. This script runs against source Vite,
// with a disposable Chrome profile and no installed app or native build.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {chromium} from 'playwright-core'

const port=Number(process.env.EXO_PHOTO_QA_PORT||5597)
const url=`http://127.0.0.1:${port}`
const child=spawn('node_modules/.bin/vite',['--host','127.0.0.1','--port',String(port),'--strictPort'],{
  cwd:process.cwd(),stdio:'ignore',detached:true,
})
let browser
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9kK7oAAAAASUVORK5CYII=','base64')
const readImage=page=>page.locator('[data-2d-reference-image] image').first().evaluate(el=>({
  x:Number(el.getAttribute('x')),y:Number(el.getAttribute('y')),
  width:Number(el.getAttribute('width')),opacity:Number(el.getAttribute('opacity')),
}))
async function pointerDrag(page,locator,dx,dy){
  const rect=await locator.boundingBox()
  assert(rect&&rect.width>0&&rect.height>0,'Target must be visible')
  const x=rect.x+rect.width/2,y=rect.y+rect.height/2
  await page.mouse.move(x,y)
  await page.mouse.down()
  await page.mouse.move(x+dx,y+dy,{steps:9})
  await page.mouse.up()
}
try{
  let ready=false
  for(let n=0;n<100;n++){
    try{ready=(await fetch(url,{signal:AbortSignal.timeout(750)})).ok}catch{}
    if(ready)break
    if(child.exitCode!==null)throw Error(`Vite exited ${child.exitCode}`)
    await new Promise(r=>setTimeout(r,200))
  }
  assert(ready,`Photo QA Vite unavailable at ${url}`)
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const context=await browser.newContext({viewport:{width:1680,height:1050}})
  const page=await context.newPage(),errors=[]
  page.on('pageerror',err=>errors.push(err.message))
  await page.goto(url+'/?desktop=1&engine=legacy&testSession=photo-browser-20261029',{waitUntil:'domcontentloaded'})
  await page.locator('.pattern-canvas').waitFor({timeout:40000})
  const chooserPromise=page.waitForEvent('filechooser',{timeout:12000})
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-open-2d-background-image',{detail:{editor:'draft',action:'add'}})))
  await (await chooserPromise).setFiles({name:'photo-pointer-qa.png',mimeType:'image/png',buffer:image})
  const photo=page.locator('[data-2d-reference-image]').first()
  await photo.waitFor({timeout:20000})
  const source=await readImage(page)
  const handles=page.locator('[data-reference-overlay="true"] [data-reference-resize-handle]')
  assert.equal(await handles.count(),8,'Imported image should have eight foreground handles')
  const overlap=await page.locator('[data-reference-overlay="true"] [data-reference-resize-handle]').evaluateAll(nodes=>nodes.map(el=>{
    const r=el.getBoundingClientRect(),cx=r.x+r.width/2,cy=r.y+r.height/2
    const artwork=[...document.querySelectorAll('.pattern-fill')].find(pattern=>{
      const rect=pattern.getBoundingClientRect()
      return cx>=rect.x&&cx<=rect.right&&cy>=rect.y&&cy<=rect.bottom
    })
    return {handle:el.getAttribute('data-reference-resize-handle'),overlap:Boolean(artwork)}
  }))
  const overlapping=overlap.find(hit=>hit.overlap)
  assert(overlapping,`Expected at least one handle overlapping a pattern: ${JSON.stringify(overlap)}`)
  const target=page.locator(`[data-reference-overlay="true"] [data-reference-resize-handle="${overlapping.handle}"]`)
  const resizeHit=await target.evaluate(el=>{
    const r=el.getBoundingClientRect()
    return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el
  })
  assert(resizeHit,`${overlapping.handle} overlapping resize handle must receive a real DOM pointer hit`)
  const horizontal=overlapping.handle.includes('w')?-65:65
  const vertical=overlapping.handle.includes('n')?-38:38
  await pointerDrag(page,target,horizontal,vertical)
  const resized=await readImage(page)
  assert(resized.width>source.width,'Overlapping pointer resize should increase actual SVG width')
  // Move into unobstructed SVG space for a separate photo-body drag.
  await page.locator('[data-reference-controls="2d"] [aria-label="Reference X position in centimeters"]').fill('0')
  await page.locator('[data-reference-controls="2d"] [aria-label="Reference X position in centimeters"]').press('Tab')
  await page.locator('[data-reference-controls="2d"] [aria-label="Reference Y position in centimeters"]').fill('-240')
  await page.locator('[data-reference-controls="2d"] [aria-label="Reference Y position in centimeters"]').press('Tab')
  const positioned=await readImage(page)
  await page.getByRole('button',{name:'Close reference settings'}).click()
  await photo.locator('[data-2d-reference-hit]').evaluate(el=>{
    const x=Number(el.getAttribute('x'))+125,y=Number(el.getAttribute('y'))+90
    const p=el.ownerSVGElement.createSVGPoint();p.x=x;p.y=y
    const c=p.matrixTransform(el.ownerSVGElement.getScreenCTM())
    el.dataset.testMoveX=String(c.x);el.dataset.testMoveY=String(c.y)
  })
  const movePoint=await photo.locator('[data-2d-reference-hit]').evaluate(el=>({x:Number(el.dataset.testMoveX),y:Number(el.dataset.testMoveY),hit:document.elementFromPoint(Number(el.dataset.testMoveX),Number(el.dataset.testMoveY))===el}))
  assert(movePoint.hit,'Photo must receive a real DOM pointer hit before drag')
  await page.mouse.move(movePoint.x,movePoint.y)
  await page.mouse.down()
  await page.mouse.move(movePoint.x+32,movePoint.y+24,{steps:9})
  await page.mouse.up()
  const moved=await readImage(page)
  assert(moved.x>positioned.x&&moved.y>positioned.y,'Image pointer drag should change placement')
  const settings=page.getByRole('group',{name:'2D reference photo settings'})
  if(!await settings.isVisible())await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-open-2d-background-image',{detail:{editor:'draft',action:'open'}})))
  await settings.getByRole('slider',{name:'Reference image opacity'}).fill('31')
  await page.waitForFunction(()=>Math.abs(Number(document.querySelector('[data-2d-reference-image] image')?.getAttribute('opacity'))-.31)<.001)
  const edited=await readImage(page)
  await page.waitForTimeout(1000)
  await page.reload({waitUntil:'domcontentloaded'})
  await photo.waitFor({timeout:40000})
  const reloaded=await readImage(page)
  for(const key of ['x','y','width','opacity'])assert(Math.abs(reloaded[key]-edited[key])<.001,`${key} must survive a reload`)
  await page.close()
  const reopened=await context.newPage()
  await reopened.goto(url+'/?desktop=1&engine=legacy&testSession=photo-browser-20261029',{waitUntil:'domcontentloaded'})
  await reopened.locator('[data-2d-reference-image]').first().waitFor({timeout:40000})
  const restored=await readImage(reopened)
  for(const key of ['x','y','width','opacity'])assert(Math.abs(restored[key]-edited[key])<.001,`${key} must survive tab reopen`)
  assert.deepEqual(errors,[],'Photo QA must not generate runtime page errors')
  console.log(JSON.stringify({passed:true,import:true,handles:8,overlappingHandle:overlapping.handle,resize:{before:source.width,after:resized.width},move:{before:[positioned.x,positioned.y],after:[moved.x,moved.y]},opacity:edited.opacity,reload:true,reopen:true,errors},null,2))
}finally{
  await browser?.close().catch(()=>{})
  try{process.kill(-child.pid,'SIGTERM')}catch{}
}
