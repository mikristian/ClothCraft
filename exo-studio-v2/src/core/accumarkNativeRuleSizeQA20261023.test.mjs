import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {inspectAccuMarkNativeRuleSizeQA20261023} from './accumarkNativeRuleSizeQA20261023.js'
import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'

const fixture=()=>({template:{panels:[
  {id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['top','right','bottom','left']}},
  {id:'back',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['top','right','bottom','left'],
    curves:{top:[[.05,-.015],[.15,-.015]]}}},
]}})
const setup=snap=>createAccuMarkNativeRuleSet(snap).ruleSet
const edit=(s,r,p,index,size,dxMm,dyMm)=>{
  const change=editAccuMarkNativePointRule(s,r,{panelId:p,pointIndex:index,size,dxMm,dyMm})
  assert.equal(change.ok,true,change.reason)
  return change.ruleSet
}

test('all panels and six sizes; sampled cubic perimeter, signed area and base preserved',()=>{
  const snap=fixture(),saved=structuredClone(snap),ruleSet=setup(snap)
  const result=inspectAccuMarkNativeRuleSizeQA20261023(snap,ruleSet)
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.blocks.length,2)
  assert.deepEqual(result.blocks[0].rows.map(r=>r.size),['XS','S','M','L','XL','XXL'])
  const front=result.blocks[0].rows[2],back=result.blocks[1].rows[2]
  assert(Math.abs(front.perimeterMm-1000)<.001)
  assert.equal(front.widthMm,200)
  assert.equal(front.heightMm,300)
  assert.equal(front.areaMm2,60000)
  assert(back.perimeterMm>front.perimeterMm)
  assert(back.areaMm2>front.areaMm2)
  assert.deepEqual(snap,saved)
})

test('curved graded perimeter uses native Rust physical edge lengths rather than sampled chord estimates',()=>{
  const snap=fixture()
  snap.template.panels[1].polygon.curves.top=[[.015,-.14],[.185,-.14]]
  let rules=setup(snap)
  rules=edit(snap,rules,'back',0,'L',12,-3)
  const result=inspectAccuMarkNativeRuleSizeQA20261023(snap,rules)
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  const nativeBase=snap.template.panels[1].polygon
  const expectedBase=nativeBase.edges.reduce((sum,edge)=>{
    const measured=nativeRustEdgeLength20261023(nativeBase,edge)
    assert.equal(measured.ok,true,measured.reason)
    return sum+measured.totalLengthM*1000
  },0)
  const rows=result.blocks.find(item=>item.panelId==='back').rows
  const base=rows.find(row=>row.size==='M')
  assert(Math.abs(base.perimeterMm-expectedBase)<1e-8)
  assert(base.perimeterMm-base.sampledPerimeterMm>.05,
    'fixed-chord estimate should be measurably shorter on strongly curved edges')
  assert.equal(base.perimeterMeasurement,'NATIVE_RUST_CURVE_FLATTEN_0_25MM')
  const changed=rows.find(row=>row.size==='L')
  assert(Number.isFinite(changed.perimeterMm))
  assert.notEqual(changed.perimeterMm,base.perimeterMm)
  assert.equal(result.manufacturingApproved,false)
})

test('unresolvable native free-curve semantics cannot yield a partial physical perimeter',()=>{
  const snap=fixture()
  snap.template.panels[0].polygon.free_curve_points={top:[{
    t:.5,position:[.1,-.02],derivative:[.2,0],mirror_group:'requires-rust-resolution',
  }]}
  const rules=setup(snap)
  const report=inspectAccuMarkNativeRuleSizeQA20261023(snap,rules)
  assert.equal(report.ok,false)
  assert.equal(report.manufacturingApproved,false)
  const rows=report.blocks.find(block=>block.panelId==='front').rows
  assert.equal(rows.length,6)
  for(const row of rows){
    assert.equal(row.perimeterMm,null,'do not display a sum that omits a physical edge')
    assert(row.blockers.some(reason=>/Mirrored free curve knots require native resolution/.test(reason)))
  }
})

test('collapsed edge and self-crossing sizes are blocked',()=>{
  const snap=fixture()
  let rules=setup(snap)
  rules=edit(snap,rules,'front',1,'L',-200,0)
  const collapse=inspectAccuMarkNativeRuleSizeQA20261023(snap,rules)
  assert.equal(collapse.ok,false)
  assert(collapse.blocks[0].rows.find(r=>r.size==='L').blockers.some(s=>/Collapsed/.test(s)))
  rules=setup(snap)
  rules=edit(snap,rules,'front',1,'XL',-250,200)
  const bowtie=inspectAccuMarkNativeRuleSizeQA20261023(snap,rules)
  assert.equal(bowtie.ok,false)
  assert(bowtie.blocks[0].rows.find(r=>r.size==='XL').blockers.some(s=>/Self-crossing/.test(s)))
})

test('orientation flip, stale rules, invalid curve and sample-cap fail closed',()=>{
  const snap=fixture()
  let rules=setup(snap)
  rules=edit(snap,rules,'front',1,'XXL',-400,0)
  rules=edit(snap,rules,'front',2,'XXL',-400,0)
  const flipped=inspectAccuMarkNativeRuleSizeQA20261023(snap,rules)
  assert.equal(flipped.ok,false)
  assert(flipped.blocks[0].rows.find(r=>r.size==='XXL').blockers.some(s=>/sign flipped/.test(s)))
  const stale=structuredClone(snap)
  stale.template.panels[0].polygon.points[0][0]=.002
  const rejected=inspectAccuMarkNativeRuleSizeQA20261023(stale,rules)
  assert.equal(rejected.ok,false)
  assert.equal(rejected.blocks.length,0)
  const bad=fixture()
  bad.template.panels[1].polygon.free_curve_points={top:[{t:.6,position:[.15,-.01]},{t:.4,position:[.12,-.02]}]}
  assert.equal(inspectAccuMarkNativeRuleSizeQA20261023(bad,setup(bad)).ok,false)
  const large=fixture()
  large.template.panels[1].polygon.free_curve_points={top:Array.from({length:12},(_,i)=>({t:(i+1)/13,position:[.01*(i+1),-.01]}))}
  const tooMany=inspectAccuMarkNativeRuleSizeQA20261023(large,setup(large))
  assert.equal(tooMany.ok,false)
  assert(tooMany.issues.some(i=>/complex/i.test(i.message)))
})

test('sub-micron nonzero physical boundary is blocked even with finite native length',()=>{
  const snap=fixture()
  snap.template.panels[0].polygon.points[1]=[0.0000000005,0]
  const result=inspectAccuMarkNativeRuleSizeQA20261023(snap,setup(snap))
  assert.equal(result.ok,false)
  assert(result.blocks.find(block=>block.panelId==='front').rows.every(row=>
    row.blockers.some(message=>message.includes('Collapsed native physical edge top'))))
})
