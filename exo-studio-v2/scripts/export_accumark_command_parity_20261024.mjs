import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {ACCUMARK_2D_COMMANDS} from '../src/core/accumark2dCommandRegistry.js'
import {ACCUMARK_COMMAND_PARITY_CATALOG_20261024 as rows,
  ACCUMARK_COMMAND_PARITY_SUMMARY_20261024 as summary} from '../src/core/accumarkCommandParityCatalog20261024.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const target=path.join(root,'research/accumark-v10-playlist')
const reportDir=path.join(root,'docs/reports')
const stem='ACCUMARK_COMMAND_PARITY_AUDIT_20261024'
const csvColumns=['id','name','group','kind','status','vendor_help','exo_source',
  'focused_tests','limitations','exo_engineering_contracts','source_kind','vendor_parity_tested']
const csvField=value=>{
 const raw=String(value??'')
 const safe=/^[=+@-]/.test(raw)?"'"+raw:raw
 return '"'+safe.replaceAll('"','""')+'"'
}
const safeCell=value=>String(value??'').replaceAll('|','\\|').replaceAll(/\r?\n/g,' ')
const jsonFile=path.join(target,stem+'.json')
const csvFile=path.join(target,stem+'.csv')
const mdFile=path.join(reportDir,stem+'.md')

const data={schema:'exo.accumark-command-audit.v1',auditDate:'2026-10-24',
  methodology:'Local EXO code/tests linked to independently documented vendor help; no licensed Gerber application comparative test; a local partial implementation is not industrial parity.',
  auditScope:'Documented command/workflow sample from 116 vendor help topics and explicitly verified additional named toolbox/PDS/AccuScan actions; not a complete Gerber AccuMark V2026.1 command census.',
  summary,rows}
fs.writeFileSync(jsonFile,JSON.stringify(data,null,2)+'\n')
const values=row=>[row.id,row.label,row.group,row.kind,row.status,row.helpUrl,row.exoCode||'',
  row.tests.join('; '),row.limitation,
  row.contracts.map(c=>c.id+' ['+c.route+']').join('; '),row.sourceKind,row.vendorParityTested]
fs.writeFileSync(csvFile,[csvColumns.map(csvField).join(','),
 ...rows.map(row=>values(row).map(csvField).join(','))].join('\n')+'\n')

const lines=[
 '# EXO ClothCraft V2 — AccuMark individual command parity audit',
 '',
 '**Audited:** October 24, 2026. **Scope:** a documented subset, not every command of licensed Gerber AccuMark V2026.1 and separate AccuNest, AccuPlan, AccuScan, 3D and MTM products.',
 '',
 'The earlier 22-family coverage map is a foundation inventory, **not** command-by-command completion. The local **33 engineering contracts** are separate from vendor commands: 30 have EXO interface routes and three are reference-only, and a route does not prove executable or parity-complete behavior. The original **116 vendor references** include menu, overview, editor and navigation topics—not 116 working vendor commands.',
 '',
 '## Audited coverage (source-linked sample)',
 '',
 '| Metric | Count |',
 '|---|---:|',
 '| Original vendor help source pages | '+summary.uniqueVendorHelpPages+' |',
 '| Documented named actions and workflows in this audit | '+summary.actionableRecords+' |',
 '| Informational reference pages (not commands) | '+summary.informationalReferences+' |',
 '| Fully working / vendor behavior independently accepted | '+summary.counts.working+' |',
 '| Partial tested narrower EXO function | '+summary.counts.partial+' |',
 '| Explicitly missing | '+summary.counts.missing+' |',
 '| Not verified at command level | '+summary.counts.unverified+' |',
 '| Licensed vendor comparative acceptance runs | '+summary.licensedVendorApplicationParityRuns+' |',
 '',
 '### Method and grading rule',
 '',
 '- **Working:** matching the exact vendor command, with direct functional/acceptance evidence. Without licensed vendor comparative testing, no EXO tool is automatically classified fully working.',
 '- **Partial:** a narrower EXO operation is tied to an actual source file and a passing focused test; significant vendor behavior may remain unimplemented.',
 '- **Missing:** explicitly unavailable or blocked in the currently audited EXO path, including external drivers or unsafe marker operations.',
 '- **Unverified:** unable to establish equivalent command execution despite related code or UI. Not evidence of absence.',
 '- **Reference:** menu/surface/general official help page; omitted from the 134 action count.',
 '- **Counts only apply to the 134 documented sample**, not all commands shipped by Gerber, nor a percentage of complete product parity.',
 '',
 '## Source-linked command/workflow inventory',
 '',
]
const actions=rows.filter(row=>row.kind!=='reference')
const groups=[...new Set(actions.map(row=>row.group))].sort()
for(const group of groups){
 const items=actions.filter(row=>row.group===group)
 lines.push('### '+group+' ('+items.length+')','','| ID | Official named function | EXO status | Code / tests | Remaining behavior |',
   '|---|---|---|---|---|')
 for(const row of items){
  const url='['+safeCell(row.label)+']('+row.helpUrl+')'
  const code=row.exoCode?safeCell(row.exoCode)+(row.tests.length?'; '+row.tests.map(safeCell).join('; '):''):'—'
  lines.push('| '+row.id+' | '+url+' | '+row.status+' | '+code+' | '+safeCell(row.limitation)+' |')
 }
 lines.push('')
}
lines.push('## Original 33 EXO research/engineering contracts (separate from vendor command count)','','| Engineering contract | UI route | Official help refs |',
  '|---|---|---|')
for(const command of ACCUMARK_2D_COMMANDS){
 lines.push('| '+safeCell(command.id)+' — '+safeCell(command.label)+' | '+command.route.kind+
  ' ('+(command.implemented?'routed':'reference-only')+') | '+command.sourceIds.join(', ')+' |')
}
lines.push('','## Informational/vendor UI topics (not commands)','',
  '| ID | Vendor help/reference | Classification |','|---|---|---|')
for(const row of rows.filter(x=>x.kind==='reference'))
 lines.push('| '+row.id+' | ['+safeCell(row.label)+']('+row.helpUrl+') | informational reference only |')
lines.push('','## Prioritized unverified and missing command work','',
  'Start from actual safety-critical source editing and interchange (sew/cut swapping, attached dart/fullness, graded markings, 3D folds), then marker fold/flip and automated repeat matching, then signed factory CAD/cutter output and externally received ERP/PLM integration. User acceptance requires testing in actual licensed vendor software where possible, production plot verification and manufacturer fitting/sampling.',
  '','## Physical manufacturing release gate','',
  'All local CAD, cutting geometry, and production outputs remain engineering studies. EXO tests alone do not certify vendor-compatible file import/export, cutter command stream, physical plot, grading accuracy, fabric utilization or sewn garment fit.',
  '','## Generated artifacts','',
  '- Research JSON: research/accumark-v10-playlist/'+stem+'.json',
  '- Research CSV: research/accumark-v10-playlist/'+stem+'.csv',
  '- Full markdown: docs/reports/'+stem+'.md',
  '')
fs.writeFileSync(mdFile,lines.join('\n'))
console.log(JSON.stringify({summary,jsonFile,csvFile,mdFile},null,2))
