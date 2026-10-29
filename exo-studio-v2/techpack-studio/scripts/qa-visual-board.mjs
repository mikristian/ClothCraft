#!/usr/bin/env node
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {mkdir} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const url=process.env.TECHPACK_QA_URL||'http://127.0.0.1:6288/'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const KEY='exo-techpack-studio-v1'
const log=msg=>console.log('[board studio QA]',msg)
let browser
try{
 const ping=await fetch(url,{signal:AbortSignal.timeout(3000)})
 assert(ping.ok,'Visual studio development server must already be running')
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
 const context=await browser.newContext({viewport:{width:1560,height:980},acceptDownloads:true})
 const page=await context.newPage()
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto(url,{waitUntil:'domcontentloaded'})
 await page.locator('.vb-workspace').waitFor()
 const pack=()=>page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));return s.packs.find(p=>p.id===s.currentId)},KEY)
 await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k));return s?.packs?.find(p=>p.id===s.currentId)?.visualStudio?.boards?.length>=6},KEY)
 let original=await pack()
 assert.equal(original.visualStudio.boards.length,6)
 const ids=original.visualStudio.boards.map(b=>b.id)
 log('Six white artboards initialized and persisted')

 await page.locator('.vb-template-choices').getByRole('button',{name:/Factory grid/}).click()
 assert.equal((await pack()).visualStudio.template,'factory')
 assert.deepEqual((await pack()).visualStudio.boards.map(b=>b.id),ids)
 log('Template changes preserve all board identities')

 const orientation=page.getByRole('group',{name:'Board orientation'})
 await orientation.getByRole('button',{name:'Portrait'}).click()
 assert.equal((await pack()).visualStudio.orientation,'portrait')
 await orientation.getByRole('button',{name:'Landscape'}).click()
 assert.equal((await pack()).visualStudio.orientation,'landscape')
 const flow=page.getByRole('group',{name:'Artboard flow'})
 await flow.getByRole('button',{name:'Vertical flow'}).click()
 assert.equal((await pack()).visualStudio.flow,'vertical')
 await flow.getByRole('button',{name:'Horizontal flow'}).click()
 assert.equal((await pack()).visualStudio.flow,'horizontal')
 assert.deepEqual((await pack()).visualStudio.boards.map(b=>b.id),ids)
 log('Portrait/landscape and row/column switches retain board IDs')

 const firstId=ids[0]
 const initialWidgetCount=(await pack()).visualStudio.boards[0].widgets.length
 await page.locator('.vb-widget-options').getByRole('button',{name:/Callout note/}).click()
 await page.waitForFunction(([k,n])=>{const s=JSON.parse(localStorage.getItem(k));return s.packs.find(p=>p.id===s.currentId).visualStudio.boards[0].widgets.length===n},[KEY,initialWidgetCount+1])
 log('One-click callout widget inserted')
 const placed=(await pack()).visualStudio.boards[0].widgets.at(-1)
 const dragGrip=page.locator('#vb-'+firstId+' .vb-widget').last().locator('.vb-grip')
 await dragGrip.scrollIntoViewIfNeeded()
 const handle=await dragGrip.boundingBox()
 assert(handle,'Drag handle is visible')
 await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2)
 await page.mouse.down()
 await page.mouse.move(handle.x+handle.width/2+42,handle.y+handle.height/2+30,{steps:6})
 await page.mouse.up()
 const moved=(await pack()).visualStudio.boards[0].widgets.find(w=>w.id===placed.id)
 assert(moved.x!==placed.x||moved.y!==placed.y,'Widget positions should change on pointer drag')
 log('Drag handle repositions widget without regenerating IDs')

 await page.getByRole('button',{name:/Assets 0/}).click()
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/NkcAAAAASUVORK5CYII=','base64')
 await page.getByRole('textbox',{name:'Upload assets'}).count().catch(()=>{})
 await page.locator('input[type="file"][aria-label="Upload assets"]').setInputFiles({name:'QA garment reference.png',mimeType:'image/png',buffer:png})
 await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k));return s.packs.find(p=>p.id===s.currentId).visualStudio.assets.length===1},KEY)
 const asset= (await pack()).visualStudio.assets[0]
 assert(asset.src.startsWith('data:image/jpeg;base64,'))
 await page.locator('.vb-assets button').first().click()
 assert((await pack()).visualStudio.boards[0].widgets.some(w=>w.type==='photo'&&w.assetId===asset.id))
 const beforeDrop=(await pack()).visualStudio.boards[0].widgets.length
 await page.locator('.vb-assets button').first().dragTo(page.locator('#vb-surface-'+firstId),{targetPosition:{x:315,y:290}})
 await page.waitForFunction(([k,n])=>{const s=JSON.parse(localStorage.getItem(k));return s.packs.find(p=>p.id===s.currentId).visualStudio.boards[0].widgets.length===n},[KEY,beforeDrop+1])
 log('Asset uploaded, compressed, clicked and drag-dropped onto artboard')

 const sheet=(await pack()).visualStudio.boards.find(b=>b.kind==='spec')
 await page.locator('#vb-'+sheet.id).scrollIntoViewIfNeeded()
 await page.getByRole('spinbutton',{name:'A size M'}).fill('99.4')
 await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k));return String(s.packs.find(p=>p.id===s.currentId).measurements.find(m=>m.code==='A')?.values?.M)==='99.4'},KEY)
 log('Spec spreadsheet edits canonical garment POM')

 await page.locator('.vb-toolbar-end').getByRole('button',{name:'Comment',exact:true}).click()
 await page.locator('#vb-surface-'+sheet.id).click({position:{x:160,y:260}})
 await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k));return s.packs.find(p=>p.id===s.currentId).visualStudio.comments.length===1},KEY)
 await page.getByRole('textbox',{name:'Pinned comment text'}).fill('Proto sample 2: check chest tolerance')
 assert.equal((await pack()).visualStudio.comments[0].text,'Proto sample 2: check chest tolerance')
 log('Position-anchored comment on measurement artboard')

 await page.locator('.vb-history-button').click()
 const drawer=page.getByRole('dialog',{name:'Visual techpack revision history'})
 await drawer.getByRole('textbox',{name:'New revision label'}).fill('Proto fit V2')
 await drawer.getByRole('button',{name:/Save version R/}).click()
 await page.waitForFunction(k=>{const s=JSON.parse(localStorage.getItem(k));return s.packs.find(p=>p.id===s.currentId).revisions.length===1},KEY)
 const saved=await pack()
 assert.equal(saved.revisions[0].label,'Proto fit V2')
 assert.equal(saved.revisions[0].snapshot.visualStudio.comments[0].text,'Proto sample 2: check chest tolerance')
 assert.equal(saved.revisions[0].snapshot.visualStudio.boards.length,6)
 log('Revision snapshot captures board layout, asset and pinned feedback')
 await drawer.getByRole('button',{name:'Close history'}).click()

 await page.reload({waitUntil:'domcontentloaded'})
 await page.locator('.vb-workspace').waitFor()
 const restored=await pack()
 assert.equal(restored.visualStudio.template,'factory')
 assert.equal(restored.visualStudio.orientation,'landscape')
 assert.equal(restored.visualStudio.flow,'horizontal')
 assert.deepEqual(restored.visualStudio.boards.map(b=>b.id),ids)
 assert.equal(restored.visualStudio.assets.length,1)
 assert.equal(restored.visualStudio.comments.length,1)
 assert.equal(restored.revisions.length,1)
 assert.deepEqual(errors,[])
 await mkdir(resolve(root,'qa'),{recursive:true})
 await page.screenshot({path:resolve(root,'qa/visual-board-studio.png'),fullPage:false,animations:'disabled'})
 log('PASS: reload stability, no browser errors, screenshot saved')
 await context.close()
}catch(err){console.error('[board studio QA] FAIL:',err.stack||err);process.exitCode=1}
finally{await browser?.close()}
