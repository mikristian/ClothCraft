import test from 'node:test'
import assert from 'node:assert/strict'
import {assessSimulationFit} from './qualityGate.js'

const certified = value => ({
  structural:{maxStrainPercent:value},sewing:{maxGapMm:value},
  collision:{maximumIntrusionMm:value,triangleCcdVerified:true,allFrameIntersectionFree:true},
})

test('physical fit gate distinguishes measured finite zero from absent or corrupt metrics',()=>{
  assert.equal(assessSimulationFit(certified(0)).status,'MEASURED_PASS')
  for(const invalid of [null,'', '0',-1,NaN,Infinity]){
    const report=assessSimulationFit(certified(invalid))
    assert.equal(report.status,'UNVERIFIED',String(invalid))
    assert.deepEqual(report.unknown,['structural-strain-not-measured','seam-gap-not-measured','avatar-intrusion-not-measured'])
  }
  assert.equal(assessSimulationFit({}).status,'UNVERIFIED')
})

test('real excessive strain or seam gap cannot pass when collision telemetry is certified',()=>{
  const result=assessSimulationFit({...certified(0),sewing:{maxGapMm:10}})
  assert.equal(result.status,'FAILED')
  assert(result.failures.includes('open-sewing-seams'))
  assert.equal(result.factoryApproved,false)
})
