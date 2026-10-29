// 2D-only internal release QA. Passing this script is NOT a professional
// factory certification: external CAD round trips and physically measured
// print output remain separate, mandatory acceptance gates.
import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'

const checks = [
  ['Grading spreadsheet integrity','qa-grade-rule-csv-20261022'],
  ['Ten-garment grade interchange','qa-grade-rule-csv-template-coverage-20261022'],
  ['Production grading validation','qa-2d-grading-preflight-20261022'],
  ['Compiled Rust grading parity','qa-rust-grading-kernel'],
  ['Graded XS/M/XXL golden geometry','qa-exo-grading-hotpath-20261021'],
  ['DXF unit safety','qa-dxf-import-unit-safety-20261022'],
  ['DXF interchange round trip','dxf-roundtrip-check'],
  ['DXF construction marks','check-dxf-construction-fidelity'],
  ['Drafting precision','check-drafting-precision'],
  ['Drafting snapping','check-drafting-snapping'],
  ['Drafting topology','check-drafting-topology'],
  ['Drafting splits','check-drafting-splits'],
  ['Drafting unfold','check-drafting-unfold'],
  ['Marker PDF/SVG byte baselines','qa-marker-pdf-byte-baseline-20261021'],
  ['Marker PDF physical-scale ruler geometry','qa-marker-print-calibration-20261022'],
  ['Six-size factory marker bundle','qa-factory-marker-calibration-20261022'],
]
const executable = 'native_cpp/build-cmake/garment_cad_cli'
if (existsSync(executable)) checks.push(['Native C++ graded geometry agreement','check-native-cpp-grading'])
const result=[]
for (const [name,script] of checks) {
  const run=spawnSync(process.execPath,[`scripts/${script}.mjs`],{encoding:'utf8',timeout:60000,maxBuffer:512*1024})
  result.push({name,status:run.status===0?'PASS':'FAIL',exitCode:run.status,error:(run.stderr||run.error?.message||'').slice(0,350)})
}
const industrial = spawnSync(process.execPath,['--test','src/core/industrialPatternQA.test.mjs','src/core/factorySampleApproval.test.mjs','src/core/industrialGradeRules.test.mjs'],{encoding:'utf8',timeout:60000,maxBuffer:512*1024})
result.push({name:'Industrial graded seams, nonuniform rules, and external factory sample evidence',status:industrial.status===0?'PASS':'FAIL',exitCode:industrial.status,error:(industrial.stderr||industrial.error?.message||'').slice(0,350)})
const gates={
  internalNumericalAndExportTests:result.every(item=>item.status==='PASS')?'PASS':'FAIL',
  browserGradingCsv: 'RUN SEPARATELY: node scripts/qa-grade-rule-csv-browser-20261022.mjs',
  measuredPhysicalPlotterScale:'NOT VERIFIED — print at actual size and physically measure the ruler on every page',
  externalAamaAstmOptitexRoundTrip:'NOT VERIFIED — separate factory CAD acceptance required',
  fullProfessionalDesignerWorkflow:'NOT VERIFIED — real garment-size-run acceptance required',
  factoryCertified:false,
}
console.log(JSON.stringify({pass:result.every(item=>item.status==='PASS'),automatedChecks:result.length,result,gates},null,2))
if(result.some(item=>item.status==='FAIL'))process.exitCode=1
