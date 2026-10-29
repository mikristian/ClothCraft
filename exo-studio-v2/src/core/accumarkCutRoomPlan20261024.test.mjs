import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkCutRoomPlan} from './accumarkCutRoomPlan20261024.js'

const project=()=>({
  grading:{sizes:['S','M'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
  pieces:[{id:'front',cutQuantity:2,grainAngleDeg:0,
    points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]}],
})
const rolls=()=>[
  {rollId:'R1',batchId:'B1',fabricId:'main',shade:'black-01',nap:true,usableLengthCm:65,costPerMeter:20,widthCm:30},
  {rollId:'R2',batchId:'B2',fabricId:'main',shade:'black-01',nap:true,usableLengthCm:90,costPerMeter:30,widthCm:30},
]
const options=()=>({quantitiesBySize:{S:3,M:2},rolls:rolls(),maxPlyCount:2,fabricWidthCm:30,spacingCm:1,nap:true})
const plan=o=>buildAccuMarkCutRoomPlan(project(),o)

test('deterministic marker, lay, cut tickets, roll traceability, no input mutation',()=>{
  const o=options(),before=structuredClone(o)
  const a=plan(o),b=plan(o)
  assert.equal(a.ok,true,JSON.stringify(a.issues))
  assert.deepEqual(a,b)
  assert.deepEqual(o,before)
  assert.equal(a.totals.garments,5)
  assert.equal(a.cutTickets.length,a.lays.length)
  assert.deepEqual(Object.fromEntries(['S','M'].map(size=>[size,a.lays.filter(l=>l.size===size).reduce((n,l)=>n+l.plyCount,0)])),{S:3,M:2})
  assert.ok(a.lays.every(l=>l.plyCount<=2&&l.batchId&&l.shade==='black-01'))
  assert.ok(a.cutTickets.every(t=>t.pieces.length===1&&t.pieces[0].total===2*t.plyCount))
  assert.ok(a.rollAllocation.every(r=>r.remainingCm>=0&&r.consumedCm<=r.usableLengthCm))
  assert.equal(a.manifest.factoryApproved,false)
  assert.equal(a.cutTickets[0].factoryApproved,false)
  assert.match(a.operatorWorksheet,/SIMULATION ONLY/)
  assert.equal(a.totals.estimatedFabricCost,a.rollAllocation.reduce((n,r)=>n+r.estimatedCost,0))
})

test('refuses short rolls without partial machine-ready output',()=>{
  const o=options()
  o.rolls=o.rolls.map(r=>({...r,usableLengthCm:2}))
  const result=plan(o)
  assert.equal(result.ok,false)
  assert.ok(result.issues.some(i=>i.code==='INSUFFICIENT_FABRIC'))
  assert.equal(result.manifest,null)
  assert.equal(result.cutTickets.length,0)
})

test('rejects mixed shades, nap, invalid roll lengths, duplicate roll ids and missing batch ids',()=>{
  for(const [edit,code] of [
    [r=>{r[1].shade='other'},'MIXED_SHADES'],
    [r=>{r[1].nap=false},'MIXED_NAP'],
    [r=>{r[0].usableLengthCm=-1},'INVALID_ROLL_LENGTH'],
    [r=>{r[1].rollId='R1'},'INVALID_ROLL_ID'],
    [r=>{delete r[1].batchId},'INVALID_BATCH_ID'],
    [r=>{r[0].widthCm=20},'ROLL_TOO_NARROW'],
  ]){
    const o=options();edit(o.rolls)
    assert.ok(plan(o).issues.some(i=>i.code===code),code)
  }
})

test('rejects incomplete quantities, unsafe ply counts and missing piece cut count',()=>{
  assert.ok(plan({...options(),quantitiesBySize:{S:1}}).issues.some(i=>i.code==='INVALID_SIZE_QUANTITIES'))
  assert.ok(plan({...options(),maxPlyCount:0}).issues.some(i=>i.code==='INVALID_MAX_PLY'))
  const p=project();delete p.pieces[0].cutQuantity
  assert.ok(buildAccuMarkCutRoomPlan(p,options()).issues.some(i=>i.code==='MARKER_GENERATION_FAILED'))
})

test('rejects unaccepted supplied markers including absent piece and wrong grain',()=>{
  const o=options()
  let result=plan({...o,acceptedMarkersBySize:{S:[]}})
  assert.ok(result.issues.some(i=>i.code==='MARKER_NOT_ACCEPTED'))
  const baseline=plan(o)
  const invalid=baseline.manifest.markerTemplates.S.placements.map(p=>({...p,rotationDeg:180}))
  result=plan({...o,acceptedMarkersBySize:{S:invalid}})
  assert.ok(result.issues.some(i=>i.code==='MARKER_NOT_ACCEPTED'))
})

test('allocates longer size markers before shorter markers to avoid stranding a roll',()=>{
  const p={grading:{sizes:['S','M'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[
    {id:'front',cutQuantity:1,grainAngleDeg:0,points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],grading:{pointRules:{}}},
  ]}
  const o={quantitiesBySize:{S:1,M:1},rolls:[
    {rollId:'small',batchId:'B1',fabricId:'main',shade:'black',nap:true,usableLengthCm:10,costPerMeter:10,widthCm:30},
    {rollId:'large',batchId:'B1',fabricId:'main',shade:'black',nap:true,usableLengthCm:20,costPerMeter:10,widthCm:30},
  ],fabricWidthCm:30,spacingCm:1,nap:true}
  const result=buildAccuMarkCutRoomPlan(p,o)
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  assert.equal(result.totals.garments,2)
  assert.equal(result.cutTickets.length,2)
  assert.equal(result.factoryApproved,false)
})

test('rejects inherited size demand, stray marker sizes, and whitespace-equivalent roll identifiers',()=>{
  const inheritedDemand=Object.create({S:3})
  inheritedDemand.M=2
  assert.ok(plan({...options(),quantitiesBySize:inheritedDemand}).issues.some(i=>i.code==='INVALID_SIZE_QUANTITIES'))

  const unexpectedMarker={...options(),acceptedMarkersBySize:{XL:[]}}
  assert.ok(plan(unexpectedMarker).issues.some(i=>i.code==='INVALID_MARKERS'))

  const duplicatedRollIds=options()
  duplicatedRollIds.rolls[1].rollId=' R1 '
  assert.ok(plan(duplicatedRollIds).issues.some(i=>i.code==='INVALID_ROLL_ID'))
})
