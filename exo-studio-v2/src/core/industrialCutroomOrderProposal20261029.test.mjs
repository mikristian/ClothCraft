import assert from 'node:assert/strict'
import test from 'node:test'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspectMarker}
  from './industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialMarkerLayDemand20261028 as inspectLay}
  from './industrialMarkerLayDemand20261028.mjs'
import {buildIndustrialCutroomOrderProposal20261029 as build,
  inspectIndustrialCutroomOrderProposal20261029 as inspect}
  from './industrialCutroomOrderProposal20261029.mjs'
import {fingerprintIndustrialMarkerStudy20261029 as digest}
  from './industrialMarkerSourceFreshness20261029.mjs'

const project=createTeeTemplate()
for (const piece of project.pieces) {
  piece.notches=[];piece.internalLines=[];piece.buttonholes=[]
  piece.marker={nap:'one-way',allowCrossGrain:false}
  piece.grainAngleDeg=0
}
const original=JSON.stringify(project)
const sizes=project.grading.sizes
const marker=inspectMarker(project,{fabricWidthCm:150,maxCandidates:50000})
assert.equal(marker.ok,true,JSON.stringify(marker.issues))
const lay={
  ordersBySize:Object.fromEntries(sizes.map(size=>[size,4])),
  laysBySize:Object.fromEntries(sizes.map(size=>[size,{
    main:{rollId:'ROLL-PROPOSAL',plies:2,markerRepeats:2,endLossCmPerPly:3},
  }])),
  rollsById:{'ROLL-PROPOSAL':{
    fabricId:'main',usableWidthCm:150,availableLengthCm:100000,
  }},
}
const shade={
  orderMaterialsByFabric:{main:{
    shadeId:'BLACK',dyeLotId:'LOT-PROPOSAL',maxPlyCount:8,
  }},
  rollProvenanceById:{'ROLL-PROPOSAL':{
    fabricId:'main',shadeId:'BLACK',dyeLotId:'LOT-PROPOSAL',
    batchId:'SYNTHETIC-PROPOSAL',maxPlyCount:8,
  }},
}
const demand=inspectLay(project,marker,lay)
assert.equal(demand.ok,true,JSON.stringify(demand.issues))
const length=Math.max(...demand.rows.map(row=>
  row.markerLengthCm*row.markerRepeats+row.endLossCmPerPly))
const options=()=>({
  defectsByRoll:{'ROLL-PROPOSAL':[
    {startCm:0,endCm:5},
  ]},
  spreadingPolicy:{
    spreadingTableById:{'TABLE-PROPOSAL':{
      grossTableLengthCm:length+10,headClampCm:5,tailClampCm:5,
      maxContinuousLayCm:length,usableWidthCm:154,maxPlyCount:8,
    }},
    tableBySizeFabric:Object.fromEntries(sizes.map(size=>[size,{
      main:'TABLE-PROPOSAL',
    }])),
  },
  stackPolicy:{
    rollStackById:{'ROLL-PROPOSAL':{
      maxPlyThicknessMm:1.2,interleafThicknessMm:0.2,
    }},
    equipmentStackById:{'TABLE-PROPOSAL':{
      maxLayStackHeightMm:3,spreaderHeadClearanceMm:3,clearanceReserveMm:0.4,
    }},
  },
  carriagePolicy:{carriageByTableId:{'TABLE-PROPOSAL':{
    leftSideMarginCm:2,rightSideMarginCm:2,
    carriageUsableWidthCm:154,maxCarriageTravelCm:length+8,
    headTravelOverrunCm:4,tailTravelOverrunCm:4,
  }}},
})
const required=options()
const proposal=build(project,marker,lay,shade,required)
assert.equal(proposal.ok,true,JSON.stringify(proposal.issues))
const packet={manifest:structuredClone(proposal.manifest),
  manifestSha256:proposal.manifestSha256}

test('all-size local CUT→declared order→roll→stack→carriage manifest binds exact source and units',()=>{
  const result=inspect(project,marker,lay,shade,required,packet)
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  assert.equal(result.manifestSha256,proposal.manifestSha256)
  assert.equal(proposal.manifest.format,'exo.local-2d-cutroom-order-proposal.v1')
  assert.deepEqual(proposal.manifest.unitSystem,{
    rollLength:'cm',markerGeometry:'cm',stackClearance:'mm',
  })
  assert.equal(proposal.manifest.totals.garmentCount,sizes.length*4)
  assert.equal(proposal.manifest.totals.fullPlySegments,sizes.length*2)
  assert.equal(proposal.manifest.sizeFabricRows.length,sizes.length)
  assert.equal(proposal.manifest.rollAllocationRows[0].declaredDefectCount,1)
  assert.equal(proposal.manifest.rollPlanById['ROLL-PROPOSAL'].plySegments.length,
    sizes.length*2)
  assert.equal(proposal.manifest.rollPlanById['ROLL-PROPOSAL'].defects.length,1)
  assert(proposal.manifest.rollAllocationRows[0].allocatedExtentCm>0)
  assert.equal(result.nativeRustSourceVerified,false)
  assert.equal(result.physicalRollVerified,false)
  assert.equal(result.cuttingAuthorized,false)
  assert.equal(result.factoryApproved,false)
  assert.equal(JSON.stringify(project),original)
})

