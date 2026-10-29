/** Inspect the actual signed app's static UI at :5386. No garment edits. */
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const origin=process.env.EXO_QA_URL||'http://127.0.0.1:5386'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
const summary={origin,garment:{},widgets:[],errors:[]}
try{
  const page=await browser.newPage({viewport:{width:1510,height:960}})
  page.on('pageerror',error=>summary.errors.push(error.message))
  await page.goto(`${origin}/?desktop=1&engine=clothcraft&testSession=installed-garment-widgets`,{waitUntil:'domcontentloaded',timeout:60000})
  await page.locator('[data-native-clothcraft="true"]').waitFor({timeout:45000})
  const nav=page.getByRole('navigation',{name:'Library categories'})
  await nav.getByRole('button',{name:'Garment',exact:true}).click()
  const tile=page.locator('[data-library-hover-id="Garment:clo-male-tshirt"]')
  await tile.scrollIntoViewIfNeeded()
  await tile.hover()
  const preview=page.locator('[data-library-preview="Garment:clo-male-tshirt"]')
  await preview.waitFor({state:'visible',timeout:20000})
  await preview.locator('canvas').waitFor({state:'attached',timeout:20000})
  await page.waitForFunction(()=>document.querySelector('[data-library-preview="Garment:clo-male-tshirt"] canvas')?.dataset.previewStatus==='ready',null,{timeout:30000})
  const attrs=await preview.locator('canvas').evaluate(canvas=>({...canvas.dataset}))
  assert.equal(attrs.previewRenderMode,'clo-source-single-garment')
  assert.equal(attrs.previewViewCount,'1')
  assert.equal(attrs.previewCloneCount,'0')
  assert.equal(attrs.previewMeshCount,'7')
  assert.equal(attrs.previewTriangleCount,'6876')
  assert.equal(attrs.previewSourcePanelCount,'7')
  assert.equal(attrs.previewArrangement,'separated')
  assert.equal(new Set(attrs.previewRenderedPieceIds.split(',')).size,7)
  summary.garment={mode:attrs.previewRenderMode,panels:attrs.previewSourcePanelCount,clones:attrs.previewCloneCount,triangles:attrs.previewTriangleCount,arrangement:attrs.previewArrangement}

  await page.mouse.move(900,60)
  const cases=[['2d:B04','Check Sewing Length','sewing'],['2d:B05','Steam Brush','steam'],['2d:A17','Auto Grading','grading']]
  for(const [slot,title,kind] of cases){
    const button=page.locator(`button[data-clo-slot="${slot}"]`)
    assert.equal(await button.isDisabled(),false,`${slot} must be enabled`)
    await button.scrollIntoViewIfNeeded()
    await button.click()
    const floating=page.getByRole('dialog',{name:title})
    await floating.waitFor({state:'visible',timeout:12000})
    const before=await floating.boundingBox()
    assert.ok(before && before.width>240 && before.x>=0 && before.x+before.width<=1510,`${title} offscreen`)
    const header=floating.locator('.clo-floating-tool-header')
    const grip=await header.boundingBox()
    const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('.clo-floating-tool-header')!==null,{x:grip.x+grip.width/2,y:grip.y+grip.height/2})
    assert.equal(hit,true,`${title} header must be above previews and receive pointer input`)
    await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2)
    await page.mouse.down()
    await page.mouse.move(grip.x+grip.width/2+68,grip.y+grip.height/2+42,{steps:6})
    await page.mouse.up()
    const after=await floating.boundingBox()
    assert.ok(after.x-before.x>25 && after.y-before.y>14,`${title} drag did not reposition`)
    summary.widgets.push({title,kind,initial:[Math.round(before.x),Math.round(before.y)],dragged:[Math.round(after.x),Math.round(after.y)]})
    await floating.getByRole('button',{name:`Close ${title}`}).click()
    await floating.waitFor({state:'detached'})
  }
  assert.deepEqual(summary.errors,[])
  await page.close()
}finally{await browser.close()}
console.log(JSON.stringify({pass:true,...summary},null,2))
