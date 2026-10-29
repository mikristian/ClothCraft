// Bounded, disposable native topology/attachment regression runner.
// Does not modify installed apps or any garment documents.
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const base = process.cwd()
const crate = join(base, 'research/oss/clothcraft')
const cargo = join(process.env.HOME, '.cargo/bin/cargo')
const rounds = Math.max(1, Math.min(5, Number(process.argv[2]) || 3))
const selections = ['split_attachment_migration', 'drawing_commands', 'drafting_integration']
const out = []

for (let i = 1; i <= rounds; i++) {
  const args = ['test', '--no-default-features', '--locked', '--offline']
  for (const selection of selections) args.push('--test', selection)
  const start = performance.now()
  const run = spawnSync(cargo, args, { cwd: crate, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 })
  const output = `${run.stdout || ''}\n${run.stderr || ''}`
  const suitePasses = [...output.matchAll(/test result: ok\. (\d+) passed; 0 failed/g)].map(m => Number(m[1]))
  const state = run.status === 0 && suitePasses.length === selections.length ? 'PASS' : 'FAIL'
  out.push({round:i,state,seconds:Number(((performance.now()-start)/1000).toFixed(2)),testsPassed:suitePasses.reduce((a,b)=>a+b,0),suitePasses,exitCode:run.status,error:state === 'FAIL' ? output.slice(-3000) : null})
  if (state === 'FAIL') break
}

const report = {generatedAt:new Date().toISOString(),roundsRequested:rounds,roundsExecuted:out.length,testsPerRound:27,allPassed:out.length === rounds && out.every(r=>r.state === 'PASS' && r.testsPassed === 27),results:out}
const dir = 'research/clo-2d-analysis/engine-rig/results'
mkdirSync(dir,{recursive:true})
const filename = join(dir,'native-topology-loop-latest.json')
writeFileSync(filename,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({allPassed:report.allPassed,roundsExecuted:out.length,totalPassingTestExecutions:out.reduce((sum,r)=>sum+r.testsPassed,0),report:filename},null,2))
if (!report.allPassed) process.exitCode=1
