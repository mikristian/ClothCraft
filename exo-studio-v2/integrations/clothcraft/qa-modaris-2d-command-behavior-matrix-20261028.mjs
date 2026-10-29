/** Focused executable evidence validator: EXO source proof, not Modaris parity. */
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {existsSync, readFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {behavioralMatrix,matrixDimensions,comparisonAuthority} from './modaris-2d-command-behavior-matrix-20261028.mjs'

const dir=path.dirname(fileURLToPath(import.meta.url))
const referenceEvidence = {
  'numerical-anchor': [
    /data-native-construction-preview/, /beforeCommit=await snapshot\(\)/,
    /'UI preview must never mutate source geometry'/, /kind==='Anchor'/,
    /Native Undo failed/, /'Arbitrary JavaScript syntax must never produce an editable construction'/,
  ],
  'cross-panel-anchor-group': [
    /Cross-panel source panel/, /Cross-panel target anchor/, /Cross-panel native batch preview/,
    /Confirm this exact two-panel native transaction/, /\['AnchorGroup','AnchorGroup'\]/,
    /detail:'undo'/, /detail:'redo'/,
  ],
  'notch-and-seam-allowance': [
    /kind:'Notch'/, /kind:'SeamAllowance'/, /kind:'RemoveNotch'/,
    /t:2/, /assert\.equal\(bad\.ok,false/, /op:'undo'/,
    /op:'redo'/, /op:'save'/,
  ],
}

assert.match(comparisonAuthority.modaris,/unverified/i)
assert.match(comparisonAuthority.parity,/no parity claim/i)
assert.equal(behavioralMatrix.length,3)
assert.equal(new Set(behavioralMatrix.map(row=>row.id)).size,behavioralMatrix.length)
for(const row of behavioralMatrix){
  assert.deepEqual(Object.keys(row.checks),matrixDimensions,`Required matrix dimensions for ${row.id}`)
  assert(row.evidence.startsWith('qa-v2-'),`Use a real runnable integration test: ${row.id}`)
  const testPath=path.join(dir,row.evidence)
  assert(existsSync(testPath),`Evidence fixture missing for ${row.id}`)
  const source=readFileSync(testPath,'utf8')
  for(const pattern of referenceEvidence[row.id]){
    assert.match(source,pattern,`${row.id} source evidence changed; revisit matrix assertion`)
  }
  assert.equal(row.checks.shortcut,null,`Unknown keyboard shortcut must remain explicitly unverified: ${row.id}`)
  assert(row.checks.geometry,`Native geometry evidence is mandatory: ${row.id}`)
}
assert.equal(behavioralMatrix.filter(row=>row.checks.saveReopen===null).length,2)
assert.match(behavioralMatrix[2].checks.saveReopen,/not verified/)
// Execute a real isolated Rust service fixture, including geometry, error rollback,
// native history and saved project serialization. Other rows remain inspected.
const execution=spawnSync(process.execPath,[path.join(dir,behavioralMatrix[2].evidence)],{
  cwd:path.resolve(dir,'../..'),encoding:'utf8',timeout:60000,maxBuffer:1024*1024,
})
assert.equal(execution.status,0,`Native fixture failed: ${execution.error?.message||execution.stderr||execution.stdout}`)
const nativeResult=JSON.parse(execution.stdout.trim())
assert.equal(nativeResult.passed,true)
for(const name of ['invalidRejected','undoRedo','savePersists','constructionAndDrapePreserved'])
  assert.equal(nativeResult[name],true,`Native assertion failed: ${name}`)
console.log(JSON.stringify({passed:true,kind:'EXO evidence matrix integrity',rows:behavioralMatrix.length,
  checkedDimensions:matrixDimensions,linkedRunnableFixtures:behavioralMatrix.map(row=>row.evidence),
  executedFixtures:[behavioralMatrix[2].evidence],sourceInspectedOnly:behavioralMatrix.slice(0,2).map(row=>row.evidence),
  executedNativeProof:{geometry:true,errorRollback:true,undoRedo:true,saveSerialization:true,reopen:false},
  licensedModarisAcceptance:'unverified',shortcutMapping:'unverified',
  note:'Other two browser/Rust fixtures source-inspected only in this run.'}))
