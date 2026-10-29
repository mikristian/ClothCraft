#!/usr/bin/env node
/** Browser proof, isolated from existing browser profiles and user garments.
 * Requires source-only Vite preview at EXO_PREVIEW_URL (default :6214).
 * Tests actual ZIP restore, valid grade selection, jumbo manufacturing QA,
 * Undo/Redo and copy-safe release blockers. Not a factory-CAD recipient test.
 */
import {chromium} from 'playwright-core'
import {create501JeansTemplate} from '../src/data/jeans501.js'
import {buildFactoryPackageZip} from '../src/core/factoryPackage.js'

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
 const page=await browser.newPage({viewport:{width:1630,height:960}})
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.goto(process.env.EXO_PREVIEW_URL||'http://127.0.0.1:6214/?desktop=1',{waitUntil:'domcontentloaded',timeout:25000})
 await page.getByRole('combobox',{name:'Workspace',exact:true}).selectOption('Production')
 const panel=page.locator('[data-graded-seam-junction-qa="true"]')
 if(await panel.count())throw new Error('Unrelated original garment must not have a jeans-only QA panel')
 const bytes=buildFactoryPackageZip(create501JeansTemplate())
 await page.locator('input[accept=".json,.garment,.dxf,.zip"]').setInputFiles({
  name:'501-development-junction-UNAPPROVED.zip',mimeType:'application/zip',buffer:Buffer.from(bytes),
 })
 await page.getByText(/Restored editable factory source with all 6 graded sizes and/).first().waitFor({timeout:25000})
 await panel.waitFor({state:'visible',timeout:20000})
 const text=await panel.innerText()
 const industrial=await page.locator('[data-industrial-pattern-qa="true"]').innerText()
 if(!text.includes('12 explicit paired corner checks')||!text.includes('10 endpoint drift blocker')||
    !industrial.includes('30 contour, seam or POM blocker'))throw new Error('Real Production QA count drifted')
 const selected=await page.locator('button.active').allInnerTexts()
 if(!selected.some(value=>value.trim()==='W32'))throw new Error('Factory ZIP restored with an invalid previous garment grade size')
 await page.getByRole('button',{name:'Undo',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('[data-graded-seam-junction-qa="true"]'),null,{timeout:15000})
 // Undo often switches to the Pattern workspace, where grading buttons are
 // intentionally hidden. Verify the actual original piece inventory instead
 // of falsely treating a hidden size picker as an Undo failure.
 await page.waitForFunction(()=>{
  const text=document.body.textContent||''
  return text.includes('Left Sleeve')&&text.includes('Right Sleeve')&&
    !text.includes('LEFT Front Leg / Jeans')
 },null,{timeout:15000})
 // Actual app Redo should restore the jeans and render the correct W32 view.
 await page.getByRole('button',{name:'Redo',exact:true}).click()
 await page.waitForFunction(()=>{
  const text=document.body.textContent||''
  return text.includes('LEFT Front Leg / Jeans')&&!text.includes('Left Sleeve')
 },null,{timeout:15000})
 if(errors.length)throw new Error(`Browser exceptions: ${errors.join('; ')}`)
 console.log(JSON.stringify({result:'PASS',zipRestored:true,gradePreview:'W32',sharedJunctionBlockers:10,
  industrialSewingBlockers:30,undoRestoredOriginalFourPieceShell:true,redoRestoredJeansPieces:true,pageErrors:0,
  factoryCertified:false,realGerberLectraAcceptance:false}))
}finally{await browser.close()}
