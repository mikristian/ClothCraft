// Strict fixed grading release threshold. Does not change G01-G30, cannot
// convert a preview, an absent factory signoff or a third-party receipt into
// a passing check. Status 1 is expected until 30/30 pass on real hardware.
import {spawnSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),
 'qa-v2-core-grading-readiness-80-20261028.mjs')
const run=spawnSync(process.execPath,[file],{
 cwd:path.resolve(path.dirname(file),'../..'),env:process.env,
 encoding:'utf8',timeout:180_000,maxBuffer:2_000_000,
})
const prefix='EXO_CORE_GRADE_BENCHMARK '
const line=(run.stdout||'').split('\n').find(row=>row.startsWith(prefix))
if(!line){
 console.error('FAIL: EXO 100% core grading gate: benchmark did not produce verified native results.')
 console.error((run.stderr||run.stdout||'').slice(-1200))
 process.exit(1)
}
let report
try{report=JSON.parse(line.slice(prefix.length))}
catch(error){console.error('FAIL: Invalid native benchmark report:',error.message);process.exit(1)}
const failures=report.results.filter(row=>!row.passed)
const pass=report.criteria===30&&report.passed===30&&report.failed===0&&failures.length===0
console.log(JSON.stringify({gate:'exo-native-core-grading-100.v1',passed:pass,
 scorePercent:report.percent,requiredPercent:100,criteria:report.criteria,
 observedPasses:report.passed,failures:failures.map(row=>({id:row.id,reason:row.detail})),
 factoryApproved:false,
 note:'Passing this internal gate would not independently certify cutting, receiving-CAD or actual factory fit.'}))
if(!pass)process.exitCode=1
