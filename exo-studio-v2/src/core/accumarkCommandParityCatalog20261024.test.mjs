import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import vendor from '../../research/accumark-v10-playlist/ACCUMARK_TOOL_INDEX.json' with {type:'json'}
import {ACCUMARK_2D_COMMANDS} from './accumark2dCommandRegistry.js'
import {ACCUMARK_COMMAND_PARITY_CATALOG_20261024 as rows,
  ACCUMARK_COMMAND_PARITY_SUMMARY_20261024 as summary} from './accumarkCommandParityCatalog20261024.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
test('every original official reference is retained exactly once and not confused with an executable command',()=>{
 assert.equal(vendor.items.length,116)
 assert.equal(rows.filter(x=>x.sourceKind==='vendor_help_index').length,116)
 assert.deepEqual(rows.filter(x=>x.sourceKind==='vendor_help_index').map(x=>x.id),vendor.items.map(x=>x.source_id))
 assert.equal(new Set(rows.map(x=>x.id)).size,rows.length)
 assert.equal(summary.originalEXOEngineeringContracts,33)
 assert.equal(summary.routedEXOEngineeringContracts,30)
 assert.equal(summary.referenceOnlyEXOEngineeringContracts,3)
 assert.equal(summary.informationalReferences,rows.filter(x=>x.kind==='reference').length)
 assert(summary.actionableRecords>120)
})
test('every partial status has real executable EXO source and existing focused test',()=>{
 for(const row of rows.filter(x=>x.status==='partial')){
  assert(row.exoCode,'Missing source: '+row.id)
  assert(row.tests.length>0,'No focused test: '+row.id)
  assert(fs.existsSync(path.join(root,row.exoCode)),'Missing source file: '+row.id+' '+row.exoCode)
  for(const file of row.tests)assert(fs.existsSync(path.join(root,file)),'Missing test file: '+row.id+' '+file)
 }
})
test('every record names an official retrievable-style URL, limitation and truthful parity status',()=>{
 const accepted=new Set(['working','partial','missing','unverified','reference'])
 for(const row of rows){
  assert(accepted.has(row.status),'Invalid status '+row.id)
  assert(row.label?.trim()&&row.limitation?.trim(),'Missing context '+row.id)
  assert(/^https:\/\/(?:gerber-help\.lectra\.com|help\.gerbertechnology\.com|gerbertechnology\.com)\//.test(row.helpUrl),
    'Uncited or nonofficial vendor page '+row.id+' '+row.helpUrl)
  assert.equal(row.vendorParityTested,false,'Inferred vendor approval '+row.id)
  if(row.kind==='reference')assert.equal(row.status,'reference')
 }
 assert.equal(summary.licensedVendorApplicationParityRuns,0)
 assert.equal(summary.completeProductParityClaim,false)
 assert.equal(summary.counts.working,0,'Full vendor parity cannot be asserted without licensed vendor acceptance testing')
 assert.equal(Object.values(summary.counts).reduce((a,b)=>a+b),summary.actionableRecords)
})
test('vendor toolbox, AccuScan and PDS detail commands are accounted separately',()=>{
 const groups=new Map(rows.map(x=>[x.id,x]))
 assert(rows.filter(x=>x.id.startsWith('TB-')).length>=20)
 assert(rows.filter(x=>x.id.startsWith('SCAN-')).length>=7)
 assert(rows.filter(x=>x.id.startsWith('EXT-')).length>=10)
 assert.equal(groups.get('TB-12').label,'Fold Piece')
 assert.equal(groups.get('TB-12').status,'missing')
 assert.equal(groups.get('PDS-02').label,'Seam Swap')
 assert.equal(groups.get('EXT-07').label,'Pleat Fold Verification')
 assert.equal(groups.get('EXT-07').status,'missing')
})
test('all 33 EXO engineering contracts have a documented source link and a noncertifying route',()=>{
 assert.equal(ACCUMARK_2D_COMMANDS.length,33)
 for(const engineering of ACCUMARK_2D_COMMANDS){
  assert(engineering.sourceIds.length>0,engineering.id)
  for(const sourceId of engineering.sourceIds){
   const record=rows.find(x=>x.id===sourceId)
   assert(record,engineering.id+': '+sourceId)
   assert(record.contracts.some(c=>c.id===engineering.id),sourceId)
  }
 }
})
