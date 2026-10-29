import assert from 'node:assert/strict'
import{chromium}from'playwright-core'
const origin=process.env.EXO_QA_ORIGIN||'http://127.0.0.1:5174'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--disable-gpu']})
const page=await browser.newPage({viewport:{width:1630,height:960}})
page.setDefaultTimeout(16000)
const errors=[];page.on('pageerror',e=>errors.push(e.message))
const record=(name,data)=>console.log('PASS',name,JSON.stringify(data))
try{
 await page.goto(origin+'/?engine=clothcraft&techpackWorkspace=1',{waitUntil:'domcontentloaded',timeout:30000})
 // The signed desktop app starts in the garment editor. Unlike Vite dev it
 // intentionally requires selecting Techpack through the real workspace menu.
 if(/:\/\/(?:127\.0\.0\.1|localhost):(?:5386|5486)\b/.test(origin)){
   const switcher=page.getByRole('button',{name:'Simulation, animation, print layout and Techpack modes'})
   const option=page.getByRole('menuitem',{name:/Techpack Workspace.*Specification pages/})
   await switcher.waitFor({state:'visible',timeout:25000})
   // Native app session/project hydration can replace the button tree once
   // after first paint. Retry the *real* menu action instead of assuming a
   // development URL flag is supported by the signed desktop bundle.
   for(let attempt=0;attempt<4;attempt++){
     if(await page.locator('[data-techpack-sheet="patterns"]').count())break
     if(!(await option.count()))await switcher.evaluate(node=>node.click())
     try{
       await option.waitFor({state:'visible',timeout:2000})
       await option.evaluate(node=>node.click())
       await page.locator('[data-techpack-sheet="patterns"]').waitFor({timeout:9000})
       break
     }catch{
       await page.waitForTimeout(400)
     }
   }
 }
 await page.locator('[data-techpack-sheet="patterns"]').waitFor({timeout:30000})
 await page.waitForFunction(()=>document.querySelectorAll('[data-techpack-sheet]').length>=19,null,{timeout:26000})
 await page.waitForTimeout(900)
 await page.getByRole('button',{name:'Add custom page'}).evaluate(n=>n.click())
 const custom=page.locator('[data-custom-blank="true"]').last()
 await custom.waitFor({timeout:12000})
 assert.equal(await custom.locator('[data-board-object]').count(),0)
 record('Blank custom artboard',await custom.getAttribute('data-techpack-sheet'))
 // Toolbar insert is available on all pages, not only dedicated Excel pages.
 await page.getByRole('button',{name:'Insert Excel table widget'}).evaluate(n=>n.click())
 const grid=custom.locator('.tps').first()
 await grid.waitFor({timeout:16000})
 const holder=custom.locator('[data-board-object^="box-"]').first()
 assert(await holder.count())
 record('Notion-like Excel table widget inside movable box',{columns:await grid.locator('th.tps-colhead').count()})
 await grid.locator('td').first().dblclick({force:true})
 await grid.locator('.tps-editor').first().fill('MATERIAL TEST')
 await grid.locator('.tps-editor').first().press('Enter')
 await page.waitForFunction(()=>document.querySelector('[data-custom-blank] .tps td')?.textContent?.trim()==='MATERIAL TEST')
 record('Grid cell editing',await grid.locator('td').first().innerText())
 // Universal selection, transform, context actions and double-click edit.
 await page.getByRole('button',{name:'Select tool'}).evaluate(n=>n.click())
 const handle=holder.locator('.tpws-object-transform-cover')
 await handle.click({force:true})
 await page.waitForTimeout(350)
 assert.equal(await holder.locator('[data-object-handle]').count(),8)
 record('Universal selection creates eight handles',8)
 await holder.click({button:'right',force:true})
 const menu=holder.getByRole('menu')
 assert(await menu.count())
 const duplicate=menu.getByRole('menuitem',{name:'Duplicate object'})
 await duplicate.click({force:true})
 await page.waitForFunction(()=>document.querySelectorAll('[data-custom-blank=true] [data-board-object^=box-]').length===2)
 record('Right click duplicate',await custom.locator('[data-board-object^=box-]').count())
 // Save explicitly-authored template.
 let prompts=0
 page.on('dialog',dialog=>{prompts++;dialog.accept('Reusable designer artboard')})
 await page.getByRole('button',{name:'Save template with my content'}).evaluate(n=>n.click())
 await page.waitForTimeout(220)
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('exo.techpack.user-templates.v1')||'[]'))
 assert(saved.some(p=>p.name==='Reusable designer artboard'&&p.contentMode==='authored'))
 record('Save artboard including authored content',saved.length)
 // New blank template generated from saved design.
 await page.getByRole('tab',{name:'Templates'}).click()
 await page.getByRole('button',{name:'Open Saved presets templates'}).click()
 const card=page.locator('.tpws-template-card').filter({hasText:'Reusable designer artboard'}).first()
 await card.waitFor()
 await card.getByRole('button',{name:'New artboard'}).evaluate(n=>n.click())
 await page.waitForFunction(()=>document.querySelectorAll('[data-custom-blank=true]').length>=2)
 record('Create new artboard from personal template',await page.locator('[data-custom-blank]').count())
 assert.equal(errors.length,0,errors.join('; '))
 record('No JS errors',errors.length)
}catch(e){console.error('FAIL UNIFIED_DESIGN_QA',e.message,'errors=',JSON.stringify(errors));process.exitCode=1}
finally{await browser.close()}
