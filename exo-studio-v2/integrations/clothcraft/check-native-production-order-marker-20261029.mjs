import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'
import {generateNativeOrderMarkers,nativeSourceFingerprint,nativeCutlineFingerprint} from './native-production-order-marker-20261029.mjs'

const sizes=['XS','S','M','L','XL','XXL']
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-order-'))
const workspace=createWorkspace(dir)
let snapshot
async function rpc(packet) {
  const reply=await workspace.request({revision:snapshot?.revision,...packet})
  assert.equal(reply.ok,true,`${packet.op}: ${reply.error}`)
  if(reply.data?.template)snapshot=reply.data
  return reply.data
}
const blocked=(project,cuts,order,pattern)=>{
  assert.throws(()=>generateNativeOrderMarkers(project,cuts,order),pattern)
}
try {
  await rpc({op:'open',preset:'tshirt'})
  for(const panel of [...snapshot.template.panels])for(const edge of panel.polygon.edges)
    await rpc({op:'edit',command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.012}})
  const native=structuredClone(snapshot)
  const rules=createAccuMarkNativeRuleSet(native)
  assert.equal(rules.ok,true,rules.reason)
  for(const panel of native.template.panels)for(let i=0;i<sizes.length;i++){
    const factor=(i-2)*8
    rules.ruleSet.panels[panel.id].pointOffsetsMm[sizes[i]]=panel.polygon.points.map(([x,y])=>[x*factor,y*factor])
  }
  const prepared=prepareNativeGradeCatalog20261025(native,{template:structuredClone(native.template)},rules.ruleSet)
  assert.equal(prepared.ok,true,prepared.reason)
  await rpc({op:'grade-run-commit',gradeRun:prepared.gradeRun})
  const saved=(await rpc({op:'save'})).project
  const cuts=await rpc({op:'grade-run-cutlines'})
  const ids=saved.template.panels.map(p=>p.id)
  const order={
    sourceFingerprint:nativeSourceFingerprint(saved),nativeCutlineFingerprint:nativeCutlineFingerprint(cuts),sizes:[...sizes],panelIds:[...ids],
    quantitiesBySize:Object.fromEntries(sizes.map((size,i)=>[size,Object.fromEntries(ids.map((id,j)=>[id,2+(i+j)%3]))])),
    materialsByPanel:Object.fromEntries(ids.map((id,j)=>[id,{fabricId:'main',groupId:j%2?'lining-group':'shell-group',grainAngleDeg:0,nap:'one-way'}])),
    cuttingAuthorized:false
  }
  const create=(p=saved,c=cuts,o=order)=>generateNativeOrderMarkers(p,c,o)
  const result=create()
  assert.equal(result.results.length,6)
  const expectedCount=sizes.reduce((n,size)=>n+ids.reduce((sum,id)=>sum+order.quantitiesBySize[size][id],0),0)
  const actualCount=result.results.reduce((sum,row)=>sum+row.markers.reduce((n,r)=>n+r.marker.placements.length,0),0)
  assert.equal(actualCount,expectedCount)
  assert(expectedCount>6*ids.length)
  const copy=x=>structuredClone(x)
  const missing=copy(order);delete missing.quantitiesBySize.XS[ids[0]]
  blocked(saved,cuts,missing,/ORDER_QUANTITY_PANEL_MISMATCH/)
  const negative=copy(order);negative.quantitiesBySize.S[ids[0]]=-1
  blocked(saved,cuts,negative,/INVALID_ORDER_QUANTITY/)
  const extra=copy(order);extra.quantitiesBySize.M['forged']=3
  blocked(saved,cuts,extra,/ORDER_QUANTITY_PANEL_MISMATCH/)
  const stale=copy(saved);stale.template.name='forged'
  blocked(stale,cuts,order,/STALE_OR_MISSING_ORDER_SOURCE/)
  const alteredGrade=copy(saved);alteredGrade.grade_run.baseSize='XXL'
  blocked(alteredGrade,cuts,order,/STALE_OR_MISSING_ORDER_SOURCE/)
  const badCut=copy(cuts);badCut.sizes[0].panels[0].panel_id='forged'
  blocked(saved,badCut,order,/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  const forgedPoint=copy(cuts);forgedPoint.sizes[0].panels[0].cut.points[0][0]+=.00001
  blocked(saved,forgedPoint,order,/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  const forgedSize=copy(cuts);forgedSize.sizes[0].size='XXL'
  blocked(saved,forgedSize,order,/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  const swappedSizes=copy(cuts);swappedSizes.sizes.reverse()
  blocked(saved,swappedSizes,order,/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  const badHash=copy(order);badHash.nativeCutlineFingerprint='0'.repeat(64)
  blocked(saved,cuts,badHash,/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  const missingHash=copy(order);delete missingHash.nativeCutlineFingerprint
  blocked(saved,cuts,missingHash,/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
  assert.equal(nativeCutlineFingerprint({...cuts,sizes:cuts.sizes.map(row=>({...row}))}),order.nativeCutlineFingerprint)
  const missingSize=copy(order);delete missingSize.quantitiesBySize.XXL
  blocked(saved,cuts,missingSize,/ORDER_MANIFEST_MISMATCH/)
  const wrongMaterial=copy(order);wrongMaterial.materialsByPanel[ids[0]].grainAngleDeg=90
  blocked(saved,cuts,wrongMaterial,/INVALID_MATERIAL_GROUP_GRAIN/)
  const fake=copy(order);fake.releaseApproved=true
  blocked(saved,cuts,fake,/FAKE_PRODUCTION_RELEASE/)
  const fakeCuts=copy(cuts);fakeCuts.cuttingAuthorized=true
  blocked(saved,fakeCuts,order,/INVALID_NATIVE_CUTLINES_OR_RELEASE/)
  await rpc({op:'open',project:saved})
  const reopened=(await rpc({op:'save'})).project
  const reopenedCuts=await rpc({op:'grade-run-cutlines'})
  assert.deepEqual(create(reopened,reopenedCuts),result)
  console.log(JSON.stringify({result:'PASS',source:'saved-native-Rust-grade-run-cutlines',sizes:sizes.length,panels:ids.length,productionCutpieceInstances:actualCount,negativeCases:15,sourceFingerprint:order.sourceFingerprint,nativeCutlineFingerprint:order.nativeCutlineFingerprint,saveReopen:true,cuttingAuthorized:false}))
}finally{
  workspace.close()
  fs.rmSync(dir,{recursive:true,force:true})
}
