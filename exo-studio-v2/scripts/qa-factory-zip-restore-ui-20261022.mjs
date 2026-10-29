#!/usr/bin/env node
/** Browser smoke: corrupt ZIP cannot replace the current user's garment;
 * valid source restoration is exact, verifiable, and undoable.
 */
import {chromium} from 'playwright-core'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {unzipSync,zipSync,strToU8} from 'fflate'
import {createTeeTemplate} from '../src/data/templates.js'
import {buildFactoryPackageZip} from '../src/core/factoryPackage.js'

const temp=mkdtempSync(join(tmpdir(),'exo-restore-ui-'))
const good=join(temp,'foundation-tee-integrity-v2.zip')
const corrupt=join(temp,'foundation-tee-tampered.zip')
const zip=buildFactoryPackageZip(createTeeTemplate())
writeFileSync(good,zip)
const files=unzipSync(zip)
files['garment-source.json']=strToU8('"altered source without matching checksum"')
writeFileSync(corrupt,zipSync(files,{level:6}))
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const status={result:'PASS',badArchiveRejected:false,garmentPreserved:false,validArchiveRestored:false,undoPreservesLegacy:false,factoryCertified:false,pageErrors:[]}
try{
 const context=await browser.newContext({viewport:{width:1650,height:990}})
 const page=await context.newPage()
 page.on('pageerror',error=>status.pageErrors.push(error.message))
 await page.goto(process.env.EXO_PREVIEW_URL||'http://127.0.0.1:6206/?desktop=1',{waitUntil:'domcontentloaded',timeout:25000})
 const workspace=page.getByRole('combobox',{name:'Workspace',exact:true})
 await workspace.waitFor({timeout:20000});await workspace.selectOption('Production')
 const qa=page.locator('[data-industrial-pattern-qa="true"]')
 await qa.waitFor({state:'visible',timeout:16000})
 const initial=await qa.innerText()
 if(!initial.includes('44 contour, seam or POM blocker'))throw new Error('Expected unchanged legacy Essential Shell baseline')
 await page.locator('input[accept=".json,.garment,.dxf,.zip"]').setInputFiles(corrupt)
 await page.getByText(/Import failed: Factory ZIP restoration refused: /).first().waitFor({timeout:16000})
 status.badArchiveRejected=true
 status.garmentPreserved=(await qa.innerText()).includes('44 contour, seam or POM blocker')
 if(!status.garmentPreserved)throw new Error('Corrupt ZIP replaced existing project unexpectedly')
 const action=page.getByRole('button',{name:'RESTORE FACTORY ZIP · VERIFIED EDITABLE SOURCE'})
 await action.waitFor({state:'visible',timeout:8000})
 await page.locator('input[accept=".json,.garment,.dxf,.zip"]').setInputFiles(good)
 await page.getByText(/Restored editable factory source with all 6 graded sizes and/).first().waitFor({timeout:25000})
 await page.waitForFunction(()=>document.querySelector('[data-industrial-pattern-qa="true"]')?.textContent?.includes('0 contour, seam or POM blocker'),null,{timeout:20000})
 status.validArchiveRestored=(await qa.innerText()).includes('84 stitched-edge size checks')
 if(!status.validArchiveRestored)throw new Error('Valid ZIP did not restore Foundation Tee 84 graded seam checks')
 await page.getByRole('button',{name:'Undo',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('[data-industrial-pattern-qa="true"]')?.textContent?.includes('44 contour, seam or POM blocker'),null,{timeout:16000})
 status.undoPreservesLegacy=true
 if(status.pageErrors.length)throw new Error('Browser page errors: '+status.pageErrors.join('; '))
 console.log(JSON.stringify(status))
}finally{await browser.close();rmSync(temp,{recursive:true,force:true})}
