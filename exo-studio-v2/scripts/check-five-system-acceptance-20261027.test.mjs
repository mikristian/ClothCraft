import test from 'node:test'
import assert from 'node:assert/strict'
import {runFiveSystemAcceptance20261027} from './check-five-system-acceptance-20261027.mjs'

test('cross-system acceptance detects failed, missing and empty test executions',()=>{
  let calls=0
  const success=()=>({status:0,stdout:'ℹ tests 2\nℹ pass 2\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0',stderr:''})
  const full=runFiveSystemAcceptance20261027({runner:(...args)=>{calls++;return success(...args)}})
  assert.equal(calls,4)
  assert.equal(full.ok,true)
  assert.equal(full.verifiedTests,8)
  assert.deepEqual(full.reports.map(report=>report.system),['fabric-physics','3d-assembly','avatar-measurements','manufacturing-export'])
  assert.equal(full.physicalFitCertified,false)
  const failing=runFiveSystemAcceptance20261027({runner:(_binary,args)=>args.some(arg=>arg.includes('measurements.customAnnotationValidation'))
    ? {status:0,stdout:'ℹ tests 3\nℹ pass 2\nℹ fail 1\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0'} : success()})
  assert.equal(failing.ok,false)
  assert.equal(failing.reports.find(r=>r.system==='avatar-measurements').ok,false)
  const empty=runFiveSystemAcceptance20261027({runner:()=>({status:0,stdout:'',stderr:''})})
  assert.equal(empty.ok,false,'zero tests cannot count as verified acceptance')
})

test('acceptance gate rejects incomplete, skipped or spoofed test summaries',()=>{
  const make=stdout=>({status:0,stdout,stderr:''})
  const run=stdout=>runFiveSystemAcceptance20261027({runner:()=>make(stdout)})
  assert.equal(run('ℹ tests 3\nℹ pass 3\nℹ fail 0').ok,false,'missing summary metrics')
  assert.equal(run('ℹ tests 3\nℹ pass 2\nℹ fail 0\nℹ cancelled 0\nℹ skipped 1\nℹ todo 0').ok,false)
  assert.equal(run('ℹ tests 1\nℹ pass 1\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 1').ok,false)
  assert.equal(run('ℹ tests 2\nℹ pass 2\nℹ fail 0\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0\nℹ tests 2\nℹ pass 1\nℹ fail 1\nℹ cancelled 0\nℹ skipped 0\nℹ todo 0').ok,false)
  assert.equal(run('# tests 1\n# pass 1\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0').ok,true)
})
