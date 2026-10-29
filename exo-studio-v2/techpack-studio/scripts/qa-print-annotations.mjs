#!/usr/bin/env node
// Isolated browser QA of the actual SVG editor, responsive layout and print output.
import assert from 'node:assert/strict'
import {mkdir,stat} from 'node:fs/promises'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const origin=process.env.TECHPACK_QA_URL||'http://127.0.0.1:6288/'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const output=resolve(root,'qa')
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const key='exo-techpack-studio-v1'
const check=(label,value)=>{assert.ok(value,label);console.log('[techpack visual QA]',label)}

let browser
try{
 const probe=await fetch(origin,{signal:AbortSignal.timeout(2500)})
 assert.ok(probe.ok,`Studio unavailable at ${origin}`)
 await mkdir(output,{recursive:true})
 browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-first-run']})
 const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true})
 const page=await context.newPage()
 const errors=[]
 page.on('pageerror',err=>errors.push(err.message))
 await page.goto(origin,{waitUntil:'domcontentloaded'})
 const workspace=page.getByRole('navigation',{name:'Techpack workspaces'})
 await workspace.getByRole('button',{name:'Artwork & callouts'}).click()
 await page.locator('.tp-annotation-stage svg').waitFor({timeout:12000})
 const editor=page.locator('.tp-annotation')
 const getPack=()=>page.evaluate(k=>{const state=JSON.parse(localStorage.getItem(k));return state.packs.find(p=>p.id===state.currentId)},key)
 const original=await getPack()
 check('Annotation editor loaded with source points',original.annotations.length>=3)
 await editor.getByRole('button',{name:'Add pin'}).click()
 await editor.locator('.tp-annotation-stage svg').click({position:{x:140,y:120}})
 await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k));return s.packs.find(p=>p.id===s.currentId).annotations.length===4},key)
 check('New callout saves to the document',true)
 await editor.locator('.tp-annotation-inspector textarea').fill('Construction QA — confirm seam placement')
 check('Callout text edited', (await getPack()).annotations.at(-1).text==='Construction QA — confirm seam placement')
 const start=(await getPack()).annotations.at(-1)
 const pin=editor.locator('.tp-annotation-pin').last()
 const spot=await pin.boundingBox()
 assert.ok(spot)
 await page.mouse.move(spot.x+spot.width/2,spot.y+spot.height/2)
 await page.mouse.down()
 await page.mouse.move(spot.x+spot.width/2+30,spot.y+spot.height/2+40,{steps:5})
 await page.mouse.up()
 const moved=(await getPack()).annotations.at(-1)
 check('Dragging point changes material-normalized coordinates',Math.abs(moved.x-start.x)>0.005||Math.abs(moved.y-start.y)>0.005)
 await editor.getByRole('button',{name:'Add arrow'}).click()
 await editor.locator('.tp-annotation-stage svg').click({position:{x:190,y:135}})
 check('Directional arrow persisted',(await getPack()).annotations.some(a=>a.type==='arrow'&&a.toX!==undefined))
 const sample=resolve(root,'../public/hardware-thumbnails/black-matte-button.png')
 await editor.locator('input[type="file"]').setInputFiles(sample)
 await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k));return /^data:image\//.test(s.packs.find(p=>p.id===s.currentId).artwork||'')},key)
 check('Uploaded image saved as embedded artwork',(await getPack()).artwork.startsWith('data:image/png;base64,'))
 await workspace.getByRole('button',{name:'Document builder'}).click()
 await page.locator('.paper').waitFor()
 await page.emulateMedia({media:'print'})
 const hidden=await page.locator('.topbar').evaluate(el=>getComputedStyle(el).display)
 check('Print CSS removes editor controls',hidden==='none')
 const pdf=resolve(output,'techpack-print-a4.pdf')
 await page.pdf({path:pdf,printBackground:true,format:'A4',preferCSSPageSize:true})
 check('Print PDF generated',(await stat(pdf)).size>12000)
 await page.emulateMedia({media:'screen'})
 const mobile=await context.newPage()
 await mobile.setViewportSize({width:390,height:844})
 await mobile.goto(origin,{waitUntil:'domcontentloaded'})
 await mobile.getByRole('navigation',{name:'Techpack workspaces'}).getByRole('button',{name:'Document builder'}).click()
 await mobile.locator('.paper').waitFor({timeout:12000})
 check('Mobile editor loads',await mobile.locator('.sheet-section.type-overview').count()===1)
 const overflow=await mobile.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}))
 check('Mobile page has no horizontal document overflow',overflow.scroll<=overflow.width+2)
 await mobile.screenshot({path:resolve(output,'techpack-mobile.png'),animations:'disabled'})
 check('No page exceptions',errors.length===0)
 console.log(JSON.stringify({pass:true,artwork:true,annotatedPoints:(await getPack()).annotations.length,pdf,errors}))
 await context.close()
}catch(err){console.error('[techpack visual QA] FAIL',err.stack||String(err));process.exitCode=1}
finally{await browser?.close()}