test('unsigned caller packet cannot forge approval, roll allocation or source bindings',()=>{
  const bad=(mutate,code)=>{
    const forged=structuredClone(packet)
    mutate(forged)
    const result=inspect(project,marker,lay,shade,required,forged)
    assert.equal(result.ok,false,JSON.stringify(result))
    assert.match(JSON.stringify(result.issues),new RegExp(code))
    assert.equal(result.cuttingAuthorized,false)
    assert.equal(result.factoryApproved,false)
  }
  bad(packet=>{packet.manifest.cuttingAuthorized=true},'ORDER_PROPOSAL_PACKET_INVALID')
  bad(packet=>{packet.manifest.rollAllocationRows[0].reservedPlyLengthCm+=1},
    'ORDER_PROPOSAL_PACKET_INVALID')
  bad(packet=>{packet.manifest.sourceProjectSha256='0'.repeat(64)},
    'ORDER_PROPOSAL_PACKET_INVALID')
  bad(packet=>{packet.manifest.unitSystem.stackClearance='cm'},
    'ORDER_PROPOSAL_PACKET_INVALID')
  bad(packet=>{packet.factoryApproved=true},'ORDER_PROPOSAL_PACKET_INVALID')
  // A malicious caller can recompute an UNSIGNED local checksum. The current
  // source-derived preflight must still reject the forged contents.
  for(const modify of [
    manifest=>{manifest.cuttingAuthorized=true},
    manifest=>{manifest.nativeRustSourceVerified=true},
    manifest=>{manifest.sizeFabricRows[0].orderedGarments+=1},
    manifest=>{manifest.rollAllocationRows[0].allocatedExtentCm+=1},
    manifest=>{manifest.unitSystem.rollLength='mm'},
    manifest=>{manifest.rollPlanSha256='f'.repeat(64)},
    manifest=>{manifest.rollPlanById['ROLL-PROPOSAL'].plySegments[0].startCm+=0.25},
  ]) {
    const altered=structuredClone(packet)
    modify(altered.manifest)
    altered.manifestSha256=digest(altered.manifest)
    const refused=inspect(project,marker,lay,shade,required,altered)
    assert.equal(refused.ok,false,JSON.stringify(refused))
    assert.match(JSON.stringify(refused.issues),/ORDER_PROPOSAL_SOURCE_OR_POLICY_DRIFT/)
    assert.equal(refused.cuttingAuthorized,false)
    assert.equal(refused.factoryApproved,false)
  }
})

test('source, production quantities, shade and roll defects cannot reuse an earlier handoff',()=>{
  const changed=structuredClone(project)
  changed.pieces[0].points[0].x+=0.1
  const stale=inspect(changed,marker,lay,shade,required,packet)
  assert.equal(stale.ok,false)
  assert.match(JSON.stringify(stale.issues),/ORDER_PROPOSAL_SOURCE_OR_MARKER_STALE/)

  const newQty=structuredClone(lay)
  newQty.ordersBySize[sizes[0]]+=1
  const changedQty=inspect(project,marker,newQty,shade,required,packet)
  assert.equal(changedQty.ok,false)
  assert.match(JSON.stringify(changedQty.issues),/ORDER_PROPOSAL_ROLL_PLANNING_BLOCKED/)

  const newShade=structuredClone(shade)
  newShade.rollProvenanceById['ROLL-PROPOSAL'].dyeLotId='CHANGED'
  const shadeDrift=inspect(project,marker,lay,newShade,required,packet)
  assert.equal(shadeDrift.ok,false)
  assert.match(JSON.stringify(shadeDrift.issues),/ORDER_PROPOSAL_ROLL_PLANNING_BLOCKED/)

  const moreDefects=structuredClone(required)
  moreDefects.defectsByRoll['ROLL-PROPOSAL'][0].endCm+=1
  const defectDrift=inspect(project,marker,lay,shade,moreDefects,packet)
  assert.equal(defectDrift.ok,false)
  assert.match(JSON.stringify(defectDrift.issues),/ORDER_PROPOSAL_SOURCE_OR_POLICY_DRIFT/)

  const alteredEquipment=structuredClone(required)
  alteredEquipment.stackPolicy.equipmentStackById['TABLE-PROPOSAL'].maxLayStackHeightMm+=0.1
  const equipmentDrift=inspect(project,marker,lay,shade,alteredEquipment,packet)
  assert.equal(equipmentDrift.ok,false)
  assert.match(JSON.stringify(equipmentDrift.issues),/ORDER_PROPOSAL_SOURCE_OR_POLICY_DRIFT/)
})

