import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspectMarker} from './industrialMarkerCutWorkflow20261028.mjs'
import {
  planIndustrialCutroomRollSegments20261029 as plan,
  MAX_INDUSTRIAL_ROLL_SEGMENTS_20261029 as LIMIT,
} from './industrialCutroomRollSegmentPlanner20261029.mjs'

// Four independently named fabrics across six graded sizes exercise 24
// alternating size/fabric roll-plan rows. The 24,000-ply case is deliberately
// real source-derived CAD/CUT geometry, not a caller-invented marker with ok=true.
const project=createTeeTemplate()
project.pieces.forEach((piece,i)=>{
  piece.fabricId='fabric-'+i
  piece.notches=[]
  piece.internalLines=[]
  piece.buttonholes=[]
  piece.marker={nap:'one-way',allowCrossGrain:false}
  piece.grainAngleDeg=0
})
const untouched=JSON.stringify(project)
const marker=inspectMarker(project,{fabricWidthCm:150,maxCandidates:50000})
assert.equal(marker.ok,true,JSON.stringify(marker.issues))
assert.equal(marker.rows.length,24)
const sizes=project.grading.sizes
const fabrics=project.pieces.map(piece=>piece.fabricId)
const rollsById=Object.fromEntries(fabrics.map((fabricId,i)=>['ROLL-'+i,{
  fabricId,usableWidthCm:150,availableLengthCm:2_000_000,
}]))
const shadePolicy={
  orderMaterialsByFabric:Object.fromEntries(fabrics.map(fabricId=>[fabricId,{
    shadeId:'SHADE',dyeLotId:'LOT',maxPlyCount:1000,
  }])),
  rollProvenanceById:Object.fromEntries(fabrics.map((fabricId,i)=>['ROLL-'+i,{
    fabricId,shadeId:'SHADE',dyeLotId:'LOT',batchId:'BATCH-'+i,maxPlyCount:1000,
  }])),
}
const layPolicy={
  ordersBySize:Object.fromEntries(sizes.map(size=>[size,1000])),
  laysBySize:Object.fromEntries(sizes.map(size=>[size,Object.fromEntries(
    fabrics.map((fabricId,i)=>[fabricId,{
      rollId:'ROLL-'+i,plies:1000,markerRepeats:1,endLossCmPerPly:1,
    }])
  )])),
  rollsById,
}
const defects=Object.fromEntries(fabrics.map((_,i)=>['ROLL-'+i,[
  {startCm:0,endCm:3+i},
  {startCm:120+i*3,endCm:120.2+i*3},
  {startCm:980+i*4,endCm:981+i*4},
]]))

test('exactly 24,000 plies across interleaved four-roll, six-size marker is deterministic and never CUT-approved',()=>{
  assert.equal(LIMIT,24000)
  const result=plan(project,marker,layPolicy,shadePolicy,{defectsByRoll:defects})
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  assert.equal(result.inspectedPlyCount,LIMIT)
  assert.equal(result.rollCount,4)
  assert.equal(result.rollAllocationRows.length,4)
  for(let i=0;i<fabrics.length;i++){
    const segments=result.rollPlanById['ROLL-'+i].plySegments
    const usage=result.rollAllocationRows.find(row=>row.rollId==='ROLL-'+i)
    assert.equal(usage.fabricId,'fabric-'+i)
    assert.equal(usage.plySegmentCount,6000)
    assert.equal(usage.declaredDefectCount,3)
    assert.equal(usage.physicalRollVerified,false)
    assert(Math.abs(usage.reservedPlyLengthCm+
      usage.unallocatedHeadAndGapCm-usage.allocatedExtentCm)<1e-4)
    assert(Math.abs(usage.unallocatedTailCm+
      usage.allocatedExtentCm-usage.declaredAvailableLengthCm)<1e-4)
    assert(usage.allocationFractionWithinExtent>0&&
      usage.allocationFractionWithinExtent<=1)
    assert.equal(segments.length,6000)
    for(let j=1;j<segments.length;j++)
      assert(segments[j].startCm>=segments[j-1].endCm,'Unexpected overlap in roll '+i)
    for(const seg of segments)
      for(const defect of defects['ROLL-'+i])
        assert(seg.endCm<defect.startCm||seg.startCm>defect.endCm,
          'Declared roll defect intersects a planned ply')
  }
  assert.equal(result.factoryApproved,false)
  assert.equal(result.cuttingAuthorized,false)
  const again=plan(project,marker,layPolicy,shadePolicy,{defectsByRoll:defects})
  assert.equal(again.ok,true,JSON.stringify(again.issues))
  assert.deepEqual(again.rollPlanById,result.rollPlanById)
  assert.equal(JSON.stringify(project),untouched)
})

test('24,000 cap rejects excess exact demand before allocating, including invalid overrides',()=>{
  const extra=structuredClone(project)
  const fifth=structuredClone(extra.pieces[0])
  fifth.id+='-fifth-fabric'
  fifth.name='Independent Fifth Material Panel'
  fifth.fabricId='fabric-4'
  extra.pieces.push(fifth)
  const extraMarker=inspectMarker(extra,{fabricWidthCm:150,maxCandidates:50000})
  assert.equal(extraMarker.ok,true,JSON.stringify(extraMarker.issues))
  const extraLay=structuredClone(layPolicy)
  extraLay.rollsById['ROLL-4']={
    fabricId:'fabric-4',usableWidthCm:150,availableLengthCm:2_000_000,
  }
  for(const size of sizes)extraLay.laysBySize[size]['fabric-4']={
    rollId:'ROLL-4',plies:1,markerRepeats:1000,endLossCmPerPly:1,
  }
  const rejected=plan(extra,extraMarker,extraLay,shadePolicy,{
    defectsByRoll:{...defects,'ROLL-4':[]},
  })
  assert.equal(rejected.ok,false)
  assert.match(JSON.stringify(rejected.issues),/ROLL_PLAN_SIZE_LIMIT/)
  for(const invalid of [0,1.5,-1,24001,Number.MAX_SAFE_INTEGER]){
    const blocked=plan(project,marker,layPolicy,shadePolicy,{
      defectsByRoll:defects,maxPlySegments:invalid,
    })
    assert.equal(blocked.ok,false)
    assert.match(JSON.stringify(blocked.issues),/ROLL_PLAN_INVALID_SIZE_BUDGET/)
  }
  const justShort=plan(project,marker,layPolicy,shadePolicy,{
    defectsByRoll:defects,maxPlySegments:23999,
  })
  assert.equal(justShort.ok,false)
  assert.match(JSON.stringify(justShort.issues),/ROLL_PLAN_SIZE_LIMIT/)
  assert.equal(JSON.stringify(project),untouched)
})
