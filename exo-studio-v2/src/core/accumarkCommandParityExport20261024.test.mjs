import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {ACCUMARK_COMMAND_PARITY_CATALOG_20261024 as catalog,
 ACCUMARK_COMMAND_PARITY_SUMMARY_20261024 as summary} from './accumarkCommandParityCatalog20261024.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const base=path.join(root,'research/accumark-v10-playlist/ACCUMARK_COMMAND_PARITY_AUDIT_20261024')
const report=path.join(root,'docs/reports/ACCUMARK_COMMAND_PARITY_AUDIT_20261024.md')
test('research JSON contains exactly audited source-linked commands and honest vendor parity metadata',()=>{
 const json=JSON.parse(fs.readFileSync(base+'.json','utf8'))
 assert.equal(json.schema,'exo.accumark-command-audit.v1')
 assert.deepEqual(json.summary,summary)
 assert.deepEqual(json.rows,catalog)
 assert.equal(json.summary.actionableRecords,134)
 assert.equal(json.summary.informationalReferences,34)
 assert.equal(json.summary.licensedVendorApplicationParityRuns,0)
})
test('CSV and full Markdown report enumerate original sources, all audited row IDs and 33 separate contracts',()=>{
 const csv=fs.readFileSync(base+'.csv','utf8')
 const md=fs.readFileSync(report,'utf8')
 assert.equal(csv.split('\n').filter(Boolean).length,catalog.length+1)
 assert(md.includes('## Original 33 EXO research/engineering contracts'))
 assert(md.includes('## Informational/vendor UI topics (not commands)'))
 for(const row of catalog){
   assert(csv.includes('"'+row.id+'"'),row.id+' omitted CSV')
   assert(md.includes('| '+row.id+' |'),row.id+' omitted Markdown')
 }
 assert(md.includes('not every command of licensed Gerber AccuMark'))
 assert(md.includes('61')&&md.includes('23')&&md.includes('50'))
})
