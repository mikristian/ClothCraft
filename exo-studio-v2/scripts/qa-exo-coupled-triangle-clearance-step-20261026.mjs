import test from 'node:test'
import assert from 'node:assert/strict'
import {proposeCoupledTriangleClearanceStepResearch20261026 as propose} from
  '../src/core/backends/nativeCoupledTriangleClearanceStepResearch20261026.js'

const sample = (height=3) => ({
  positions:[[0,0,0],[2,0,0],[0,2,0],[0,0,height],[2,0,height],[0,2,height]],
  faces:[[0,1,2],[3,4,5]], seams:[[0,3]], bends:[[1,2,Math.sqrt(8)]],
  clearanceMm:1, stepSizes:[0.5,0.1,0.01],
})

test('bounded gradient descent produces detached seam improvement with full disjoint-face static clearance',()=>{
  const input=sample(), before=structuredClone(input)
  const result=propose(input)
  assert.equal(result.accepted,true)
  assert.equal(result.checkedDisjointPairs,1)
  assert.ok(result.candidateDistanceMm>1)
  assert.ok(result.linearPathClearanceBoundMm>1)
  assert.ok(result.next.totalEnergy<result.original.totalEnergy)
  assert.ok(result.next.maxSeamGapMm<result.original.maxSeamGapMm)
  assert.ok(result.next.rmsSeamGapMm<result.original.rmsSeamGapMm)
  assert.deepEqual(input,before)
  assert.equal(result.physicalAcceptance,false)
  assert.equal(result.principalStrainChecked,false)
  assert.equal(result.sweptDeformableCCDCertified,false)
  assert.equal(result.safeToAutoApply,false)
})

test('backtracking refuses penetrating first step and accepts smaller statically clear step',()=>{
  const result=propose(sample(1.2))
  assert.equal(result.accepted,true)
  assert.ok(result.stepScale<0.5)
  assert.ok(result.candidateDistanceMm>1)
})

test('detached candidate obeys the per-vertex displacement budget',()=>{
  const input=sample()
  input.maxStepMm=0.01
  const result=propose(input)
  assert.equal(result.accepted,true)
  for(let i=0;i<input.positions.length;i++) {
    const distance=Math.hypot(...result.candidate[i].map((v,k)=>v-input.positions[i][k]))
    assert.ok(distance<=0.010000000001)
  }
  assert.equal(result.safeToAutoApply,false)
})

test('a coincident positive-rest bending edge in the first trial backtracks safely',()=>{
  const input=sample()
  input.positions.push([0,0,10],[2,0,10])
  input.seams=[[6,7]]
  input.bends=[[6,7,2]]
  const original=structuredClone(input)
  const result=propose(input)
  assert.equal(result.accepted,true)
  assert.equal(result.stepScale,0.1)
  assert.ok(result.next.totalEnergy<result.original.totalEnergy)
  assert.deepEqual(input,original)
})

test('already-invalid initial triangle clearance cannot be masked by improving seam merit',()=>{
  const result=propose(sample(0.5))
  assert.equal(result.accepted,false)
  assert.equal(result.reason,'invalid-initial-contact')
  assert.equal(result.candidate,null)
})

test('transverse triangle piercing is zero clearance even when all vertices differ',()=>{
  const input=sample()
  input.positions[3]=[0.5,0.5,-1]
  input.positions[4]=[0.5,0.5,1]
  input.positions[5]=[1.5,1.5,0.2]
  const result=propose(input)
  assert.equal(result.accepted,false)
  assert.equal(result.baselineDistanceMm,0)
})

test('every disjoint face pair is included, not just one caller-selected contact',()=>{
  const input=sample()
  input.positions.push([0,0,0.5],[2,0,0.5],[0,2,0.5])
  input.faces.push([6,7,8])
  const result=propose(input)
  assert.equal(result.checkedDisjointPairs,3)
  assert.equal(result.accepted,false)
})

test('rejects a seam-improving terminally clear step that pierces a triangle midway',()=>{
  const input={
    positions:[[0,0,0],[2,0,0],[0,2,0],
      [0,0,3],[2,0,3],[0,2,3],
      [0,0,-30],[2,0,-30],[0,2,-30]],
    faces:[[0,1,2],[3,4,5]], seams:[[3,6],[4,7],[5,8]],
    bends:[[0,1,2]], stepSizes:[0.2], maxStepMm:100, clearanceMm:1,
  }
  const before=structuredClone(input)
  const result=propose(input)
  // The old endpoint-only gate accepted a 3 -> -3.6 mm triangle movement.
  assert.equal(result.baselineDistanceMm,3)
  assert.equal(result.accepted,false)
  assert.equal(result.reason,'no-feasible-descent-step')
  assert.deepEqual(input,before)
})

test('rejects a narrow path crossing even when all five sampled poses are clear',()=>{
  const input={
    positions:[[0,0,0],[2,0,0],[0,2,0],
      [0,0,3],[2,0,3],[0,2,3],
      [0,0,-117],[2,0,-117],[0,2,-117]],
    faces:[[0,1,2],[3,4,5]], seams:[[3,6],[4,7],[5,8]],
    bends:[[0,1,2]], stepSizes:[0.2], maxStepMm:100, clearanceMm:1,
  }
  const result=propose(input)
  // Moving triangle travels 3 -> -21 mm; crossing at t=1/8 lies exactly
  // between samples t=0 and t=1/4, both 3 mm from the static triangle.
  assert.equal(result.accepted,false)
  assert.equal(result.reason,'no-feasible-descent-step')
})

test('malformed topology and sparse arrays fail closed without editing source',()=>{
  for(const mutation of [
    x=>{delete x.positions[1][1]},
    x=>{x.faces[1]=[3,4,4]},
    x=>{x.faces[1]=[3,4,99]},
    x=>{x.stepSizes=[0.5,NaN]},
    x=>{delete x.stepSizes[1]},
    x=>{delete x.faces[1]},
    x=>{delete x.positions[1]},
    x=>{x.seams=[]},
    x=>{x.bends=[]},
    x=>{x.clearanceMm=-1},
  ]) {
    const input=sample();mutation(input)
    assert.throws(()=>propose(input),/invalid/i)
  }
})
