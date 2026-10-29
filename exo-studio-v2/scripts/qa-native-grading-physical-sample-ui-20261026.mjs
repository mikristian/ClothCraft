import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

// Existing Vite server only, disposable browser React mount; no user source edit.
const origin=process.env.EXO_QA_ORIGIN||'http://127.0.0.1:5174'
const chrome=process.env.EXO_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const browser=await chromium.launch({headless:true,executablePath:chrome})
try{
 const page=await browser.newPage({acceptDownloads:true})
 const errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto(origin,{waitUntil:'domcontentloaded',timeout:16000})
 await page.evaluate(async()=>{
  const React=await import('/node_modules/.vite/deps/react.js')
  const ReactDOM=await import('/node_modules/.vite/deps/react-dom_client.js')
  const {default:Checklist}=await import('/src/components/NativeGradingReleaseChecklist20261025.jsx')
  const {createAccuMarkNativeRuleSet}=await import('/src/core/accumarkNativePointRuleSet20261023.js')
  const {createNativeGradingPOM20261025,inspectNativeGradingPOM20261025}=await import('/src/core/nativeGradingPOM20261025.js')
  const snapshot={revision:73,template:{panels:[{id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d']}}],seams:[],fabrics:[]}}
  const rules=createAccuMarkNativeRuleSet(snapshot).ruleSet
  const created=createNativeGradingPOM20261025(snapshot,rules,{panelId:'front',fromPoint:0,toPoint:1,label:'Front width',toleranceMm:2})
  if(!created.ok)throw Error(created.reason)
  const rows=inspectNativeGradingPOM20261025(snapshot,rules,[created.definition]).rows
  const defined={...created.definition,targetsMm:Object.fromEntries(rows.map(row=>[row.size,row.actualMm]))}
  const host=document.createElement('div')
  host.id='sample-factory-qa'
  host.style.cssText='position:fixed;inset:0;overflow:auto;z-index:2147483000;background:#20272a'
  document.body.appendChild(host)
  const root=(ReactDOM.createRoot||ReactDOM.default.createRoot)(host)
  const cutProof={format:'exo-native-graded-cutlines.v1',sourceRevision:snapshot.revision,revision:snapshot.revision,
    manufacturerReady:false,cuttingAuthorized:false,
    structuralAudit:{ok:true,sourceRevision:snapshot.revision,sourceTemplate:structuredClone(snapshot.template),
      sourceRuleSet:structuredClone(rules),verifiedSizes:['XS','S','M','L','XL','XXL'],
      authoritativeRust:false,independentlyVerified:false,cuttingAuthorized:false,approvedForSizing:false},
    sizes:['XS','S','M','L','XL','XXL'].map(size=>({
      size,panels:[{panel_id:'front',cut:{area_m2:.075,notches:[]}}],
      seams:[{seam_id:'none',mismatch_m:0}]}))}
  const render=definitions=>root.render((React.createElement||React.default.createElement)(Checklist,
    {snapshot,ruleSet:rules,pomDefinitions:definitions,nativeCatalog:null,
     onRequestNativeCutInspection:async()=>window.__sampleQa.staleCut?
       {...cutProof,sourceRevision:snapshot.revision-1}:cutProof}))
  window.__sampleQa={showComplete:()=>render([defined]),snapshot,rules,defined,staleCut:false}
  render([created.definition])
 })
 const host=page.locator('#sample-factory-qa')
 const button=host.getByRole('button',{name:'Download source-linked six-size physical sample worksheet'})
 await button.waitFor({timeout:7000})
 assert(await button.isDisabled(),'Incomplete target run should disable export')
 assert.match(await host.innerText(),/Sewn-sample review blocked/)
 await page.evaluate(()=>window.__sampleQa.showComplete())
 await button.waitFor({state:'visible'})
 await assert.doesNotReject(()=>button.isEnabled())
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Download source-linked six-size physical sample worksheet"]')?.disabled)
 const downloadPromise=page.waitForEvent('download',{timeout:8000})
 await button.click()
 const download=await downloadPromise
 assert.match(download.suggestedFilename(),/^exo-physical-sewn-sample-worksheet-r73-NOT-APPROVED\.csv$/)
 const returnedCsv=await page.evaluate(async()=>{
  const {exportNativeGradingPhysicalSampleWorksheet20261026}=await import('/src/core/nativeGradingPhysicalSampleReview20261026.js')
  const {snapshot,rules,defined}=window.__sampleQa
  const {csv}=exportNativeGradingPhysicalSampleWorksheet20261026(snapshot,rules,[defined])
  return csv.trim().split('\r\n').map((line,index)=>{
   if(!index)return line
   const cells=line.slice(1,-1).split('","')
   cells[9]=`real-specimen-${cells[4]}`
   cells[10]='Sewn sample facility'
   cells[11]='Sample operator'
   cells[12]='Calibrated ruler 100mm'
   cells[13]='2026-10-26'
   cells[14]=`report-${cells[4]}.pdf`
   cells[15]=cells[7]
   return '"'+cells.join('","')+'"'
  }).join('\r\n')+'\r\n'
 })
 const input=host.getByRole('button',{name:'Download source-linked six-size physical sample worksheet'})
 assert(await input.isEnabled())
 const upload=host.getByLabel('Import completed six-size factory measurement worksheet')
 const inspectCuts=host.getByRole('button',{name:'Inspect all six native graded physical CUT outlines'})
 await inspectCuts.click()
 await host.locator('[data-native-cut-size-count="6"]').waitFor({timeout:8000})
 assert.equal(await host.getByRole('table',{name:'Native six-size graded CUT geometry inspections'}).locator('tbody tr').count(),6)
 const reviewButton=host.getByRole('button',{name:'Download independent six-size factory review request'})
 assert.equal(await reviewButton.isEnabled(),true)
 assert.equal(await host.getByLabel('Import independently signed grading manufacturing review').isDisabled(),true)
 assert.match(await host.locator('[data-native-review-trust-not-configured]').innerText(),/No trusted keys are bundled/)
 const reviewDownloadPromise=page.waitForEvent('download',{timeout:8000})
 await reviewButton.click()
 const reviewDownload=await reviewDownloadPromise
 assert.match(reviewDownload.suggestedFilename(),/^exo-native-grade-independent-review-r73-NOT-APPROVED\.json$/)
 await page.evaluate(()=>{window.__sampleQa.staleCut=true})
 await inspectCuts.click()
 await host.locator('[data-native-cut-error="true"]').waitFor({timeout:8000})
 assert.match(await host.locator('[data-native-cut-error="true"]').innerText(),/source revision changed/)
 await upload.setInputFiles({name:'factory-returned.csv',mimeType:'text/csv',buffer:Buffer.from(returnedCsv)})
 await host.locator('[data-factory-sample-import="parsed-unverified"]').waitFor({timeout:8000})
 assert.match(await host.locator('[data-factory-sample-import="parsed-unverified"]').innerText(),/Parsed 6 sample measurements across 6 sizes/)
 assert.match(await host.innerText(),/Factory signature and physical specimens remain UNVERIFIED/)
 const staleCsv=returnedCsv.replace(/"[a-f0-9]{64}"/,`"${'0'.repeat(64)}"`)
 await upload.setInputFiles({name:'tampered.csv',mimeType:'text/csv',buffer:Buffer.from(staleCsv)})
 await host.locator('[data-factory-sample-import="blocked"]').waitFor({timeout:8000})
 assert.match(await host.locator('[data-factory-sample-import="blocked"]').innerText(),/Worksheet rejected/)
 assert.match(await host.innerText(),/independent factory signature: NOT VERIFIED/)
 assert.deepEqual(errors,[])
 console.log('PASS grade release UI: six-size Rust CUT/stale guard, independent review request download, externally trusted key gate, blank sample CSV and measured import, stale SHA rejection, no factory approval')
}finally{await browser.close()}
