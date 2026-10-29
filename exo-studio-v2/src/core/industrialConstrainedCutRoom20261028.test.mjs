import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectIndustrialConstrainedCutRoom20261028 as inspect} from './industrialConstrainedCutRoom20261028.mjs'

const fixture=()=>({
 grading:{sizes:['S','M'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
 pieces:[{id:'front',name:'Front',cutQuantity:1,grainAngleDeg:0,seamAllowance:0,
  points:[{x:0,y:0},{x:4,y:0},{x:4,y:6},{x:0,y:6}],
  marker:{nap:'one-way',onFold:true,foldEdgeIndex:3}}],
 markerSettings:{fabricDefectsByFabric:{main:[{x:6,y:0,width:3,height:9}]}},
})
const options=()=>({quantitiesBySize:{S:2,M:1},fabricWidthCm:20,spacingCm:.5,
 foldEdge:'left',defectZones:[{x:6,y:0,width:3,height:9}],maxPlyCount:2,
 rolls:[{rollId:'R1',batchId:'B1',shade:'A',fabricId:'main',nap:true,widthCm:20,
  usableLengthCm:100,costPerMeter:10}]})

test('source-bound fold/defect nesting transfers cutlines and reconciles actual multi-ply piece inventory',()=>{
 const project=fixture(),opts=options(),before=structuredClone(project)
 const result=inspect(project,opts)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.rows.length,2)
 assert.equal(result.expectedCuts,3)
 assert.equal(result.observedCuts,3)
 assert.equal(result.cutStudyInventory.length,2)
 assert(result.cutStudyInventory.every(row=>row.contourInstances===1&&row.drillCount===0))
 assert.equal(result.lays.length,2)
 assert(result.lays.every(l=>l.foldEdge==='left'&&l.plyCount<=2&&l.defectZones.length===1))
 assert(result.rows.every(r=>r.marks.ok&&r.cutter.ok&&r.marker.placements[0].x===0))
 assert(result.cutTickets.every(t=>t.pieces.reduce((n,p)=>n+p.total,0)===t.plyCount))
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
 assert.deepEqual(project,before)
})

test('tampered defect plans, missing fold rule and short rolls are refused without partial cut tickets',()=>{
 for(const [edit,code] of [
  [o=>{o.defectZones=[]},'SOURCE_FABRIC_DEFECT_MISMATCH'],
  [o=>{o.foldEdge=null},'MISSING_PHYSICAL_FOLD_EDGE'],
  [o=>{o.rolls[0].usableLengthCm=3},'INSUFFICIENT_CONSTRAINED_FABRIC'],
  [o=>{o.rolls[0].defectZones=[{x:1,y:1,width:2,height:2}]},'ROLL_DEFECT_MAP_MISMATCH'],
  [o=>{o.rolls[0].foldEdge='right'},'ROLL_FOLD_EDGE_MISMATCH'],
  [o=>{o.rolls[0].plyDefectZones=[[{x:0,y:0,width:1,height:1}]]},'UNVERIFIED_PLY_SPECIFIC_FABRIC_CONSTRAINTS'],
 ]){
  const o=options();edit(o)
  const result=inspect(fixture(),o)
  assert.equal(result.ok,false)
  assert(result.issues.some(issue=>issue.code===code),JSON.stringify(result.issues))
  assert.equal(result.cutTickets.length,0)
 }
})

test('invalid machine/marking source cannot claim cutting authorization',()=>{
 const o=options(),project=fixture()
 project.pieces[0].drills=[{x:2,y:2}]
 let result=inspect(project,o)
 assert.equal(result.ok,false)
 assert.equal(result.cuttingAuthorized,false)
 const clean=fixture();o.cutterProfile={profileId:'TEST',manufacturer:'TEST',model:'TEST',
  bedWidthMm:200,bedLengthMm:200,supportsNotches:true,supportsDrills:false}
 result=inspect(clean,o)
 assert.equal(result.ok,false)
 assert(result.issues.some(issue=>issue.code==='CUTTER_PROFILE_REVIEW_BLOCKED'))
})

test('different rolls use their independently inspected physical defect maps and lengths',()=>{
 const project=fixture(),o=options()
 delete project.markerSettings.fabricDefectsByFabric
 o.defectZones=[]
 o.quantitiesBySize={S:3,M:1}
 o.maxPlyCount=2
 o.rolls[0].defectZones=[{x:0,y:0,width:4,height:6}]
 o.rolls[0].usableLengthCm=7
 o.rolls.push({...o.rolls[0],rollId:'R2',batchId:'B2',usableLengthCm:100,
  defectZones:[{x:9,y:0,width:3,height:8}]})
 const before=structuredClone({project,o})
 const result=inspect(project,o)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.expectedCuts,4)
 assert.equal(result.observedCuts,4)
 assert.equal(result.cutStudyInventory.length,4)
 const r1=result.rows.find(r=>r.rollId==='R1'&&r.size==='S')
 const r2=result.rows.find(r=>r.rollId==='R2'&&r.size==='S')
 assert.notDeepEqual(r1.marker.placements,r2.marker.placements)
 assert(result.lays.every(l=>l.defectZones.length===1&&l.rollId==='R2'))
 assert.equal(result.cuttingAuthorized,false)
 assert.deepEqual({project,o},before)
})

