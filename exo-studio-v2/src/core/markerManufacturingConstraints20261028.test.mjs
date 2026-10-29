import test from 'node:test'
import assert from 'node:assert/strict'
import {buildMarker} from './marker.js'
import {buildAccuMarkMarkerOrder,validateAccuMarkMarkerProduction} from './accumarkMarkerProduction20261023.js'

const source=()=>({
 grading:{sizes:['S'],baseSize:'S',widthPerSizeCm:0,lengthPerSizeCm:0},
 pieces:[{id:'front',name:'Front',cutQuantity:1,fabricId:'main',grainAngleDeg:0,
  points:[{x:0,y:0},{x:10,y:0},{x:10,y:6},{x:0,y:6}],seamAllowance:0,marker:{}}],
})
const order={quantitiesBySize:{S:1},fabricWidthCm:40,spacingCm:0,nap:true}
const placement={size:'S',pieceId:'front',instance:0,x:0,y:0,rotationDeg:0}
const codes=result=>result.validation.issues.map(i=>i.code)

test('fold and pairing requirements fail in strict placement, validator and order, not only at export',()=>{
 for(const [key,code] of [['onFold','FOLD_LAYOUT_UNVERIFIED'],['pairing','PAIR_LAYOUT_UNVERIFIED'],['fusing','FUSING_LAYOUT_UNVERIFIED']]){
  const project=source();project.pieces[0].marker[key]=true
  const original=structuredClone(project)
  assert.throws(()=>buildMarker(project,40,0,{strictProductionDemand:true,nap:true}),new RegExp(code))
  assert(validateAccuMarkMarkerProduction(project,{...order,placements:[placement]}).issues.some(i=>i.code===code))
  const built=buildAccuMarkMarkerOrder(project,order)
  assert.equal(built.validation.ok,false)
  assert(codes(built).includes(code))
  assert.deepEqual(built.placements,[])
  assert.deepEqual(project,original)
 }
})

test('one-way nap and reversal conflicts and malformed grain/rotation declarations cannot enter strict marker order',()=>{
 const cases=[
  [p=>{p.pieces[0].marker={nap:'one-way',allowReverseGrain:true}},'INVALID_ROTATION_OR_NAP'],
  [p=>{p.pieces[0].grainAngleDeg=Infinity},'INVALID_GRAIN'],
  [p=>{p.pieces[0].marker={allowCrossGrain:'yes'}},'INVALID_ROTATION'],
  [p=>{p.pieces[0].marker={nap:'unknown'}},'INVALID_NAP'],
 ]
 for(const [edit,code] of cases){
  const project=source();edit(project)
  assert.throws(()=>buildMarker(project,40,0,{strictProductionDemand:true,nap:true}),new RegExp(code))
  assert(codes(buildAccuMarkMarkerOrder(project,order)).includes(code))
 }
})

test('valid explicit grain and quantities generate a candidate marker without authorizing a cut',()=>{
 const project=source();project.pieces[0].grainAngleDeg=30
 const preview=buildMarker(project,40,0,{strictProductionDemand:true,nap:true})
 assert.equal(preview.placements.length,1)
 assert.equal(preview.placements[0].rotationDeg,-30)
 const built=buildAccuMarkMarkerOrder(project,order)
 assert.equal(built.validation.ok,true,JSON.stringify(built.validation.issues))
 assert.equal(built.cuttingAuthorized,false)
})

test('fabric defects cannot disappear between strict marker and production order',()=>{
 const project=source()
 project.markerSettings={fabricDefectsByFabric:{main:[{x:2,y:3,width:5,height:4}]}}
 assert.throws(()=>buildMarker(project,40,0,{strictProductionDemand:true}),/FABRIC_DEFECT_LAYOUT_UNVERIFIED/)
 const validation=validateAccuMarkMarkerProduction(project,{...order,placements:[placement]})
 assert(validation.issues.some(issue=>issue.code==='FABRIC_DEFECT_LAYOUT_UNVERIFIED'))
 const built=buildAccuMarkMarkerOrder(project,order)
 assert.deepEqual(built.placements,[])
 assert(codes(built).includes('FABRIC_DEFECT_LAYOUT_UNVERIFIED'))
 assert.equal(built.cuttingAuthorized,false)
})
