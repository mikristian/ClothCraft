/** Acceptance of installed V2 graphic selection and physical sizing.
 * Every native write is redirected into an isolated temporary Rust session.
 */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const output=mkdtempSync(path.join(tmpdir(),'exo-installed-graphic-transform-'))
const port=5488,api=`http://127.0.0.1:${port}`,ui='http://127.0.0.1:5386'
const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
  cwd:root,detached:true,stdio:'ignore',
  env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),
    EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')},
})
const ready=async(url)=>{
  for(let i=0;i<90;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(800)})).ok)return}catch{}
    await new Promise(resolve=>setTimeout(resolve,180))
  }
  throw Error('Isolated test service unavailable: '+url)
}
let browser
try{
  await Promise.all([ready(api+'/health'),ready(ui)])
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1600,height:1000}})
  const errors=[],writes=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()}
    delete headers.origin
    try{writes.push(route.request().postDataJSON())}catch{}
    const response=await route.fetch({url:api+'/workspace',headers,timeout:35000})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'*'}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=graphicTransform20261025',{waitUntil:'domcontentloaded'})
  const board=page.locator('.cc-board svg[data-native-tool]')
  await board.waitFor({state:'visible',timeout:35000})
  await page.getByRole('tab',{name:'Graphic',exact:true}).click()
  const editor=page.locator('#cc-native-graphic-editor .cc-graphic-editor')
  await editor.waitFor()
  const art='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 240"><rect x="0" y="0" width="360" height="240" fill="#e35238"/></svg>'
  await editor.locator('input[type=file]').first().setInputFiles({name:'graphic-transform.svg',mimeType:'image/svg+xml',buffer:Buffer.from(art)})
  const graphic=page.locator('[data-2d-graphic-item]').first()
  await graphic.waitFor({state:'attached',timeout:20000})
  const id=await graphic.getAttribute('data-2d-graphic-item')
  await page.locator(`[data-graphic-transform-box="${id}"]`).waitFor({state:'attached'})
  const measure=page.locator(`[data-2d-graphic-measure-box="${id}"]`)
  const initial=Number(await measure.getAttribute('data-graphic-width-mm'))
  assert(initial>0)
  assert.equal(await measure.locator('text').count(),2)

  const bounds=await board.boundingBox()
  assert(bounds)
  const emptySpot=await page.evaluate(()=>{
    const svg=document.querySelector('.cc-board svg[data-native-tool]')
    const r=svg.getBoundingClientRect(),candidates=[]
    for(const y of [.15,.3,.45,.6,.75,.87])for(const x of [.14,.3,.44,.55,.7,.82]){
      const px=r.x+x*r.width,py=r.y+y*r.height,el=document.elementFromPoint(px,py)
      if(el===svg)return {x:px,y:py,tag:el.tagName,exact:true}
      if(svg.contains(el)&&!el.closest?.('[data-2d-graphic-item],[data-graphic-resize-handle]'))
        candidates.push({x:px,y:py,tag:el.tagName,exact:false})
    }
    return candidates[0]||null
  })
  assert(emptySpot,'No available non-graphic click position inside the board')
  console.log('Click-away target:',JSON.stringify(emptySpot))
  await page.mouse.click(emptySpot.x,emptySpot.y)
  await page.waitForFunction(id=>document.querySelector(`[data-2d-graphic-item="${id}"]`)?.getAttribute('data-graphic-selected')==='false',id,{timeout:7000})
  assert.equal(await page.locator(`[data-graphic-transform-box="${id}"]`).count(),0)
  await page.locator(`[data-2d-graphic-hit="${id}"]`).click()
  await page.locator(`[data-graphic-transform-box="${id}"]`).waitFor({state:'attached'})
  const slider=editor.getByRole('slider',{name:'Width slider (mm)'})
  await slider.waitFor({state:'visible'})
  await slider.focus()
  await slider.press('ArrowRight')
  await page.waitForFunction(({id,initial})=>Number(document.querySelector(`[data-2d-graphic-measure-box="${id}"]`)?.getAttribute('data-graphic-width-mm'))>initial,{id,initial},{timeout:8000})
  const slid=Number(await measure.getAttribute('data-graphic-width-mm'))

  const handle=page.locator(`[data-graphic-resize-handle="${id}:se"]`)
  const spot=await handle.boundingBox()
  assert(spot,'Resize handle')
  const x=spot.x+spot.width/2,y=spot.y+spot.height/2
  await page.mouse.move(x,y)
  await page.mouse.down()
  await page.mouse.move(x+30,y+20,{steps:12})
  await page.waitForFunction(({id,slid})=>Number(document.querySelector(`[data-2d-graphic-measure-box="${id}"]`)?.getAttribute('data-graphic-width-mm'))>slid,{id,slid},{timeout:5000})
  const preview=Number(await measure.getAttribute('data-graphic-width-mm'))
  await page.mouse.up()
  await page.waitForFunction(({id,slid})=>Number(document.querySelector(`[data-2d-graphic-measure-box="${id}"]`)?.getAttribute('data-graphic-width-mm'))>slid,{id,slid},{timeout:8000})
  assert.equal(errors.length,0,errors.join('; '))
  assert(writes.some(w=>w.op==='graphics-set'),'Native graphic persistence missing')
  console.log(JSON.stringify({pass:true,installed:true,graphicId:id,clickAwayDeselects:true,reselects:true,
    widthInitiallyMm:initial,afterSliderMm:slid,duringDragMm:preview,liveDimensionIncreases:true,
    nativeGraphicsSaved:true,pageErrors:errors.length,output}))
}finally{
  await browser?.close().catch(()=>{})
  try{process.kill(-child.pid,'SIGTERM')}catch{}
}
