import test from 'node:test'
import assert from 'node:assert/strict'
import {validateAccuMarkMarkerProduction,buildAccuMarkMarkerOrder} from './accumarkMarkerProduction20261023.js'

const makeProject=()=>({
  pieces:[{
    id:'front',name:'Front',cutQuantity:1,grainAngleDeg:0,fabricId:'main',
    points:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],seamAllowance:0,
    marker:{repeatAnchorsBySize:{S:{anchorXcm:1,anchorYcm:1,targetXcm:2,targetYcm:3}}},
  }],
  grading:{sizes:['S','M'],baseSize:'S',widthPerSizeCm:0,lengthPerSizeCm:0},
  markerSettings:{repeatRegistrationByFabric:{main:{repeatXcm:5,originXcm:1,repeatYcm:7,originYcm:2,toleranceCm:0.001}}},
})
const placement=(x=2,y=4,rotationDeg=0)=>({size:'S',pieceId:'front',instance:0,x,y,rotationDeg})
const validate=(source,placements=[placement()],more={})=>validateAccuMarkMarkerProduction(source,{
  quantitiesBySize:{S:1,M:0},fabricWidthCm:20,spacingCm:0,placements,...more,
})
const codes=result=>result.issues.map(i=>i.code)

test('explicit two-axis plaid registration accepts measured phase, preserving source',()=>{
  const source=makeProject(),snapshot=structuredClone(source)
  const result=validate(source)
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  assert.equal(result.cuttingAuthorized,false)
  assert.deepEqual(source,snapshot)
})

test('one-axis stripes and periodic equivalent phases are accepted',()=>{
  const source=makeProject()
  source.markerSettings.repeatRegistrationByFabric.main={repeatXcm:5,originXcm:1,toleranceCm:0.001}
  delete source.pieces[0].marker.repeatAnchorsBySize.S.targetYcm
  assert.equal(validate(source,[placement(7,9)]).ok,true)
  assert.equal(validate(source,[placement(12,0)]).ok,true)
})

test('sub-centimetre registration drift and mismatched Y phase fail closed',()=>{
  const source=makeProject()
  assert(codes(validate(source,[placement(2.02,4)])).includes('REPEAT_PHASE_MISMATCH'))
  assert(codes(validate(source,[placement(2,4.02)])).includes('REPEAT_PHASE_MISMATCH'))
  assert(codes(validate(source,[placement(2,4.0005)])).length===0)
})

test('geometrically valid placement is refused when declared fabric phase is wrong',()=>{
  const source=makeProject(),wrong=[placement(0,0)]
  assert(codes(validate(source,wrong)).includes('REPEAT_PHASE_MISMATCH'))
  delete source.markerSettings.repeatRegistrationByFabric
  delete source.pieces[0].marker.repeatAnchorsBySize
  assert.equal(validate(source,wrong).ok,true,'plain-fabric geometry is valid; registered plaid must fail')
})

test('rotated anchor is transformed relative to rotated piece bounds',()=>{
  const source=makeProject()
  assert.equal(validate(source,[placement(0,2,180)]).ok,true)
  assert(codes(validate(source,[placement(2,4,180)])).includes('REPEAT_PHASE_MISMATCH'))
  assert(codes(validate(source,[placement(0,2,180)],{nap:true})).includes('INVALID_ROTATION_OR_NAP'))
})

test('fabric repeat configuration and per-size anchors must be explicit and finite',()=>{
  const source=makeProject()
  delete source.markerSettings.repeatRegistrationByFabric.main.originXcm
  assert(codes(validate(source)).includes('INVALID_REPEAT_CONFIG'))
  source.markerSettings.repeatRegistrationByFabric.main.originXcm=1
  source.markerSettings.repeatRegistrationByFabric.main.toleranceCm=0.11
  assert(codes(validate(source)).includes('INVALID_REPEAT_TOLERANCE'))
  source.markerSettings.repeatRegistrationByFabric.main.toleranceCm=0.001
  delete source.pieces[0].marker.repeatAnchorsBySize.S
  assert(codes(validate(source)).includes('MISSING_REPEAT_ANCHOR'))
  source.pieces[0].marker.repeatAnchorsBySize.S={anchorXcm:1,anchorYcm:1,targetXcm:5,targetYcm:3}
  assert(codes(validate(source)).includes('INVALID_REPEAT_TARGET'))
})

test('repeat anchor outside graded piece and orphaned piece anchors are rejected',()=>{
  const source=makeProject()
  source.pieces[0].marker.repeatAnchorsBySize.S.anchorXcm=30
  assert(codes(validate(source)).includes('REPEAT_ANCHOR_OUTSIDE_PIECE'))
  delete source.markerSettings.repeatRegistrationByFabric.main
  assert(codes(validate(source)).includes('REPEAT_CONFIG_REQUIRED'))
})

test('anchor in concave cutline void is rejected even inside its bounding rectangle',()=>{
  const source=makeProject()
  source.pieces[0].points=[{x:0,y:0},{x:4,y:0},{x:4,y:1},{x:1,y:1},{x:1,y:4},{x:0,y:4}]
  source.pieces[0].marker.repeatAnchorsBySize.S.anchorXcm=2
  source.pieces[0].marker.repeatAnchorsBySize.S.anchorYcm=2
  assert(codes(validate(source)).includes('REPEAT_ANCHOR_OUTSIDE_PIECE'))
})

test('malformed fabric registration map is rejected rather than silently ignored',()=>{
  const source=makeProject()
  source.markerSettings.repeatRegistrationByFabric=[]
  assert(codes(validate(source)).includes('INVALID_REPEAT_CONFIG'))
})

test('partial plaid axis cannot silently downgrade to stripe registration',()=>{
  const source=makeProject()
  delete source.markerSettings.repeatRegistrationByFabric.main.repeatYcm
  source.pieces[0].marker.repeatAnchorsBySize.S.targetYcm=NaN
  assert(codes(validate(source)).includes('INVALID_REPEAT_CONFIG'))
  delete source.markerSettings.repeatRegistrationByFabric.main.originYcm
  assert(codes(validate(source)).includes('INVALID_REPEAT_TARGET'))
})

test('prototype-inherited fabric config or per-size anchor cannot pass as source data',()=>{
  const source=makeProject()
  const inherited=source.markerSettings.repeatRegistrationByFabric.main
  source.markerSettings.repeatRegistrationByFabric=Object.create({main:inherited})
  assert(codes(validate(source)).includes('INVALID_REPEAT_CONFIG'))
  source.markerSettings.repeatRegistrationByFabric={main:inherited}
  const sourceAnchor=source.pieces[0].marker.repeatAnchorsBySize.S
  source.pieces[0].marker.repeatAnchorsBySize=Object.create({S:sourceAnchor})
  assert(codes(validate(source)).includes('MISSING_REPEAT_ANCHOR'))
})

test('all requested sizes need their own source anchor, not an inferred base-size copy',()=>{
  const source=makeProject()
  assert(codes(validateAccuMarkMarkerProduction(source,{
    quantitiesBySize:{S:0,M:1},fabricWidthCm:20,placements:[],
  })).includes('MISSING_REPEAT_ANCHOR'))
})

test('existing marker optimizer cannot silently authorize unregistered plaid placements',()=>{
  const source=makeProject()
  const result=buildAccuMarkMarkerOrder(source,{quantitiesBySize:{S:1,M:0},fabricWidthCm:20,spacingCm:0})
  assert.equal(result.cuttingAuthorized,false)
  assert.equal(result.validation.ok,false)
  assert(codes(result.validation).includes('REPEAT_PHASE_MISMATCH'))
})
