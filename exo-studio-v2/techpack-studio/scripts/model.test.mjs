import test from 'node:test'
import assert from 'node:assert/strict'
import {audit,changedFields,createPack,deep,evaluateSample,landedCost,revision} from '../src/model.js'

test('template presets have independent editable manufacturing records',()=>{
 const a=createPack('hoodie'),b=createPack('tee')
 assert.notEqual(a.id,b.id)
 assert.notEqual(a.measurements[0].id,b.measurements[0].id)
 assert(a.blocks.length>=9)
 assert.equal(a.sizes.length,5)
 assert(a.measurements.every(m=>a.sizes.every(s=>Number.isFinite(m.values[s]))))
 assert(a.bom.every(m=>Number.isFinite(m.qty*m.unitCost)))
})
test('cost sheet correctly handles item consumption and production adders',()=>{
 const pack=createPack('hoodie')
 const detail=landedCost(pack)
 const manual=pack.bom.reduce((sum,m)=>sum+m.qty*m.unitCost,0)
 assert(Math.abs(detail.materials-manual)<1e-9)
 assert(Math.abs(detail.total-(detail.production*(1+pack.cost.dutyPercent/100)+pack.cost.freight))<1e-9)
 assert(detail.total>0)
})
test('revision snapshot survives later edits with independent identity and change report',()=>{
 const source=createPack('pants')
 const first=revision(source,'R01 · Prototype')
 const former=deep(first.revisions[0].snapshot)
 const later={...first,name:'Updated pants',measurements:deep(first.measurements)}
 later.measurements[0].values.M=100
 assert.equal(first.revisions[0].snapshot.name,former.name)
 assert.deepEqual(first.revisions[0].snapshot.measurements,former.measurements)
 assert(changedFields(first.revisions[0].snapshot,later).includes('name'))
 assert(changedFields(first.revisions[0].snapshot,later).includes('measurements'))
})
test('factory readiness remains incomplete without confirmed factory, artwork and samples',()=>{
 const state=audit(createPack())
 assert.equal(state.ready,false)
 assert(state.completed<10)
 assert(state.items.some(([name,ok])=>name==='Approved physical sample'&&!ok))
})
test('category-specific pant grading and fit deviations respect absolute tolerance',()=>{
 const pack=createPack('pants')
 assert(pack.measurements.some(row=>/inseam/i.test(row.description)))
 const waist=pack.measurements[0]
 const target=waist.values.M
 const passing=evaluateSample(pack,{size:'M',measurements:{[waist.id]:target+waist.tolerance}})
 assert.equal(passing.measuredCount,1)
 assert.equal(passing.rows[0].pass,true)
 const failing=evaluateSample(pack,{size:'M',measurements:{[waist.id]:target+waist.tolerance+.11}})
 assert.equal(failing.outOfTolerance,1)
 const empty=evaluateSample(pack,{size:'M',measurements:{}})
 assert.equal(empty.rows[0].pass,null)
})
