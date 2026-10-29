/**
 * Reproducible evidence ledger, not a vendor feature-percentage estimator.
 * Passing a module test cannot substitute for UI, save/reopen, native, or
 * independent cutter/physical plotter verification.
 * Run: node scripts/qa-exo-2d-grading-95-acceptance-20261024.mjs
 */
import {spawnSync} from 'node:child_process'
import {readFileSync,writeFileSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'

const repo=resolve(import.meta.dirname,'..')
const checks={
  drafting:[
    ['D01','Numerical point construction','check-drafting-precision'],
    ['D02','Snapping precision','check-drafting-snapping'],
    ['D03','Closed winding/topology checks','check-drafting-topology'],
    ['D04','Straight topology split','check-drafting-splits'],
    ['D05','Unfold and symmetry','check-drafting-unfold'],
    ['D06','Curved attached graded split','src/core/advancedAttachedCadEdit20261024_1516.test.mjs'],
    ['D07','Legacy graded straight split','src/core/gradedStraightEdgeSplit20261024_1453.test.mjs'],
    ['D08','Curved seam construction evaluation','src/core/gradedComplexSeamConstructionAcceptance20261024_1501.test.mjs'],
    ['D09','DXF unit safety','qa-dxf-import-unit-safety-20261022'],
    ['D10','DXF source roundtrip','dxf-roundtrip-check'],
    ['D11','DXF construction marks','check-dxf-construction-fidelity'],
    ['D12','Marker print-scale evidence','qa-marker-print-calibration-20261022'],
    ['D13','Full editing UI automated interaction',null],
    ['D14','Undo and redo persistence of attached curved split',null],
    ['D15','Native Rust curved split command parity',null],
    ['D16','Multiple holes and curve intersection golden corpus',null],
    ['D17','Dart/pleat production topology golden corpus',null],
    ['D18','Complex seam allowance true CUT contour',null],
    ['D19','Print-scale independently measured real plot',null],
    ['D20','Independent receiving CAD exact curved DXF acceptance',null],
  ],
  grading:[
    ['G01','Industrial source grade rules','src/core/industrialGradeRules.test.mjs'],
    ['G02','Nonuniform industrial grading through garment','src/core/gradingIndustrialIntegration.test.mjs'],
    ['G03','Grading spreadsheet roundtrip','qa-grade-rule-csv-20261022'],
    ['G04','Ten garment pattern-grade CSV coverage','qa-grade-rule-csv-template-coverage-20261022'],
    ['G05','Invalid grading size and increment rejection','qa-2d-grading-preflight-20261022'],
    ['G06','Compiled Rust grading parity','qa-rust-grading-kernel'],
    ['G07','Multi-size pattern golden coordinates','qa-exo-grading-hotpath-20261021'],
    ['G08','Graded sewn notch correction','src/core/industrialGradedSeamCorrection20261024_1516.test.mjs'],
    ['G09','Physical interval-matched notch validation','src/core/gradedNotchIntervalAudit.test.mjs'],
    ['G10','Graded industrial seam continuity','src/core/accumarkGradedMaterialContinuity20261024_1453.test.mjs'],
    ['G11','Graded curved seam and construction checks','src/core/gradedComplexSeamConstructionAcceptance20261024_1501.test.mjs'],
    ['G12','Industrial sewn pattern QA','src/core/industrialPatternQA.test.mjs'],
    ['G13','Factory marker all-six-size bundle','qa-factory-marker-calibration-20261022'],
    ['G14','User edit and undo notch correction in installed app',null],
    ['G15','Cross-session save/reopen of industrial-grade corrections',null],
    ['G16','Native Rust point-rule multi-piece grading parity',null],
    ['G17','Industrial trueing of mismatched graded curved sewlines',null],
    ['G18','All sizes physical POM accepted by external patternmaker',null],
    ['G19','Independent receiving CAD full-size grade-rule roundtrip',null],
    ['G20','Factory approved garment cutting sample/fit',null],
  ],
}

const commandFor=file=>file.startsWith('src/')?[process.execPath,'--test',file]:[process.execPath,`scripts/${file}.mjs`]
const results={}
for(const [category,rows] of Object.entries(checks)){
  results[category]=rows.map(([id,behavior,test])=>{
    if(!test)return {id,behavior,status:'NOT_VERIFIED',evidence:'No independent end-to-end acceptance recorded'}
    const [, ...args]=commandFor(test)
    const result=spawnSync(process.execPath,args,{cwd:repo,encoding:'utf8',timeout:65000,maxBuffer:512*1024})
    return {id,behavior,status:result.status===0?'INTERNAL_TEST_PASS':'FAILED',test,exitCode:result.status,
      evidence:result.status===0?'Local source/test evidence only; not complete workflow parity':(result.stderr||result.error?.message||result.stdout||'').slice(-350)}
  })
}
const summary=Object.fromEntries(Object.entries(results).map(([category,rows])=>{
  const internalPassed=rows.filter(r=>r.status==='INTERNAL_TEST_PASS').length
  const endToEndVerified=rows.filter(r=>r.status==='INDEPENDENT_E2E_PASS').length
  return [category,{total:rows.length,internalPassed,notVerified:rows.filter(r=>r.status==='NOT_VERIFIED').length,
    failed:rows.filter(r=>r.status==='FAILED').length,endToEndVerified,
    internalCoveragePercent:Math.round(internalPassed/rows.length*100),
    verified95Pass:endToEndVerified>=Math.ceil(rows.length*.95)}]
}))
const report={date:'2026-10-24',scope:'EXO classic 2D drafting and grading vs CLO-like professional essentials',
  rule:'No internal unit/regression PASS counts as independent end-to-end workflow PASS. 95% requires at least 19/20 such gates for EACH subsystem; native and factory are separate required gates.',
  scoreBasis:'Equal-weight 20 behaviors per subsystem; evidence statuses INTERNAL_TEST_PASS, FAILED, NOT_VERIFIED, INDEPENDENT_E2E_PASS',
  summary,results,claim95Verified:Object.values(summary).every(x=>x.verified95Pass)}
const output=resolve(repo,'docs/reports/EXO_2D_GRADING_95_EVIDENCE_20261024.json')
writeFileSync(output,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({output,summary,claim95Verified:report.claim95Verified},null,2))
if(Object.values(summary).some(x=>x.failed))process.exitCode=1
