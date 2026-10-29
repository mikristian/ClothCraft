import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectAccuMarkNativeGradePoint20261023 as inspect} from './accumarkNativeGradePointInspector20261023.js'
import {buildAccuMarkNativeMultiPanelNest20261023 as build} from './accumarkNativeMultiPanelNest20261023.js'

const fixture=()=>({revision:4,template:{panels:[{id:'front',polygon:{
 points:[[.1,.2],[.3,.2],[.3,.3],[.1,.3]],edges:['a','b','c','d']}}],seams:[]},
 panels:[{id:'front',boundaries:{edge:[0,1,2,3]},layout:[0,0]}],
 uv:[[.1,.2],[.3,.2],[.3,.3],[.1,.3]]})

test('XS-XXL native point matrix uses source-aligned true affine proposals in millimetres',()=>{
 const original=fixture(),before=structuredClone(original)
 const run=build(original,{widthStepMm:10,heightStepMm:5})
 assert.equal(run.ok,true,run.reason)
 const table=inspect(run.byPanel.front,{pointIndex:1})
 assert.equal(table.ok,true,table.reason)
 assert.equal(table.source,'AFFINE_PROPOSAL_NOT_COMMITTED_GRADING')
 assert.equal(table.rows.length,6)
 const base=table.rows.find(row=>row.size==='M')
 assert.equal(base.dxMm,0);assert.equal(base.dyMm,0)
 assert.ok(table.rows.find(row=>row.size==='XL').dxMm>0)
 assert.ok(table.rows.find(row=>row.size==='XS').dxMm<0)
 assert.equal(table.editable,false)
 assert.equal(table.manufacturingApproved,false)
 assert.deepEqual(original,before)
})

test('unsupported, stale, malformed and out-of-range native point tables fail closed',()=>{
 const p=build(fixture(),{widthStepMm:10,heightStepMm:5}).byPanel.front
 assert.equal(inspect(p,{pointIndex:99}).ok,false)
 assert.equal(inspect({...p,source:'UNVERIFIED'},{pointIndex:0}).ok,false)
 assert.equal(inspect({...p,sizeRun:{...p.sizeRun,XS:{panelId:'back',units:'m',polygon:p.basePolygon}}},{pointIndex:0}).ok,false)
 const bad=structuredClone(p);bad.sizeRun.XL.polygon.points[0][1]=Infinity
 assert.equal(inspect(bad,{pointIndex:0}).ok,false)
})