test('a roll with no valid constrained marker cannot substitute invalid placement for its defect map',()=>{
 const project=fixture(),o=options()
 delete project.markerSettings.fabricDefectsByFabric
 o.defectZones=[]
 o.rolls[0].defectZones=[{x:0,y:0,width:4,height:100}]
 const result=inspect(project,o)
 assert.equal(result.ok,false)
 assert(result.issues.some(i=>i.code==='INSUFFICIENT_CONSTRAINED_FABRIC'))
 assert.deepEqual(result.cutTickets,[])
})

test('simultaneous fold, roll defect and two-axis plaid phase must match each native graded size',()=>{
 const project=fixture(),opts=options()
 project.markerSettings.repeatRegistrationByFabric={main:{repeatXcm:5,originXcm:0,repeatYcm:6,originYcm:0,toleranceCm:.001}}
 project.pieces[0].marker.repeatAnchorsBySize={
  S:{anchorXcm:0,anchorYcm:0,targetXcm:0,targetYcm:0},
  M:{anchorXcm:0,anchorYcm:0,targetXcm:0,targetYcm:0},
 }
 const original=structuredClone({project,opts})
 const result=inspect(project,opts)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert(result.rows.every(r=>r.marker.placements.every(p=>p.x===0&&Math.abs(p.y/6-Math.round(p.y/6))<.0001)))
 assert.equal(result.expectedCuts,3)
 assert.equal(result.cuttingAuthorized,false)
 assert.deepEqual({project,opts},original)
})

test('missing graded repeat identity and incompatible target phase block all cut tickets',()=>{
 const project=fixture(),opts=options()
 project.markerSettings.repeatRegistrationByFabric={main:{repeatXcm:5,originXcm:0,repeatYcm:6,originYcm:0,toleranceCm:.001}}
 project.pieces[0].marker.repeatAnchorsBySize={
  S:{anchorXcm:0,anchorYcm:0,targetXcm:0,targetYcm:0},
  M:{anchorXcm:0,anchorYcm:0,targetXcm:0,targetYcm:0},
 }
 const missing=structuredClone(project)
 delete missing.pieces[0].marker.repeatAnchorsBySize.M
 let result=inspect(missing,opts)
 assert.equal(result.ok,false)
 assert.deepEqual(result.cutTickets,[])
 const invalid=structuredClone(project)
 invalid.pieces[0].marker.repeatAnchorsBySize.S.targetXcm=2
 result=inspect(invalid,opts)
 assert.equal(result.ok,false)
 assert(result.issues.some(i=>i.code==='INSUFFICIENT_CONSTRAINED_FABRIC'),JSON.stringify(result.issues))
 assert.deepEqual(result.cutTickets,[])
})

