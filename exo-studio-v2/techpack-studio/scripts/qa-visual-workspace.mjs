#!/usr/bin/env node
// Isolated visual artboard workspace acceptance test. Runs against an already-running server.
import assert from 'node:assert/strict'
import {mkdir,readFile} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const url=process.env.TECHPACK_QA_URL||'http://127.0.0.1:6288/'
const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const log=(msg)=>console.log('[visual workspace QA]',msg)
const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAJkG1z8AAAAASUVORK5CYII=','base64')
const probe=await fetch(url,{signal:AbortSignal.timeout(3000)})
if(!probe.ok)throw new Error('Studio server not accessible: '+url)
let browser
try{
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-first-run']})
 const context=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true})
 const page=await context.newPage()
 const errors=[]
 page.on('pageerror',err=>errors.push(err.message))
 await page.goto(url,{waitUntil:'domcontentloaded'})
 await page.locator('.vb-workspace').waitFor({timeout:15000})
 const state=async()=>page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('exo-techpack-studio-v1'));return data.packs.find(p=>p.id===data.currentId)})
 await page.waitForFunction(()=>{const d=JSON.parse(localStorage.getItem('exo-techpack-studio-v1')||'null');return d?.packs?.find(p=>p.id===d.currentId)?.visualStudio?.boards?.length===6})
 const original=await state()
 const studio=()=>state().then(p=>p.visualStudio)
 assert.equal((await studio()).boards.length,6)
 log('Six horizontal factory artboards initialized')

 const originalBoardIds=(await studio()).boards.map(b=>b.id)
 const originalBom=JSON.stringify(original.bom)
 await page.getByRole('button',{name:'Portrait',exact:true}).click()
 assert.equal((await studio()).orientation,'portrait')
 assert.deepEqual((await studio()).boards.map(b=>b.id),originalBoardIds)
 await page.getByRole('button',{name:'Vertical flow'}).click()
 assert.equal((await studio()).flow,'vertical')
 await page.getByRole('button',{name:'Horizontal flow'}).click()
 await page.getByRole('button',{name:'Landscape',exact:true}).click()
 log('Portrait/landscape and horizontal/vertical transformations preserve boards')

 await page.getByRole('button',{name:/Factory grid/}).click()
 assert.equal((await studio()).template,'factory')
 assert.equal(JSON.stringify((await state()).bom),originalBom)
 await page.getByRole('button',{name:/Contrast/}).click()
 assert.equal((await studio()).template,'contrast')
 log('One-click design template swaps preserve BOM')

 const techBoard=page.locator('.vb-board-frame').nth(1)
 await techBoard.scrollIntoViewIfNeeded()
 const leaderBefore=(await studio()).boards[1].widgets.find(w=>w.type==='leader')
 assert.ok(leaderBefore,'Technical flat preset has live arrow widgets')
 const endHandle=techBoard.locator('.vb-widget.widget-leader').first().getByRole('button',{name:'Drag arrow end'})
 const endPosition=await endHandle.boundingBox()
 assert.ok(endPosition,'Leader end handle is visible')
 await page.mouse.move(endPosition.x+endPosition.width/2,endPosition.y+endPosition.height/2)
 await page.mouse.down()
 await page.mouse.move(endPosition.x+endPosition.width/2+22,endPosition.y+endPosition.height/2+16,{steps:6})
 await page.mouse.up()
 const leaderAfter=(await studio()).boards[1].widgets.find(w=>w.id===leaderBefore.id)
 assert.ok(Math.abs(leaderAfter.endX-leaderBefore.endX)>.01||Math.abs(leaderAfter.endY-leaderBefore.endY)>.01,'Arrow endpoint should move')
 log('Editable callout arrow endpoint drag persisted')

 const initialPom=(await state()).measurements.length
 await page.locator('.vb-board-frame').nth(2).getByRole('button',{name:'Add POM row'}).click()
 assert.equal((await state()).measurements.length,initialPom+1)
 const initialBOM=(await state()).bom.length
 await page.locator('.vb-board-frame').nth(3).getByRole('button',{name:'Add BOM row'}).click()
 assert.equal((await state()).bom.length,initialBOM+1)
 log('In-artboard spreadsheet adds POM/BOM rows to shared techpack data')

 const first=page.locator('.vb-board-frame').first()
 await first.scrollIntoViewIfNeeded()
 const grip=first.locator('.widget-header .vb-grip').first()
 const itemBefore=(await studio()).boards[0].widgets[0]
 const b=await grip.boundingBox()
 assert.ok(b,'Draggable widget handle exists')
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2)
 await page.mouse.down()
 await page.mouse.move(b.x+b.width/2+27,b.y+b.height/2+23,{steps:6})
 await page.mouse.up()
 await page.waitForTimeout(150)
 const itemAfter=(await studio()).boards[0].widgets[0]
 assert.ok(Math.abs(itemAfter.x-itemBefore.x)>.2||Math.abs(itemAfter.y-itemBefore.y)>.2,'Drag must alter widget normalized position')
 log('Header widget dragging persists coordinates')

 await page.getByRole('button',{name:'Callout note',exact:false}).click()
 assert.equal((await studio()).boards[0].widgets.length,4)
 await page.locator('.vb-widget.is-selected textarea[aria-label="Garment callout"]').fill('QA construction instruction')
 assert.ok((await studio()).boards[0].widgets.some(w=>w.content==='QA construction instruction'))
 log('Custom callout widget saves text')

 await page.getByRole('button',{name:/Assets/}).first().click()
 await page.locator('input[aria-label="Upload assets"]').setInputFiles({name:'seam-reference.png',mimeType:'image/png',buffer:photo})
 await page.waitForFunction(()=>{const d=JSON.parse(localStorage.getItem('exo-techpack-studio-v1'));return d.packs.find(p=>p.id===d.currentId).visualStudio.assets.length===1})
 assert.ok((await studio()).assets[0].src.startsWith('data:image/jpeg;base64,'))
 log('Central image library stores uploaded image')

 await page.getByRole('button',{name:/Widgets/}).click()
 await page.getByRole('button',{name:/Image \/ photo/}).first().click()
 await page.getByRole('button',{name:/Assets/}).first().click()
 await page.locator('.vb-assets button').first().click()
 const withPhoto=await studio()
 assert.ok(withPhoto.boards[0].widgets.some(w=>w.type==='photo'&&w.assetId===withPhoto.assets[0].id))
 log('Asset linked to draggable photo widget')

 const nextBoard=page.locator('.vb-board-frame').nth(1).locator('.vb-board')
 await page.locator('.vb-assets>button').first().dragTo(nextBoard,{targetPosition:{x:125,y:165}})
 const afterDrop=await studio()
 assert.ok(afterDrop.boards[1].widgets.some(w=>w.type==='photo'&&w.assetId===afterDrop.assets[0].id),'Dragging a photo from Assets should place it on a different board')
 log('Cross-artboard asset drag-and-drop creates a placed photo')

 await page.locator('.vb-toolbar-end').getByRole('button',{name:'Comment',exact:true}).click()
 await first.locator('.vb-board').click({position:{x:75,y:105}})
 assert.equal((await studio()).comments.length,1)
 await page.getByRole('textbox',{name:'Pinned comment text'}).fill('QA request: verify shoulder seam allowance')
 assert.equal((await studio()).comments[0].text,'QA request: verify shoulder seam allowance')
 log('Point-anchored factory feedback saves to local project')

 await page.locator('.vb-toolbar-end').getByRole('button',{name:/History/}).click()
 await page.getByRole('textbox',{name:'New revision label'}).fill('V2 - visual annotation review')
 await page.getByRole('button',{name:/Save version R/}).click()
 const saved=await state()
 assert.equal(saved.revisions.length,1)
 assert.equal(saved.revisions[0].label,'V2 - visual annotation review')
 assert.equal(saved.revisions[0].snapshot.visualStudio.comments.length,1)
 assert.equal(saved.revisions[0].snapshot.visualStudio.assets.length,1)
 log('Immutable revision includes visual board layout, assets and pinned comments')

 await page.getByRole('button',{name:'Close history'}).click()
 await page.reload({waitUntil:'domcontentloaded'})
 await page.locator('.vb-workspace').waitFor()
 const reopened=await state()
 assert.equal(reopened.visualStudio.template,'contrast')
 assert.equal(reopened.visualStudio.boards.length,6)
 assert.ok(reopened.visualStudio.boards[0].widgets.some(w=>w.content==='QA construction instruction'))
 assert.equal(reopened.visualStudio.comments[0].text,'QA request: verify shoulder seam allowance')
 assert.equal(reopened.revisions.length,1)
 log('Reload preserves custom widgets, layout, photos, comments and version history')

 await mkdir(resolve(dir,'qa'),{recursive:true})
 await page.screenshot({path:resolve(dir,'qa/visual-artboards-desktop.png'),animations:'disabled'})
 assert.deepEqual(errors,[])
 log('PASS / desktop screenshot saved')
 await context.close()
}catch(e){console.error('[visual workspace QA] FAIL:',e.stack||e);process.exitCode=1}
finally{await browser?.close()}
