import assert from 'node:assert/strict'
import {createTeeTemplate} from '../../src/data/templates.js'
import {gradeProject} from '../../src/core/grading.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspectMarker} from '../../src/core/industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialMarkerLayDemand20261028 as inspectLay} from '../../src/core/industrialMarkerLayDemand20261028.mjs'
import {inspectIndustrialMarkerShadeLotGuard20261028 as inspectShade} from '../../src/core/industrialMarkerShadeLotGuard20261028.mjs'
import {inspectIndustrialMarkerRollDefectPlan20261028 as inspectRoll} from '../../src/core/industrialMarkerRollDefectPlan20261028.mjs'

// Reproducible digital acceptance: real EXO six-size multi-piece tee geometry.
// All rolls, dye lots and ply positions below are synthetic declarations.
const project=createTeeTemplate()
for(const piece of project.pieces){
  piece.notches=[];piece.internalLines=[];piece.buttonholes=[]
  piece.marker={nap:'one-way',allowCrossGrain:false}
  piece.grainAngleDeg=0
  assert(Number.isSafeInteger(piece.cutQuantity??1))
}
const original=structuredClone(project)
const sizes=project.grading.sizes
assert.equal(sizes.length,6)
assert(project.pieces.length>=2)
const dims=(piece)=>{
  const xs=piece.points.map(p=>p.x),ys=piece.points.map(p=>p.y)
  return {width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)}
}
for(const source of project.pieces){
  const bySize=sizes.map(size=>dims(gradeProject(project,size).pieces.find(p=>p.id===source.id)))
  for(const d of bySize)assert(d.width>0&&d.height>0,`${source.id}: invalid graded dimensions`)
  assert(bySize.some((d,i)=>i>0&&(Math.abs(d.width-bySize[0].width)>1e-5||Math.abs(d.height-bySize[0].height)>1e-5)),`${source.id}: grade size does not change geometry`)
}

const study=inspectMarker(project,{fabricWidthCm:150,spacingCm:1.5,maxCandidates:50000})
assert.equal(study.ok,true,JSON.stringify(study.issues))
assert.equal(study.referenceMarkerParity,true)
assert.equal(study.rows.length,sizes.length)
const required=project.pieces.reduce((n,p)=>n+(p.cutQuantity??1),0)
for(const row of study.rows){
  const marker=row.marker
  assert.equal(row.ok,true,`${row.size}: failed cutter study`)
  assert.equal(marker.placements.length,required,`${row.size}: missing cutpieces`)
  assert.equal(marker.metrics.requested,required)
  assert.equal(marker.metrics.placed,required)
  assert.equal(row.cutterStudy.records.length,required)
  const actual=new Set()
  for(const p of marker.placements){
    assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.width)&&Number.isFinite(p.height))
    assert(p.x>=0&&p.y>=0&&p.width>0&&p.height>0)
    assert(p.x+p.width<=marker.metrics.fabricWidth+1e-6)
    assert(p.y+p.height<=marker.metrics.length+1e-6)
    assert.equal(((p.rotationDeg%360)+360)%360,0,`${row.size}/${p.pieceId}: grain deviated`)
    const id=JSON.stringify([p.pieceId,p.instance]);assert(!actual.has(id));actual.add(id)
  }
  for(const piece of project.pieces)for(let i=0;i<(piece.cutQuantity??1);i++)assert(actual.has(JSON.stringify([piece.id,i])))
}

