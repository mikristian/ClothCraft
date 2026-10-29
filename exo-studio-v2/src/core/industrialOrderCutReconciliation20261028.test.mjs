import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkExplorerOrder20261024 as order} from './accumarkExplorerProductionFoundation20261024.js'
import {buildAccuMarkCutRoomPlan as cutPlan} from './accumarkCutRoomPlan20261024.js'
import {inspectIndustrialOrderCutReconciliation20261028 as inspect} from './industrialOrderCutReconciliation20261028.mjs'

const project=()=>({id:'disposable-style',grading:{sizes:['S','M'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[
 {id:'front',name:'Front',fabricId:'shell',cutQuantity:2,grainAngleDeg:0,points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]},
 {id:'collar',name:'Collar',fabricId:'rib',cutQuantity:1,grainAngleDeg:0,points:[{x:0,y:0},{x:7,y:0},{x:7,y:3},{x:0,y:3}]},
]})
const quantities=()=>({S:2,M:1})
const fixture=()=>{
 const source=project(),qty=quantities(),explorer=order(source,{styleId:'TEE-1',orderId:'ORD-1',quantitiesBySize:qty})
 assert.equal(explorer.ok,true,explorer.code)
 const plans={}
 for(const fabricId of ['shell','rib']){
  plans[fabricId]=cutPlan(source,{fabricId,quantitiesBySize:qty,fabricWidthCm:30,spacingCm:1,nap:true,maxPlyCount:2,
   rolls:[{rollId:`${fabricId}-ROLL`,batchId:`${fabricId}-BATCH`,fabricId,shade:'SHADE-1',nap:true,
    usableLengthCm:150,costPerMeter:20,widthCm:30}]})
  assert.equal(plans[fabricId].ok,true,JSON.stringify(plans[fabricId].issues))
 }
 return {source,explorer,plans}
}
const check=(change,expected)=>{
 const {source,explorer,plans}=fixture()
 change({source,explorer,plans})
 const result=inspect(source,explorer,plans)
 assert.equal(result.ok,false,`Unexpected acceptance for ${expected}`)
 assert(result.issues.some(i=>i.code===expected),JSON.stringify(result.issues))
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
}
test('real disposable two-size/two-fabric cut plans reconcile every ordered physical piece without mutation or approval',()=>{
 const {source,explorer,plans}=fixture()
 const before=structuredClone({source,explorer,plans})
 const result=inspect(source,explorer,plans)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.status,'DIGITAL_ORDER_CUT_RECONCILED')
 assert.deepEqual(result.sourceSizes,['S','M'])
 assert.equal(result.fabricCount,2)
 assert.equal(result.expectedPieces,9)
 assert.equal(result.observedPieces,9)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
 assert.deepEqual({source,explorer,plans},before)
})
test('missing fabric, duplicated order rows and altered order quantity block complete handoff',()=>{
 check(({plans})=>{delete plans.rib},'MISSING_FABRIC_PLAN')
 check(({explorer})=>{explorer.order.demand.push({...explorer.order.demand[0]})},'DUPLICATE_ORDER_DEMAND')
 check(({explorer})=>{explorer.order.quantitiesBySize.S=3},'ORDER_DEMAND_DRIFT')
 check(({explorer})=>{explorer.order.totalPieces++},'ORDER_TOTAL_OR_SOURCE_DRIFT')
})
test('wrong fabric, dropped physical pieces and duplicated tickets block all-size order reconciliation',()=>{
 check(({plans})=>{plans.shell.cutTickets[0].pieces[0].total--},'CUT_TICKET_QUANTITY_DRIFT')
 check(({plans})=>{plans.shell.cutTickets[0].pieces[0].pieceId='collar'},'CUT_TICKET_QUANTITY_DRIFT')
 check(({plans})=>{plans.shell.cutTickets[0].pieces=[]},'CUT_TICKET_PIECE_SET')
 check(({plans})=>{plans.shell.cutTickets[1].ticketId=plans.shell.cutTickets[0].ticketId},'DUPLICATE_CUT_TICKET')
})
test('tampered lay identity, fabric size counts and roll inventory never become cutter approval',()=>{
 check(({plans})=>{plans.rib.cutTickets[0].size='M'},'CUT_TICKET_LAY_DRIFT')
 check(({plans})=>{plans.shell.manifest.quantitiesBySize.S=9},'PLAN_SIZE_QUANTITIES')
 check(({plans})=>{plans.rib.rollAllocation[0].remainingCm=-1},'ROLL_TRACEABILITY_DRIFT')
 check(({plans})=>{plans.rib.rollAllocation[0].rollId=plans.shell.rollAllocation[0].rollId},'ROLL_TRACEABILITY_DRIFT')
 check(({plans})=>{plans.rib.rollAllocation[0].consumedCm+=2;plans.rib.rollAllocation[0].remainingCm-=2},'ROLL_LAY_CONSUMPTION_DRIFT')
 check(({plans})=>{plans.rib.lays[0].startOffsetCm+=1},'LAY_ROLL_LENGTH_DRIFT')
 check(({plans})=>{plans.rib.lays[0].batchId='FORGED-BATCH'},'LAY_ROLL_LENGTH_DRIFT')
 check(({plans})=>{plans.rib.manifest.cutTickets=[]},'PLAN_MANIFEST_DRIFT')
})
test('source changes after cut planning invalidate source-linked BOM quantities',()=>{
 check(({source})=>{source.pieces[0].cutQuantity=3},'MODEL_PIECE_DRIFT')
 check(({source})=>{source.pieces[0].fabricId='rib'},'MISSING_FABRIC_PLAN')
})
