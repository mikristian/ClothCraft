#!/usr/bin/env node
// Browser acceptance QA for the standalone EXO Techpack Studio.
// Run only after the development server has been confirmed ready by the prime agent.
import assert from 'node:assert/strict'
import {mkdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {dirname,resolve} from 'node:path'
import {chromium} from 'playwright-core'

const url=process.env.TECHPACK_QA_URL||'http://127.0.0.1:6288/'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const screenshot=resolve(root,'qa/techpack-qa.png')
const key='exo-techpack-studio-v1'
const chrome=process.env.TECHPACK_QA_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const report=(message)=>console.log('[techpack QA]',message)
const fail=(message)=>{console.error('[techpack QA]',message);process.exitCode=1}

async function main(){
 // A single availability probe prevents unnecessary resident Chrome processes.
 let response
 try{response=await fetch(url,{signal:AbortSignal.timeout(3000)})}
 catch(error){fail('Server is not running at '+url+' ('+error.message+'). Start it once, then rerun QA.');return}
 if(!response.ok){fail('Server returned HTTP '+response.status+' at '+url);return}

 let browser
 try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-first-run','--no-default-browser-check']})
  const context=await browser.newContext({viewport:{width:1500,height:1000},acceptDownloads:true})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(url,{waitUntil:'domcontentloaded'})
  await page.locator('.brand').waitFor()
  await page.getByRole('navigation',{name:'Techpack workspaces'}).getByRole('button',{name:'Document builder'}).click()
  await page.locator('.sheet-section.type-overview').waitFor()
  assert.equal(await page.locator('.sheet-section.type-bom').count(),1)
  report('Editor visible')

  const readPack=()=>page.evaluate(storageKey=>{
   const state=JSON.parse(localStorage.getItem(storageKey)||'null')
   return state?.packs?.find(p=>p.id===state.currentId)
  },key)
  const initial=await readPack()
  assert.ok(initial?.bom?.length)

  await page.getByRole('button',{name:'Add document block'}).click()
  await page.getByRole('dialog',{name:'Insert a document widget'}).getByRole('button',{name:/Rich text \/ notes/}).click()
  await page.waitForFunction(storageKey=>{
   const state=JSON.parse(localStorage.getItem(storageKey)||'null')
   return state?.packs?.find(p=>p.id===state.currentId)?.blocks?.filter(b=>b.type==='notes').length===1
  },key)
  assert.equal(await page.locator('.sheet-section.type-notes').count(),1)
  report('Added notes block')

  const material=initial.bom[0]
  const newCost=Number(material.unitCost)+5
  const estimatedBefore=(await readPack()).bom.reduce((sum,row)=>sum+Number(row.qty)*Number(row.unitCost),0)
  await page.locator('.sheet-section.type-bom input[aria-label^="UNIT COST"]').first().fill(String(newCost))
  await page.waitForFunction(([storageKey,expected])=>{
   const state=JSON.parse(localStorage.getItem(storageKey)||'null')
   return Number(state?.packs?.find(p=>p.id===state.currentId)?.bom?.[0]?.unitCost)===expected
  },[key,newCost])
  const modified=await readPack()
  const estimatedAfter=modified.bom.reduce((sum,row)=>sum+Number(row.qty)*Number(row.unitCost),0)
  assert.ok(estimatedAfter>estimatedBefore,'BOM material cost should increase')
  const shownCost=await page.locator('.sheet-section.type-costing .cost-summary').innerText()
  assert.ok(shownCost.includes(estimatedAfter.toLocaleString('en-US',{style:'currency',currency:'USD'})),'Costing UI must reflect new BOM subtotal')
  report('BOM edit updates live costing')

  await page.locator('.top-actions').getByRole('button',{name:'Save version'}).click()
  await page.waitForFunction(storageKey=>{
   const state=JSON.parse(localStorage.getItem(storageKey)||'null')
   return state?.packs?.find(p=>p.id===state.currentId)?.revisions?.length>=1
  },key)
  report('Saved revision')

  await page.getByRole('button',{name:'Version history'}).click()
  const comment='QA review: verify seam allowance and trim supply'
  await page.getByRole('textbox',{name:'New comment'}).fill(comment)
  await page.getByRole('button',{name:'Comment',exact:true}).click()
  await page.getByText(comment,{exact:true}).waitFor()
  report('Posted factory comment')

  await page.getByRole('button',{name:'Samples & fit'}).click()
  const sample='QA proto fit sample'
  await page.locator('.field').filter({hasText:'ROUND'}).locator('input').first().fill(sample)
  await page.getByRole('button',{name:'Add sample round'}).click()
  await page.getByText(sample,{exact:true}).waitFor()
  report('Recorded sample round')

  const beforeReload=await readPack()
  assert.equal(beforeReload.comments.at(-1).text,comment)
  assert.equal(beforeReload.samples.at(-1).round,sample)
  await page.reload({waitUntil:'domcontentloaded'})
  await page.locator('.brand').waitFor()
  const restored=await readPack()
  assert.equal(restored.id,beforeReload.id)
  assert.equal(restored.blocks.length,initial.blocks.length+1)
  assert.equal(Number(restored.bom[0].unitCost),newCost)
  assert.equal(restored.revisions.length,1)
  assert.equal(restored.comments.at(-1).text,comment)
  assert.equal(restored.samples.at(-1).round,sample)
  report('Reload preserved all edits in isolated browser storage')

  const downloadPromise=page.waitForEvent('download')
  await page.getByRole('button',{name:'Export techpack'}).click()
  const download=await downloadPromise
  const stream=await download.createReadStream()
  const chunks=[]
  for await(const chunk of stream)chunks.push(chunk)
  const exported=JSON.parse(Buffer.concat(chunks).toString('utf8'))
  assert.equal(exported.format,'exo-techpack-studio')
  assert.equal(exported.pack.id,restored.id)
  assert.equal(exported.pack.comments.at(-1).text,comment)
  assert.equal(exported.pack.samples.at(-1).round,sample)
  assert.equal(exported.pack.revisions.length,1)
  assert.equal(Number(exported.pack.bom[0].unitCost),newCost)
  report('JSON download matches persisted pack')

  await page.getByRole('button',{name:'Document builder'}).click()
  await page.locator('.sheet-section.type-bom').scrollIntoViewIfNeeded()
  await mkdir(dirname(screenshot),{recursive:true})
  await page.screenshot({path:screenshot,fullPage:true,animations:'disabled'})
  assert.deepEqual(errors,[],'Page must have no uncaught browser errors')
  report('PASS: screenshot '+screenshot)
  await context.close()
 }finally{await browser?.close()}
}

main().catch(error=>fail(error.stack||String(error)))
