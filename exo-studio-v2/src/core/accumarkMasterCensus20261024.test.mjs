import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import master from '../../research/accumark-v10-playlist/ACCUMARK_MASTER_VERIFIED_COMMAND_CENSUS_20261024.json' with {type:'json'}
import crawl from '../../research/accumark-v10-playlist/OFFICIAL_EXPANDED_COMMAND_CENSUS_20261024.json' with {type:'json'}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const exists=s=>fs.existsSync(path.join(root,s))
test('every discovered public help page has a noncertified, source-linked master entry',()=>{
 const official=new Set(crawl.pages.map(p=>p.url))
 assert.equal(official.size,crawl.pageCount)
 assert.equal(master.summary.officialHttpPageCount,crawl.pageCount)
 assert(master.summary.officialHttpPageCount>=481)
 assert(master.summary.totalUniqueAuditedRecords>500)
 assert.equal(new Set(master.records.map(r=>r.id)).size,master.records.length)
 assert(master.records.every(r=>r.vendorParityTested===false))
 for(const p of crawl.pages)
   assert(master.records.some(r=>r.helpUrl===p.url&&r.officialHttpChecked),
     'Verified official help omitted: '+p.relativePath)
})
test('status count reflects only actions and workflows, not informational menu reference surfaces',()=>{
 const active=master.records.filter(x=>x.kind!=='reference')
 const ref=master.records.filter(x=>x.kind==='reference')
 assert.equal(active.length,master.summary.actionWorkflowRecords)
 assert.equal(ref.length,master.summary.informationalMenuReferenceRecords)
 for(const status of ['partial','missing','unverified']){
  assert.equal(active.filter(x=>x.status===status).length,master.summary.counts[status])
 }
 assert.equal(active.filter(x=>x.status==='working').length,0)
 assert.equal(master.summary.independentLicensedVendorApplicationComparativeRuns,0)
 assert.equal(master.summary.exhaustiveForLicensedGerberV2026_1,false)
})
test('all 10 official UI images, 39 reviewed frames, contact sheets and storyboard source files are actually present',()=>{
 assert.equal(master.summary.savedOfficialScreenshotFiles,10)
 assert.equal(master.summary.reviewedVideoFrames,39)
 for(const image of master.screenshotTextLedger)assert(exists(image.imagePath),image.imagePath)
 for(const frame of master.videoFrameCorpus.reviewedFrames)
   assert(exists('research/accumark-v10-playlist/'+frame.frame_path),frame.frame_path)
 let sheets=0
 for(const video of master.videoFrameCorpus.videoItems){
  for(let i=0;i<video.spriteSheets;i++){
   const file='research/accumark-v10-playlist/storyboards/'+video.videoId+'/sprite-'+String(i).padStart(3,'0')+'.jpg'
   assert(exists(file),file)
   sheets++
  }
  if(video.contactSheet)assert(exists('research/accumark-v10-playlist/'+video.contactSheet),video.videoId)
 }
 assert.equal(sheets,master.summary.storyboardSheetFiles)
 assert.equal(sheets,556)
 assert(master.summary.nominalSampledFrameSlots>=11093)
})
test('every claimed readable screenshot and EXO partial test physically exists in this repository',()=>{
 for(const row of master.records){
  for(const screenshot of row.officialScreenshotEvidence||[])
   assert(exists(screenshot),'Missing screenshot '+row.id)
  if(row.status==='partial'){
   assert(row.exoCode && exists(row.exoCode),'Untested code '+row.id)
   assert(row.tests.length,'Missing test link '+row.id)
   for(const t of row.tests)assert(exists(t),'Missing regression '+row.id+': '+t)
  }
 }
 assert.equal(master.summary.reviewedVideoFrameCommandLabelsVerified,0)
})
test('machine export and full readable report agree with the master record IDs and counts',()=>{
 const csv=fs.readFileSync(path.join(root,'research/accumark-v10-playlist/ACCUMARK_MASTER_VERIFIED_COMMAND_CENSUS_20261024.csv'),'utf8')
 const markdown=fs.readFileSync(path.join(root,'docs/reports/ACCUMARK_MASTER_VERIFIED_COMMAND_CENSUS_20261024.md'),'utf8')
 assert.equal(csv.split('\n').filter(Boolean).length,master.records.length+1)
 for(const record of master.records){
  assert(csv.includes(record.id),record.id+' missing CSV')
  assert(markdown.includes('| '+record.id+' |'),record.id+' missing report')
 }
 assert(markdown.includes('not the full licensed Gerber AccuMark'))
 assert(markdown.includes('zero command-level labels')||markdown.includes('zero command-level labels were safely'))
})
