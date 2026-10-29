import assert from 'node:assert/strict'
import {test} from 'node:test'
import {sewingLengthDiagnostic,inspectSewingLengths} from './sewingLengthDiagnostics.js'

const measurement=(first3DCm,second3DCm)=>({
  seamId:'sample-seam',
  first:{length2DCm:12,length3DCm:first3DCm},
  second:{length2DCm:12,length3DCm:second3DCm},
})

test('negative optional 3D seam lengths are unavailable, not factory dimensions',()=>{
  const row=sewingLengthDiagnostic(measurement(-8,-0.001))
  assert.equal(row.valid,true)
  assert.equal(row.first3DCm,null)
  assert.equal(row.second3DCm,null)
  assert.equal(row.warning,false)
})

test('zero and positive 3D lengths remain valid optional measurements',()=>{
  const row=sewingLengthDiagnostic(measurement(0,12.5))
  assert.equal(row.first3DCm,0)
  assert.equal(row.second3DCm,12.5)
})

test('nonfinite 3D measurements remain unavailable and do not change 2D counts',()=>{
  const report=inspectSewingLengths([measurement(Infinity,NaN)])
  assert.equal(report.measured,1)
  assert.equal(report.unavailable,0)
  assert.equal(report.warnings,0)
  assert.equal(report.rows[0].first3DCm,null)
  assert.equal(report.rows[0].second3DCm,null)
})

test('invalid 2D lengths still invalidate the complete sewing diagnostic',()=>{
  const row=sewingLengthDiagnostic({first:{length2DCm:-1,length3DCm:10},second:{length2DCm:12,length3DCm:12}})
  assert.equal(row.valid,false)
  assert.equal(row.firstCm,null)
  assert.equal(row.secondCm,null)
})
