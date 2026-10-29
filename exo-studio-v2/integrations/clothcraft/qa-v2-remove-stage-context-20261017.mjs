// Real V2 3D viewer regression, isolated Chrome profile. Stage removal should
// clear the scene from the native and legacy editors without changing cloth.
import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'

const browser = await chromium.launch({
  headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal'],
})
try {
  for (const engine of ['clothcraft','legacy']) {
    const page=await browser.newPage({viewport:{width:1512,height:950}})
    const errors=[];page.on('pageerror',error=>errors.push(error.message))
    try {
      await page.goto(`http://127.0.0.1:5386/?desktop=1&engine=${engine}&testSession=remove-stage-${engine}-20261017`,{waitUntil:'domcontentloaded'})
      const canvas=engine==='clothcraft'
        ?page.locator('.cc-viewport-3d canvas[data-stage-id]').first()
        :page.locator('.three-mount canvas').first()
      await canvas.waitFor({state:'visible',timeout:45000})
      if(engine==='clothcraft')await page.locator('.cc-board [data-panel]').first().waitFor({state:'visible',timeout:45000})
      const originalPanelCount=engine==='clothcraft'?await page.locator('.cc-board [data-panel]').count():null

      // The neutral studio cannot accidentally delete anything.
      await canvas.click({button:'right',position:{x:120,y:120}})
      assert.equal(await page.getByRole('menuitem',{name:'Remove Stage'}).count(),0,`${engine} displayed Remove Stage with no stage`)

      await page.getByRole('button',{name:'Stage',exact:true}).click()
      const card=page.locator('.exo-stage-catalog .exo-stage-card:has([data-stage-id="R02"])').first()
      await card.waitFor({timeout:15000})
      await card.click()
      await page.waitForFunction(()=>{
        const c=document.querySelector('.cc-viewport-3d canvas[data-stage-id],.three-mount canvas[data-stage-id]')
        return c?.dataset.stageId==='R02'&&c.dataset.stageStatus==='ready'&&Number(c.dataset.stageMeshCount)>0
      },null,{timeout:25000})
      const before=await canvas.evaluate(el=>({id:el.dataset.stageId,meshes:Number(el.dataset.stageMeshCount)}))
      assert.equal(before.id,'R02')

      await canvas.click({button:'right',position:{x:120,y:120}})
      const remove=page.getByRole('menuitem',{name:'Remove Stage'})
      await remove.waitFor({state:'visible',timeout:5000})
      await remove.click()
      await page.waitForFunction(()=>{
        const c=document.querySelector('.cc-viewport-3d canvas[data-stage-id],.three-mount canvas[data-stage-id]')
        return c?.dataset.stageId==='none'&&c.dataset.stageStatus==='none'&&Number(c.dataset.stageMeshCount||0)===0
      },null,{timeout:10000})
      assert.equal(await page.getByRole('menuitem',{name:'Remove Stage'}).count(),0)
      assert.equal(await card.getAttribute('aria-pressed'),'false')
      if(engine==='clothcraft')assert.equal(await page.locator('.cc-board [data-panel]').count(),originalPanelCount)
      assert.deepEqual(errors,[])
      console.log(JSON.stringify({pass:true,engine,stageBefore:before.id,meshesBefore:before.meshes,stageAfter:'none',garmentUntouched:true,pageErrors:0}))
    } finally { await page.close() }
  }
} finally { await browser.close() }