test('physical per-ply observations are checked against the actual fold/defect/repeat lay plan without release',()=>{
 const project=fixture(),opts=options()
 project.markerSettings.repeatRegistrationByFabric={main:{repeatXcm:5,originXcm:0,repeatYcm:6,originYcm:0,toleranceCm:.001}}
 project.pieces[0].marker.repeatAnchorsBySize={S:{anchorXcm:0,anchorYcm:0,targetXcm:0,targetYcm:0},M:{anchorXcm:0,anchorYcm:0,targetXcm:0,targetYcm:0}}
 const plan=inspect(project,opts)
 assert.equal(plan.ok,true,JSON.stringify(plan.issues))
 const physical={format:'exo.physical-multiply-measurement.v1',factory:'FixtureFactory',operator:'FixtureInspector',calibrationId:'FixtureCal',signedReportReference:'FixtureReport',lays:plan.lays.map(lay=>({
  layId:lay.layId,rollId:lay.rollId,size:lay.size,plyCount:lay.plyCount,
  measuredPieceCount:plan.cutTickets.find(t=>t.layId===lay.layId).pieces.reduce((sum,p)=>sum+p.total,0),
  plies:Array.from({length:lay.plyCount},(_,i)=>({index:i+1,measuredMarkerLengthMm:lay.markerLengthCm*10,registrationOffsetMm:0,foldOffsetMm:0})),
 }))}
 const reviewed=inspect(project,{...opts,physicalObservations:physical})
 assert.equal(reviewed.ok,true,JSON.stringify(reviewed.issues))
 assert.equal(reviewed.physicalWitness.ok,true)
 assert.equal(reviewed.physicalWitness.physicallyMeasured,false)
 assert.equal(reviewed.externalCadVerified,false)
 assert.equal(reviewed.factoryApproved,false)
 const altered=structuredClone(physical);altered.lays[0].plies[0].registrationOffsetMm=2
 const invalid=inspect(project,{...opts,physicalObservations:altered})
 assert.equal(invalid.ok,false)
 assert(invalid.issues.some(issue=>issue.code==='PHYSICAL_MULTIPLY_REVIEW_REFUSED'))
 assert.deepEqual(invalid.cutTickets,[])
})

test('actual per-ply observation contract is checked without self-approving physical measurement',()=>{
 const project=fixture(),opts=options(),baseline=inspect(project,opts)
 assert.equal(baseline.ok,true)
 const observed={format:'exo.physical-multiply-measurement.v1',factory:'FixtureFactory',
  operator:'FixtureInspector',calibrationId:'FixtureCal',signedReportReference:'FixtureReport',
  lays:baseline.lays.map(lay=>({layId:lay.layId,rollId:lay.rollId,size:lay.size,
   plyCount:lay.plyCount,measuredPieceCount:baseline.cutTickets.find(t=>t.layId===lay.layId)
    .pieces.reduce((n,p)=>n+p.total,0),
   plies:Array.from({length:lay.plyCount},(_,i)=>({index:i+1,
    measuredMarkerLengthMm:lay.markerLengthCm*10,registrationOffsetMm:.1,foldOffsetMm:.1}))}))}
 const accepted=inspect(project,{...opts,physicalObservations:observed})
 assert.equal(accepted.ok,true,JSON.stringify(accepted.issues))
 assert.equal(accepted.physicalWitness.ok,true)
 assert.equal(accepted.physicalWitness.physicallyMeasured,false)
 assert.equal(accepted.cuttingAuthorized,false)
 observed.lays[0].plies[0].registrationOffsetMm=2
 const rejected=inspect(project,{...opts,physicalObservations:observed})
 assert.equal(rejected.ok,false)
 assert(rejected.issues.some(i=>i.code==='PHYSICAL_MULTIPLY_REVIEW_REFUSED'))
 assert.deepEqual(rejected.cutTickets,[])
})
