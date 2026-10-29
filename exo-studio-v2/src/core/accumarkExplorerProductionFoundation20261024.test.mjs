import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkExplorerOrder20261024 as build,
 exportAccuMarkExplorerOrderCsv20261024 as csv,
 auditAccuMarkExplorerOrderCsv20261024 as audit} from './accumarkExplorerProductionFoundation20261024.js'
const piece=(id,fabricId='main')=>({id,name:id,points:[{x:0,y:0},{x:6,y:0},{x:6,y:5},{x:0,y:5}],fabricId,cutQuantity:2})
const project={id:'MODEL-001',pieces:[piece('front'),piece('back')],grading:{sizes:['S','M'],baseSize:'M'}}
const opts={styleId:'STYLE-001',orderId:'ORDER-123',quantitiesBySize:{S:3,M:2},stockByFabric:{main:30}}
test('builds referentially valid model/order, demanded pieces, and source-stable CSV',()=>{
 const before=structuredClone(project),o=build(project,opts)
 assert.equal(o.ok,true,o.code)
 assert.equal(o.order.totalGarments,5)
 assert.equal(o.order.totalPieces,20)
 assert.deepEqual(o.order.demand.map(x=>x.required),[6,6,4,4])
 assert.equal(o.order.productionApproved,false)
 assert.equal(audit(csv(o),o).ok,true)
 assert.deepEqual(project,before)
})
test('stock shortages block without approved tickets',()=>{
 const o=build(project,{...opts,stockByFabric:{main:10}})
 assert.equal(o.ok,false);assert.equal(o.code,'STOCK_SHORTAGE')
 assert(o.order.blockers.includes('INSUFFICIENT_STOCK:main'))
})
test('rejects duplicate case IDs, missing size, invalid quantities or IDs',()=>{
 assert.equal(build({...project,pieces:[piece('FRONT'),piece('front')]},opts).code,'DUPLICATE_PIECE')
 assert.equal(build(project,{...opts,quantitiesBySize:{S:1}}).code,'INVALID_ORDER')
 assert.equal(build(project,{...opts,styleId:'../..'}).code,'INVALID_IDENTIFIERS')
 assert.equal(build({...project,grading:{sizes:['S','s']}},opts).code,'INVALID_SIZES')
 assert.equal(build({...project,pieces:[piece('front'),{...piece('back'),cutQuantity:0}]},opts).code,'INVALID_CUT_QUANTITY')
})
test('CSV tampering, orphan source, spurious fabric refuse',()=>{
 const result=build(project,opts),document=csv(result)
 assert.equal(audit(document.replace('ORDER-123','OTHER'),result).code,'CSV_MISMATCH')
 assert.equal(audit(document.replace('false','true'),result).code,'CSV_MISMATCH')
 assert.equal(build(project,{...opts,stockByFabric:{other:20}}).code,'INVALID_STOCK')
})
