/**
 * EXO graded-pattern acceptance rubric v1, fixed before running. READ ME:
 *  - A measured EXO pass score, NOT Optitex/Modaris parity or certification.
 *  - Every check is equal-weight. Unsupported industrial capabilities score 0.
 *  - Fixtures are true disposable Rust T-shirt + a new Rust-authored sleeve.
 *  - Live native Rust commit/undo/redo/size activation and manufacturing audits.
 *  - Evidence is recorded as JSON; failed checks never become implicit passes.
 *  - Re-run unchanged after changes to measure a real before/after improvement.
 *
 * Run: node integrations/clothcraft/qa-v2-core-grading-readiness-80-20261028.mjs
 * Optional: EXO_GRADE_BENCHMARK_REPORT=/absolute/path.json (audit copy)
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet,compileAccuMarkNativeRuleSizeRun,
 editAccuMarkNativePointRule} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {auditAccuMarkNativeRuleSizeQA20261023} from '../../src/core/accumarkNativeRuleSizeQA20261023.js'
import {inspectAccuMarkNativeGradedSewnSeamQA20261023} from '../../src/core/accumarkNativeGradedSewnSeamQA20261023.js'
import {applyOptitexGradeTool20261027} from '../../src/core/optitexGradeTools20261027.js'
import {createNativeGradingPOM20261025,previewNativeGradingPOM20261025}
 from '../../src/core/nativeGradingPOM20261025.js'
import {inspectNativeGradingReleaseGate20261025}
 from '../../src/core/nativeGradingReleaseGate20261025.js'
import {prepareNativeGradeCatalog20261025}
 from '../../src/core/nativeGradeCatalogBridge20261025.js'

const SIZES=Object.freeze(['XS','S','M','L','XL','XXL'])
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const target=80
const rubric=Object.freeze([
 ['G01','Real Rust T-shirt pattern opens','Native fixture'],
 ['G02','Two real panels and eight sewn relationships','Native fixture'],
 ['G03','All source coordinates and named edges are finite/distinct','Native fixture'],
 ['G04','New native sleeve-pattern piece authors successfully','Native fixture'],
 ['G05','Authored piece increments the Rust revision and survives save','Native fixture'],
 ['G06','Six named graded sizes created from real native pattern','Grade creation'],
 ['G07','Nontrivial graded offsets change real widths monotonically','Grade creation'],
 ['G08','M base geometry is physically unchanged','Grade creation'],
 ['G09','All three real pieces compile across six sizes','Grade creation'],
 ['G10','All eighteen graded contours pass source geometry QA','Grade QA'],
 ['G11','All 48 sewn seam/size combinations pass 2 mm QA','Grade QA'],
 ['G12','Deliberate seam mismatch is detected and blocked','Grade QA'],
 ['G13','Point-specific grade editing changes actual six-size offsets','Point tools'],
 ['G14','Grade copy and paste transfers the six-size vectors','Point tools'],
 ['G15','Unsafe point operation cannot mutate the authored rule set','Point tools'],
 ['G16','Stale source topology invalidates old grading rules','Grade QA'],
 ['G17','Collapsed/self-crossing graded size is rejected','Grade QA'],
 ['G18','Six physically compiled sizes commit to native Rust','Native catalog'],
 ['G19','Native Rust returns six production cutline inspections','Native catalog'],
 ['G20','Native Rust POM chart verifies all six physical targets','Native metrology'],
 ['G21','Native industrial report measures real allowance on six sizes','Native metrology'],
 ['G22','Physical notch propagates into source and every Rust grade','Native operations'],
 ['G23','Duplicate physical notch is atomically rejected','Native operations'],
 ['G24','Native Undo and Redo restore physical six-size notch','Native operations'],
 ['G25','Native saved project reopens with complete six-size catalog','Native operations'],
 ['G26','Rust graded XXL activation and base restoration are reversible','Native operations'],
 ['G27','Arbitrary named sizes and size correspondence independently validated','Advanced industrial'],
 ['G28','Automatic linked multi-piece formula regeneration certified','Advanced industrial'],
 ['G29','Independent third-party receiving-CAD DXF roundtrip approved','Advanced industrial'],
 ['G30','Independent signed six-size physical sample and factory signoff','Advanced industrial'],
].map(([id,name,group])=>Object.freeze({id,name,group,weight:1})))
assert.equal(new Set(rubric.map(c=>c.id)).size,30)
const outcomes=[]
let current=null
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'exo-core-grade-80-fixed-'))
const workspace=createWorkspace(temporary)
const check=async(id,fn)=>{
 const item=rubric.find(c=>c.id===id)
 assert(item,`Unknown benchmark check ${id}`)
 assert(!outcomes.some(x=>x.id===id),`Duplicated check ${id}`)
 let passed=false,detail=''
 try{
  const result=await fn()
  assert.notEqual(result?.ok,false,result?.reason||result?.error||'Operation rejected')
  passed=true;detail=typeof result==='string'?result:result?.detail||'Observed acceptance criterion'
 }catch(error){detail=String(error?.message||error).slice(0,400)}
 outcomes.push({id,name:item.name,group:item.group,weight:item.weight,passed,detail})
 console.log(JSON.stringify({check:id,passed,detail}))
}
const requireNative=async(op,args={})=>{
 const response=await workspace.request({op,...(current?.revision!=null?{revision:current.revision}:{}),...args})
 assert.equal(response.ok,true,`${op}: ${response.error||'Rejected'}`)
 if(response.data?.template)current=response.data
 return response.data
}
const nativeFail=async(op,args={})=>{
 const before=await requireNative('snapshot')
 const response=await workspace.request({op,revision:current.revision,...args})
 assert.equal(response.ok,false,`${op} erroneously accepted unsafe request`)
 const after=await requireNative('snapshot')
 assert.equal(after.revision,before.revision,`${op} changed revision on failure`)
 assert.deepEqual(after.template,before.template,`${op} changed geometry on failure`)
 return response
}
const getPanel=(id='front')=>current?.template?.panels.find(p=>p.id===id)
let rules,compiled,gradeRun,frontEdge,sleeveId,originalSource,initialNotches,basePOM
const latest=()=>requireNative('snapshot')
const width=points=>Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]))
const checkAllSizeNotches=(project,t=.43,d=.004)=>{
 const templates=[project.template,...project.grade_run.gradedTemplates]
 assert.equal(templates.length,7)
 for(const template of templates){
  const marks=template.panels.find(p=>p.id==='front')?.polygon?.notches?.[frontEdge]||[]
  assert.equal(marks.filter(m=>Math.abs(m.t-t)<1e-8&&Math.abs(m.depth_m-d)<1e-9).length,1)
 }
}
try{
 await check('G01',async()=>{
  const opened=await requireNative('open',{preset:'tshirt'})
  assert(opened?.template?.panels?.length>0)
  return 'Real Rust native T-shirt fixture loaded'
 })
 await check('G02',()=>{
  assert.equal(current.template.panels.length,2)
  assert.equal(current.template.seams.length,8)
  return 'front/back; eight physical sewn relationships'
 })
 await check('G03',()=>{
  for(const panel of current.template.panels){
   const polygon=panel.polygon
   assert(polygon.points.length>=3)
   assert(polygon.points.every(p=>p.length===2&&p.every(Number.isFinite)))
   assert.equal(new Set(polygon.edges).size,polygon.points.length)
  }
 })
 await check('G04',async()=>{
  const ids=new Set(current.template.panels.map(p=>p.id))
  const fabric=current.template.fabrics[0]?.id
  await requireNative('edit',{command:{kind:'Polygon',fabric,
   points:[[.55,.1],[.83,.1],[.88,.34],[.52,.34]]}})
  const added=current.template.panels.filter(p=>!ids.has(p.id))
  assert.equal(added.length,1)
  assert.equal(added[0].polygon.points.length,4)
  sleeveId=added[0].id
  return `Native authored additional sleeve piece ${sleeveId}`
 })
 await check('G05',async()=>{
  assert(current.revision>0)
  const saved=await requireNative('save')
  assert(saved.project.template.panels.some(p=>p.id===sleeveId))
  return `Native saved sleeve with Rust revision ${current.revision}`
 })
 // Authored allowances must belong to the real Rust source and survive all
 // subsequent size compilations; a browser-only CUT override is not evidence.
 for(const panel of [...current.template.panels]){
  for(const edge of panel.polygon.edges){
   await requireNative('edit',{command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.012}})
  }
 }
 assert(current.template.panels.every(panel=>panel.polygon.edges.every(edge=>
  panel.polygon.seam_allowances?.[edge]===.012)))
 await check('G06',()=>{
  const created=createAccuMarkNativeRuleSet(current)
  assert.equal(created.ok,true,created.reason)
  rules=created.ruleSet
  assert.deepEqual(rules.sizes,SIZES)
  assert.equal(rules.baseSize,'M')
  assert.equal(Object.keys(rules.panels).length,3)
 })
 await check('G07',()=>{
  for(const panel of current.template.panels){
   for(let j=0;j<SIZES.length;j++){
    const step=j-2
    for(let i=0;i<panel.polygon.points.length;i++){
     const point=panel.polygon.points[i]
     // Explicit 0.9% per-size geometry growth about the Rust drafting origin.
     // This preserves nonnegative coordinates even on a source with points
     // at x=0/y=0. Pivoting about the first vertex can move other vertices
     // below zero, violating Rust's documented persisted grade envelope.
     rules.panels[panel.id].pointOffsetsMm[SIZES[j]][i]=[
      point[0]*step*9,point[1]*step*9]
    }
   }
  }
  compiled=compileAccuMarkNativeRuleSizeRun(current,rules)
  assert(compiled.ok,compiled.reason)
  const front=compiled.byPanel.front.sizeRun
  for(let j=1;j<SIZES.length;j++){
   assert(width(front[SIZES[j]].polygon.points)>width(front[SIZES[j-1]].polygon.points))
  }
  return 'Six increasing actual native panel widths; 0.9% per-size interval'
 })
 await check('G08',()=>{
  for(const panel of current.template.panels){
   assert.deepEqual(compiled.byPanel[panel.id].sizeRun.M.polygon.points,panel.polygon.points)
  }
 })
 await check('G09',()=>{
  assert.equal(Object.keys(compiled.byPanel).length,3)
  assert(compiled.byPanel[sleeveId])
  for(const item of Object.values(compiled.byPanel))assert.equal(Object.keys(item.sizeRun).length,6)
  return '3 real native panels × 6 grade sizes = 18 compiled polygons'
 })
 await check('G10',()=>{
  const qa=auditAccuMarkNativeRuleSizeQA20261023(current,rules)
  assert.equal(qa.ok,true,JSON.stringify(qa.issues).slice(0,230))
  assert.equal(qa.panels.length,18)
  assert(qa.panels.every(row=>row.blockers.length===0&&row.perimeterMm>0))
 })
 await check('G11',()=>{
  const seams=inspectAccuMarkNativeGradedSewnSeamQA20261023(current,rules,{toleranceMm:2})
  assert.equal(seams.ok,true,JSON.stringify(seams.issues).slice(0,230))
  assert.equal(seams.rows.length,48)
  assert(seams.rows.every(row=>row.pass&&row.mismatchMm<=2))
  return '8 real sewn relationships × 6 sizes; each mismatch <=2 mm'
 })
 await check('G12',()=>{
  const broken=structuredClone(rules)
  broken.panels.front.pointOffsetsMm.XXL[0][0]+=25
  const qa=inspectAccuMarkNativeGradedSewnSeamQA20261023(current,broken,{toleranceMm:2})
  assert.equal(qa.ok,false,'Incorrect graded seam must not pass')
  assert(qa.issues.some(row=>row.size==='XXL'))
 })
 await check('G13',()=>{
  const result=applyOptitexGradeTool20261027({snapshot:current,ruleSet:rules,
   panelId:'front',pointIndex:0,toolId:'set-grading-tool',axis:'x',amountMm:2})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.ruleSet.panels.front.pointOffsetsMm.XXL[0][0],6)
  assert.equal(result.ruleSet.panels.front.pointOffsetsMm.M[0][0],0)
 })
 await check('G14',()=>{
  const copy=applyOptitexGradeTool20261027({snapshot:current,ruleSet:rules,
   panelId:'front',pointIndex:3,toolId:'copy-grading'})
  assert.equal(copy.ok,true,copy.reason)
  const paste=applyOptitexGradeTool20261027({snapshot:current,ruleSet:rules,
   panelId:'front',pointIndex:4,toolId:'paste-grading',clipboard:copy.clipboard})
  assert.equal(paste.ok,true,paste.reason)
  for(const size of SIZES){
   const actual=paste.ruleSet.panels.front.pointOffsetsMm[size][4]
   const expected=rules.panels.front.pointOffsetsMm[size][3]
   assert(actual.every((value,index)=>Math.abs(value-expected[index])<1e-9),
    `Physical ${size} clipboard vectors differ beyond 1e-9 mm`)
  }
 })
 await check('G15',()=>{
  const before=structuredClone(rules)
  const bad=applyOptitexGradeTool20261027({snapshot:current,ruleSet:rules,
   panelId:'front',pointIndex:9999,toolId:'move-point-size',axis:'x',amountMm:100,size:'XXL'})
  assert.equal(bad.ok,false)
  assert.equal(JSON.stringify(rules),JSON.stringify(before),
   'Failed grading operation changed the source rule values')
 })
 await check('G16',()=>{
  const changed=structuredClone(current)
  changed.template.panels.find(p=>p.id==='front').polygon.points[0][0]+=.005
  assert.equal(compileAccuMarkNativeRuleSizeRun(changed,rules).ok,false)
 })
 await check('G17',()=>{
  const degenerate=structuredClone(rules)
  const point=current.template.panels.find(p=>p.id==='front').polygon.points[0]
  current.template.panels.find(p=>p.id==='front').polygon.points.forEach((p,i)=>{
   degenerate.panels.front.pointOffsetsMm.XXL[i]=[(point[0]-p[0])*1000,(point[1]-p[1])*1000]
  })
  const check=auditAccuMarkNativeRuleSizeQA20261023(current,degenerate)
  assert.equal(check.ok,false)
  assert(check.issues.some(issue=>issue.size==='XXL'))
 })
 frontEdge=getPanel().polygon.edges[0]
 const refreshed=createAccuMarkNativeRuleSet(current)
 assert(refreshed.ok,refreshed.reason)
 const oldRules=rules;rules=refreshed.ruleSet
 for(const panel of current.template.panels){
  for(const size of SIZES){
   rules.panels[panel.id].pointOffsetsMm[size]=structuredClone(oldRules.panels[panel.id].pointOffsetsMm[size])
  }
 }
 compiled=compileAccuMarkNativeRuleSizeRun(current,rules)
 assert(compiled.ok,compiled.reason)
 originalSource=structuredClone(current.template)
 const pom=createNativeGradingPOM20261025(current,rules,{panelId:'front',fromPoint:0,toPoint:1,
  label:'Front physical XS–XXL baseline',toleranceMm:.5})
 assert(pom.ok,pom.reason)
 const preview=previewNativeGradingPOM20261025(current,rules,{panelId:'front',fromPoint:0,toPoint:1,
  toleranceMm:.5})
 assert(preview.ok,preview.reason)
 basePOM={...pom.definition,targetsMm:Object.fromEntries(preview.rows.map(row=>[row.size,row.actualMm]))}
 // Exercise exactly the same preflight used by the actual EXO Grading Table.
 // The React app must not be bypassed by a benchmark that blindly commits
 // acceptable-looking browser previews with native-incompatible coordinates.
 const preparedCatalog=prepareNativeGradeCatalog20261025(current,
  {template:structuredClone(originalSource)},rules,{pomDefinitions:[basePOM]})
 assert(preparedCatalog.ok,preparedCatalog.reason)
 gradeRun=preparedCatalog.gradeRun
 await check('G18',async()=>{
  const answer=await requireNative('grade-run-commit',{gradeRun})
  assert.equal(answer.gradeCatalogResult?.persisted,true)
  const saved=await requireNative('save')
  assert.deepEqual(saved.project.grade_run.sizes,SIZES)
  assert.equal(saved.project.grade_run.gradedTemplates.length,6)
  return 'Native Rust persisted three-panel graded catalog; 6 sizes'
 })
 await check('G19',async()=>{
  const result=await requireNative('grade-run-cutlines')
  assert.equal(result.format,'exo-native-graded-cutlines.v1')
  assert.equal(result.sizes.length,6)
  assert.equal(result.manufacturerReady,false)
  assert.equal(result.cuttingAuthorized,false)
  return 'All six native CUT geometries inspected, NOT cutting-approved'
 })
 await check('G20',async()=>{
  const result=await requireNative('grade-run-pom-audit')
  assert.equal(result.format,'exo-native-grade-pom-audit.v1')
  assert.equal(result.acceptanceComplete,true)
  assert.equal(result.passed,6)
  assert.equal(result.factoryApproved,false)
  return '6/6 explicit physical Rust measurements within 0.5 mm tolerance'
 })
 await check('G21',async()=>{
  const result=await requireNative('grade-run-industrial-audit',{panel:'front'})
  assert.equal(result.sizes.length,6)
  assert(result.sizes.every(size=>size.edges.some(edge=>edge.edgeId===frontEdge&&
   Math.abs(edge.allowanceM-.012)<1e-9)))
  assert.equal(result.factoryApproved,false)
  return 'Measured six actual 12 mm native front seam allowances'
 })
 await check('G22',async()=>{
  // Regression prerequisite: the notch path MUST handle a size whose raw
  // points extend beyond its unchanged original panel.pattern envelope.
  // That exact case failed in Rust before the temporary-grade compilation fix.
  const extended=gradeRun.gradedTemplates.some(template=>template.panels.some(panel=>
   panel.polygon.points.some(([x,y])=>x>panel.pattern.width+1e-9||y>panel.pattern.height+1e-9)))
  assert.equal(extended,true,'Missing real positive grade overflow: notch regression fixture is too weak')
  const beforeRevision=current.revision
  await requireNative('grade-notch-commit',{panelId:'front',edgeId:frontEdge,t:.43,depthMm:4})
  assert.equal(current.revision,beforeRevision+1)
  const saved=await requireNative('save')
  checkAllSizeNotches(saved.project)
  return 'Seven real saved 4 mm notches with positive grade overflow; one atomic Rust revision'
 })
 await check('G23',async()=>{
  assert((await requireNative('save')).project.grade_run,'Cannot score rejection without persisted catalog')
  await nativeFail('grade-notch-commit',{panelId:'front',edgeId:frontEdge,t:.43,depthMm:4})
  return 'Duplicate notch rejected without changing native source'
 })
 await check('G24',async()=>{
  await requireNative('undo')
  const without=await requireNative('save')
  const marks=without.project.template.panels.find(p=>p.id==='front')?.polygon?.notches?.[frontEdge]||[]
  assert(!marks.some(mark=>Math.abs(mark.t-.43)<1e-8))
  await requireNative('redo')
  checkAllSizeNotches((await requireNative('save')).project)
 })
 await check('G25',async()=>{
  const before=await requireNative('save')
  assert(before.project.grade_run)
  await requireNative('open',{project:before.project})
  const after=await requireNative('save')
  checkAllSizeNotches(after.project)
  assert.deepEqual(after.project.grade_run.sizes,SIZES)
  assert.deepEqual(after.project.grade_run.gradedTemplates,before.project.grade_run.gradedTemplates)
  return 'Native graded catalog saved/reopened with all authored pieces and notches'
 })
 await check('G26',async()=>{
  const original=structuredClone(current.template),revision=current.revision
  await requireNative('grade-run-activate',{size:'XXL'})
  assert.equal(current.activeGradedSize,'XXL')
  assert.equal(current.revision,revision+1)
  await requireNative('grade-run-restore')
  assert(!current.activeGradedSize)
  assert.deepEqual(current.template,original)
  return 'XXL fit scene activates and restores without editing source polygons'
 })
 // These are deliberately scored as FAIL, even though rejecting their false
 // approval is correct. An 80% core score does not certify a factory release.
 await check('G27',()=>{throw Error('Native Rust grade-run and linked POM contract fixes sizes to XS–XXL; arbitrary size correspondence not validated')})
 await check('G28',()=>{
  // Use a separate, fresh Rust garment: browser rules alone cannot establish
  // automatic cross-panel native dependencies or persistent size evolution.
  const result=spawnSync(process.execPath,
   [path.join(root,'integrations/clothcraft/check-v2-core-grading-three-piece-reactive-20261028.mjs')],
   {cwd:root,encoding:'utf8',timeout:120_000,maxBuffer:2_000_000})
  assert.equal(result.status,0,`Three-piece native regeneration failed: ${String(result.stderr||result.stdout).slice(-500)}`)
  const report=JSON.parse(result.stdout.trim().split('\n').at(-1))
  assert.equal(report.passed,true)
  assert.equal(report.nativeRust,true)
  assert.equal(report.allBoundPiecesRegenerated,true)
  assert.equal(report.boundPieces,3)
  assert.equal(report.sizePieceChecks,18)
  assert.equal(report.invalidOverrideRejected,true)
  assert.equal(report.undoRedoSaveReopen,true)
  assert.equal(report.unboundSeamsPreserved,true)
  assert.equal(report.factoryApproved,false)
  return 'Three linked native pieces × six sizes regenerated in one Rust revision; invalid overrides, Undo/Redo and save/reopen verified'
 })
 await check('G29',()=>{throw Error('No independent third-party receiving-CAD acceptance evidence for this physical fixture')})
 await check('G30',()=>{
  const gate=inspectNativeGradingReleaseGate20261025(current,rules,[basePOM])
  assert.equal(gate.manufacturingApproved,false)
  throw Error('No independent signed six-size sewn samples or factory signoff; release gate fails closed')
 })
}finally{
 workspace.close()
 fs.rmSync(temporary,{recursive:true,force:true})
}
for(const checkCase of rubric){
 if(!outcomes.some(outcome=>outcome.id===checkCase.id))outcomes.push({
  ...checkCase,passed:false,detail:'Not executed: earlier native precondition or harness failure'})
}
outcomes.sort((a,b)=>a.id.localeCompare(b.id))
const passed=outcomes.filter(item=>item.passed).length
const percent=Number((passed/rubric.length*100).toFixed(2))
const report={schema:'exo-core-grading-fixed-fixture-benchmark.v1',date:'2026-10-28',
 measured:true,benchmark:'EXO core grading acceptance, NOT commercial vendor parity',
 source:'isolated native Rust T-shirt + third Rust-authored panel',
 criteria:rubric.length,passed,failed:rubric.length-passed,percent,
 targetPercent:target,reachedTarget:percent>=target,
 caveat:'This is a bounded internal fixture acceptance suite, not licensed Optitex/Modaris parity, independent receiving-CAD inspection or factory certification.',
 results:outcomes}
const reportFile=process.env.EXO_GRADE_BENCHMARK_REPORT
if(reportFile){fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n')}
console.log('EXO_CORE_GRADE_BENCHMARK '+JSON.stringify(report))
if(!report.reachedTarget)process.exitCode=1