test('untrusted inputs cannot convert a digital QA proposal into native or factory authority',()=>{
  const bad=build(project,marker,lay,shade,{
    ...required,defectsByRoll:undefined,
  })
  assert.equal(bad.ok,false)
  assert.match(JSON.stringify(bad.issues),/ORDER_PROPOSAL_INCOMPLETE_DECLARATIONS/)
  const invalid=inspect(project,marker,lay,shade,required,{
    manifest:{...proposal.manifest,nativeRustSourceVerified:true},
    manifestSha256:proposal.manifestSha256,
  })
  assert.equal(invalid.ok,false)
  assert.equal(invalid.factoryApproved,false)
})

test('immutable local proposal snapshot rejects accessors without invoking caller code',()=>{
  let executed=0
  const hostile=structuredClone(required)
  Object.defineProperty(hostile.spreadingPolicy.spreadingTableById['TABLE-PROPOSAL'],
    'grossTableLengthCm',{
      enumerable:true,configurable:true,
      get(){executed++;throw Error('CALLER_EXECUTED')},
    })
  const result=build(project,marker,lay,shade,hostile)
  assert.equal(result.ok,false)
  assert.match(JSON.stringify(result.issues),/ORDER_PROPOSAL_BUILD_REFUSED/)
  assert.equal(executed,0)
  const hostilePacket=structuredClone(packet)
  Object.defineProperty(hostilePacket.manifest,'factoryApproved',{
    enumerable:true,configurable:true,
    get(){executed++;throw Error('CALLER_EXECUTED')},
  })
  const refused=inspect(project,marker,lay,shade,required,hostilePacket)
  assert.equal(refused.ok,false)
  assert.match(JSON.stringify(refused.issues),/ORDER_PROPOSAL_INSPECTION_REFUSED/)
  assert.equal(executed,0)
  const inputs=JSON.stringify({project,marker,lay,shade,required})
  assert.equal(build(project,marker,lay,shade,required).ok,true)
  assert.equal(JSON.stringify({project,marker,lay,shade,required}),inputs)
})

test('oversized declaration arrays fail before enumerating or planning a malicious million-node order',()=>{
  const hostile=options()
  // The shape is intentionally otherwise plausible. Enforce the bounded
  // snapshot BEFORE extracting all property descriptors for roll preflight.
  hostile.defectsByRoll['ROLL-PROPOSAL']=new Array(50001).fill({startCm:0,endCm:1})
  const blocked=build(project,marker,lay,shade,hostile)
  assert.equal(blocked.ok,false)
  assert.match(JSON.stringify(blocked.issues),/ORDER_PROPOSAL_ARRAY_BUDGET/)
  assert.equal(blocked.cuttingAuthorized,false)
  const nested=options()
  let cursor=nested
  for(let i=0;i<65;i++){cursor.extra={};cursor=cursor.extra}
  const deep=build(project,marker,lay,shade,nested)
  assert.equal(deep.ok,false)
  assert.match(JSON.stringify(deep.issues),/ORDER_PROPOSAL_DEPTH_LIMIT/)
})

test('reordering harmless caller JSON keys leaves canonical proposal identity unchanged',()=>{
  const reordered=structuredClone(required)
  const stack=reordered.stackPolicy.equipmentStackById['TABLE-PROPOSAL']
  reordered.stackPolicy.equipmentStackById['TABLE-PROPOSAL']={
    clearanceReserveMm:stack.clearanceReserveMm,
    spreaderHeadClearanceMm:stack.spreaderHeadClearanceMm,
    maxLayStackHeightMm:stack.maxLayStackHeightMm,
  }
  const materials=structuredClone(shade)
  materials.orderMaterialsByFabric.main={
    maxPlyCount:8,dyeLotId:'LOT-PROPOSAL',shadeId:'BLACK',
  }
  const verified=inspect(project,marker,lay,materials,reordered,packet)
  assert.equal(verified.ok,true,JSON.stringify(verified.issues))
  assert.equal(verified.manifestSha256,packet.manifestSha256)
})
