import test from 'node:test'
import assert from 'node:assert/strict'
import {measureDraftEdge20261023,draftNotchByLength20261023,compareDraftSeams20261023,measureDraftPolyline20261023} from './exoPatternDraftConstruction20261023.js'

const polygon={points:[[0,0],[.1,0],[.1,.1],[0,.1]],edges:['bottom','right','top','left']}
test('straight edge length and notch are measured in metres; original untouched',()=>{
  const before=JSON.stringify(polygon)
  const result=measureDraftEdge20261023(polygon,'bottom')
  assert.equal(result.ok,true)
  assert.ok(Math.abs(result.lengthM-.1)<1e-12)
  const notch=draftNotchByLength20261023(polygon,'bottom',{distanceM:.025})
  assert.equal(notch.ok,true)
  assert.ok(Math.abs(notch.position[0]-.025)<1e-10)
  assert.ok(Math.abs(notch.t-.25)<1e-10)
  assert.equal(notch.committed,false)
  assert.equal(JSON.stringify(polygon),before)
})
test('cubic with asymmetric control differs from straight chord and quarter distance differs from cubic parameter quarter',()=>{
  const curved={...polygon,curves:{bottom:[[0,.13],[.09,.19]]}}
  const result=measureDraftEdge20261023(curved,'bottom',{toleranceM:1e-6})
  assert.equal(result.ok,true)
  assert.equal(result.converged,true)
  assert.ok(result.lengthM>.2)
  const notch=draftNotchByLength20261023(curved,'bottom',{fraction:.25,toleranceM:1e-6})
  assert.equal(notch.ok,true)
  assert.ok(Math.abs(notch.t-.25)>.005)
  assert.ok(notch.position[1]>.01)
})
test('named free-curve knots participate in physical measurements',()=>{
  const curved={...polygon,free_curve_points:{bottom:[{t:.5,position:[.05,.06],derivative:[.1,0]}]}}
  const result=measureDraftEdge20261023(curved,'bottom')
  assert.equal(result.ok,true)
  assert.ok(result.lengthM>.14)
  assert.ok(Math.abs(draftNotchByLength20261023(curved,'bottom',{fraction:.5}).position[0]-.05)<.003)
})
test('seam pair reports ease independently of mismatch and never certifies manufacture',()=>{
  const same=compareDraftSeams20261023(polygon,'bottom',polygon,'top',{maximumMismatchM:.001})
  assert.equal(same.withinTolerance,true)
  assert.equal(same.manufacturingApproved,false)
  const eased=compareDraftSeams20261023(polygon,'bottom',polygon,'right',{easeAllowanceM:.01})
  assert.equal(eased.withinTolerance,false)
  assert.ok(Math.abs(eased.differenceM+.01)<1e-10)
})
test('rejects corrupt, collapsed, nonfinite and out-of-range geometry',()=>{
  assert.equal(measureDraftPolyline20261023([[0,0],[.03,.04]]).lengthM,.05)
  assert.equal(measureDraftPolyline20261023([[0,0],[0,0]]).ok,false)
  assert.equal(measureDraftPolyline20261023([[0,0],[NaN,1]]).ok,false)
  assert.equal(measureDraftEdge20261023({...polygon,points:[[0,0],[0,0],...polygon.points.slice(2)]},'bottom').ok,false)
  assert.equal(measureDraftEdge20261023({...polygon,curves:{bottom:[[0,Infinity],[.2,0]]}},'bottom').ok,false)
  assert.equal(measureDraftEdge20261023({...polygon,free_curve_points:{bottom:[{t:.6,position:[.04,0]},{t:.4,position:[.05,0]}]}},'bottom').ok,false)
  assert.equal(draftNotchByLength20261023(polygon,'bottom',{fraction:1.1}).ok,false)
  assert.equal(draftNotchByLength20261023(polygon,'bottom',{fraction:.5,distanceM:.03}).ok,false)
  assert.equal(compareDraftSeams20261023(polygon,'bottom',polygon,'top',{maximumMismatchM:Infinity}).ok,false)
})