const layPolicy=()=>({
  ordersBySize:Object.fromEntries(sizes.map(s=>[s,4])),
  laysBySize:Object.fromEntries(sizes.map((s,i)=>[s,{main:{rollId:i<3?'ROLL-A':'ROLL-B',plies:2,markerRepeats:2,endLossCmPerPly:3}}])),
  rollsById:{'ROLL-A':{fabricId:'main',usableWidthCm:150,availableLengthCm:100000},'ROLL-B':{fabricId:'main',usableWidthCm:150,availableLengthCm:100000}},
})
const shadePolicy=()=>({
  orderMaterialsByFabric:{main:{shadeId:'BLACK',dyeLotId:'LOT-7',maxPlyCount:8}},
  rollProvenanceById:Object.fromEntries(['ROLL-A','ROLL-B'].map(id=>[id,{fabricId:'main',shadeId:'BLACK',dyeLotId:'LOT-7',batchId:id,maxPlyCount:8}])),
})
const lay=inspectLay(project,study,layPolicy())
assert.equal(lay.ok,true,JSON.stringify(lay.issues))
assert.equal(inspectShade(project,study,layPolicy(),shadePolicy()).ok,true)
const rollPlan=()=>{
  const plan={'ROLL-A':{defects:[],plySegments:[]},'ROLL-B':{defects:[],plySegments:[]}}
  const offsets={'ROLL-A':0,'ROLL-B':0}
  for(const row of lay.rows)for(let i=0;i<row.plies;i++){
    const length=row.markerLengthCm*row.markerRepeats+row.endLossCmPerPly
    const startCm=offsets[row.rollId]
    plan[row.rollId].plySegments.push({size:row.size,fabricId:row.fabricId,plyIndex:i,startCm,endCm:startCm+length})
    offsets[row.rollId]+=length
  }
  return plan
}
const roll=(p,l=layPolicy(),s=shadePolicy())=>inspectRoll(project,study,l,s,{rollPlanById:p})
const accepted=roll(rollPlan())
assert.equal(accepted.ok,true,JSON.stringify(accepted.issues))
assert.equal(accepted.rolls.reduce((n,r)=>n+r.plySegmentCount,0),12)
assert.equal(accepted.cuttingAuthorized,false)
assert.equal(accepted.physicalRollVerified,false)
const blocked=(result,code)=>{
  assert.equal(result.ok,false,JSON.stringify(result))
  assert(result.issues.some(i=>i.code===code),JSON.stringify(result.issues))
  assert.equal(result.cuttingAuthorized,false)
}
const narrow=layPolicy();narrow.rollsById['ROLL-A'].usableWidthCm=40
blocked(inspectLay(project,study,narrow),'MARKER_LAY_ROLL_TOO_NARROW')
const incorrectFabric=layPolicy();incorrectFabric.rollsById['ROLL-A'].fabricId='lining'
blocked(inspectLay(project,study,incorrectFabric),'INVALID_LAY_ROLL_DECLARATION')
const wrongQuantity=layPolicy();wrongQuantity.ordersBySize[sizes[0]]=5
blocked(inspectLay(project,study,wrongQuantity),'MARKER_LAY_ORDER_QUANTITY_DRIFT')
const badShade=shadePolicy();badShade.rollProvenanceById['ROLL-B'].dyeLotId='LOT-WRONG'
blocked(roll(rollPlan(),layPolicy(),badShade),'SHADE_LOT_PREREQUISITE_BLOCKED')
const collision=rollPlan();collision['ROLL-A'].defects=[{startCm:2,endCm:4}]
blocked(roll(collision),'ROLL_PLY_INTERSECTS_DECLARED_DEFECT')
const absent=rollPlan();absent['ROLL-A'].plySegments.pop()
blocked(roll(absent),'MISSING_ROLL_PLY_SEGMENT')
const impossible=layPolicy();impossible.rollsById['ROLL-A'].availableLengthCm=10
blocked(inspectLay(project,study,impossible),'MARKER_LAY_ROLL_LENGTH_EXCEEDED')
blocked(inspectMarker(project,{fabricWidthCm:0}),'INVALID_MARKER_SETTINGS')
assert.deepEqual(project,original,'acceptance workflow changed source garment')
console.log(JSON.stringify({result:'PASS',sizes:sizes.length,garmentPieces:project.pieces.length,cutpiecesPerMarker:required,markers:study.rows.length,checkedDxFPlacements:study.checkedDxFPlacements,plySegments:12,negativeGates:8,cuttingAuthorized:false}))
