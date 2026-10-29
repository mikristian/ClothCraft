// Deterministic cross-system smoke gate for prioritized garment workflows.
// This verifies targeted regression suites; it is not a product maturity score.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const groups = [
  {system:'fabric-physics',files:['src/core/physics/qualityGate.acceptance20261027.test.mjs','src/core/physics/selfCollision.test.mjs']},
  {system:'3d-assembly',files:['src/core/backends/nativeAssemblyMeshValidation20261027.test.mjs','src/core/backends/seamAssembly.safety20261027.test.mjs']},
  {system:'avatar-measurements',files:['src/core/assemblyAvatarInputValidation20261027.test.mjs','src/core/measurements.customAnnotationValidation.test.mjs','src/core/measurements.avatarTechPackExportSafety20261027.test.mjs','src/core/projectRestore.avatarRoundTrip20261027.test.mjs']},
  {system:'manufacturing-export',files:['src/core/techPackPreExportReview.test.mjs','src/core/techPackFactoryReadiness.numericQA.test.mjs','src/core/productionPreflight.malformedPattern20261027.test.mjs','src/core/measurements.exportSizeIntegrity20261027.test.mjs']},
]

export function runFiveSystemAcceptance20261027({runner=spawnSync}={}) {
  const reports=[]
  for(const group of groups){
    const result=runner(process.execPath,['--test',...group.files],{
      cwd:projectRoot,encoding:'utf8',maxBuffer:8*1024*1024,
    })
    const output=`${result.stdout||''}\n${result.stderr||''}`
    // Match only the final runner summary. A test can print misleading lines,
    // and accepting the first match could falsely mark failed work as passed.
    const summary=[...output.matchAll(/(?:^|\n)(?:ℹ\s+|#\s+)(tests|pass|fail|cancelled|skipped|todo)\s+(\d+)(?=\r?\n|$)/g)]
    const counts=Object.fromEntries(summary.map(([,key,value])=>[key,Number(value)]))
    const tests=counts.tests??0,passed=counts.pass??0,failed=counts.fail??0
    const complete=['tests','pass','fail','cancelled','skipped','todo'].every(key=>Number.isSafeInteger(counts[key]))
    reports.push({system:group.system,files:group.files,ok:result.status===0&&complete&&tests>0&&passed===tests&&failed===0&&counts.cancelled===0&&counts.skipped===0&&counts.todo===0,
      tests,passed,failed,exitCode:result.status,error:result.error?.message||null})
  }
  return {ok:reports.every(report=>report.ok),verifiedTests:reports.reduce((sum,report)=>sum+report.passed,0),reports,
    scope:'focused-local-regressions',physicalFitCertified:false,productionCertified:false}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const summary=runFiveSystemAcceptance20261027()
  console.log(JSON.stringify(summary,null,2))
  if(!summary.ok)process.exitCode=1
}
