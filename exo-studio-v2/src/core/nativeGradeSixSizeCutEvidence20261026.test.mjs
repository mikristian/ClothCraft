import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectNativeGradeSixSizeCutEvidence20261026 as inspect} from './nativeGradeSixSizeCutEvidence20261026.js'

const sizes=['XS','S','M','L','XL','XXL']
const poly=(width=.3,allowance=.01)=>({
  points:[[0,0],[width,0],[width,.4],[0,.4]],edges:['a','b','c','d'],
  seam_allowances:{a:allowance,b:allowance,c:allowance,d:allowance},
  notches:{a:[],b:[],c:[],d:[]},
})
const fixture=()=>{
  const snapshot={revision:27,template:{seams:[],panels:[{id:'front',polygon:poly()}]}}
  const ruleSet={sizes:[...sizes],templateFingerprint:'fixture',panels:{front:{pointOffsetsMm:{L:[[0,0],[20,0],[20,0],[0,0]]}}}}
  const compiled={ok:true,byPanel:{front:{sizeRun:Object.fromEntries(sizes.map((size,i)=>
    [size,{polygon:poly(.3+i*.01)}]))}}}
  const evidence={sourceRevision:27,sourceTemplate:structuredClone(snapshot.template),
    sourceRuleSet:structuredClone(ruleSet),rows:sizes.map((size,i)=>({
      panelId:'front',size,stitchMm:[[0,0],[300+i*10,0],[300+i*10,400],[0,400]],
      cutMm:[[-10,-10],[310+i*10,-10],[310+i*10,410],[-10,410]],notchesMm:[],
    }))}
  return {snapshot,ruleSet,compiled,evidence}
}

test('all six actual mm CUT and STITCH contours independently compare to each graded rectangle',()=>{
  const f=fixture(),result=inspect(f.snapshot,f.ruleSet,f.compiled,f.evidence)
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  assert.deepEqual(result.sizes,sizes)
  assert.equal(result.rows.length,6)
  assert.equal(result.localGeometryVerified,true)
  assert.equal(result.authoritativeRust,false)
  assert.equal(result.independentlyVerified,false)
  assert.equal(result.cuttingAuthorized,false)
})

test('reject stale source, edited grading rules, contour tampering, loss of one size, and duplicated sizes',()=>{
  for(const mutate of [
    f=>{f.snapshot.revision++},
    f=>{f.ruleSet.panels.front.pointOffsetsMm.L[1][0]++},
    f=>{f.snapshot.template.panels[0].polygon.points[1][0]+=.01},
    f=>{f.evidence.rows[5].cutMm[1][0]+=2},
    f=>{f.evidence.rows[2].stitchMm[1][0]+=3},
    f=>{f.evidence.rows.pop()},
    f=>{f.evidence.rows[5]=structuredClone(f.evidence.rows[4])},
    f=>{f.evidence.rows[0].notchesMm=[[[0,0],[2,2]]]},
    f=>{f.compiled.byPanel.front.sizeRun.XL.polygon.seam_allowances.a=.03},
    f=>{f.snapshot.template.seams=[{id:'join'}];f.evidence.sourceTemplate=structuredClone(f.snapshot.template)},
  ]){
    const f=fixture();mutate(f)
    const result=inspect(f.snapshot,f.ruleSet,f.compiled,f.evidence)
    assert.equal(result.ok,false,JSON.stringify(result))
    assert.equal(result.manufacturingApproved,false)
  }
})

test('reject unsupported variable seam offsets, non-rectangular positive offsets and physical notches',()=>{
  for(const mutate of [
    p=>{p.seam_allowances.b=.02},
    p=>{p.points[1][1]=.05},
    p=>{p.notches.a=[{t:.5,depth_m:.005}]},
    p=>{p.curves={a:{type:'bezier'}}},
  ]){
    const f=fixture()
    mutate(f.compiled.byPanel.front.sizeRun.M.polygon)
    assert.equal(inspect(f.snapshot,f.ruleSet,f.compiled,f.evidence).ok,false)
  }
})
