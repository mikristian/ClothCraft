#!/usr/bin/env node
/** Isolated browser proof: unsafe factory DXF import cannot modify garment;
 * explicitly requested cut-only reference is read-only and not exportable as
 * a factory sewing package. Requires a Vite preview at EXO_PREVIEW_URL. */
import assert from 'node:assert/strict'
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {chromium} from 'playwright-core'
import {createTeeTemplate} from '../src/data/templates.js'
import {gradeProject} from '../src/core/grading.js'
import {projectToDxf} from '../src/core/dxf.js'

const directory=mkdtempSync(join(tmpdir(),'exo-manufacturing-ui-'))
const file=join(directory,'unapproved-foundation-tee-M.dxf')
writeFileSync(file,projectToDxf(gradeProject(createTeeTemplate(),'M'),'M',{cutlineMode:'manufacturing'}))
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try{
 const context=await browser.newContext({viewport:{width:1680,height:1000}})
 const page=await context.newPage()
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 const url=process.env.EXO_PREVIEW_URL||'http://127.0.0.1:6204/?desktop=1'
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000})
 const workspace=page.getByRole('combobox',{name:'Workspace',exact:true})
 await workspace.waitFor({timeout:20000});await workspace.selectOption('Production')
 const baseline=await page.locator('[data-industrial-pattern-qa="true"]').innerText()
 assert.match(baseline,/44 contour, seam or POM blocker/)
 // Generic importer MUST refuse a factory CUT/STITCH document; original
 // Essential Shell remains untouched, and Undo is not required.
 await page.locator('input[accept=".json,.garment,.dxf"]').setInputFiles(file)
 await page.getByText(/Import failed: Manufacturing DXF contains physical CUT and separate STITCH lines/).first().waitFor({timeout:15000})
 const afterRefusal=await page.locator('[data-industrial-pattern-qa="true"]').innerText()
 assert.match(afterRefusal,/44 contour, seam or POM blocker/)
 // User explicitly selects a physical-CUT reference, never editable pattern.
 await page.locator('input[accept=".dxf"]').setInputFiles(file)
 await page.getByText(/Imported 4 locked, CUT-only manufacturing reference shapes \(M\)/).first().waitFor({timeout:20000})
 // No false production-ready ZIP must be created from reference geometry.
 await page.getByRole('button',{name:/EXPORT FACTORY PACKAGE · ZIP/}).click()
 await page.getByText(/Factory package blocked: Factory package refused/).first().waitFor({timeout:10000})
 await page.getByRole('button',{name:/EXPORT DXF ·/}).click()
 await page.getByText(/DXF export blocked: DXF export refused/).first().waitFor({timeout:10000})
 assert.equal(errors.length,0,JSON.stringify(errors))
 console.log(JSON.stringify({status:'PASS',originalGarmentPreserved:true,manufacturingDefaultImportRejected:true,explicitCutReferenceLocked:true,manufacturingReferenceFactoryZipDenied:true,manufacturingReferenceDxfDenied:true,pageErrors:errors.length,factoryCertified:false}))
}finally{await browser.close();rmSync(directory,{recursive:true,force:true})}
