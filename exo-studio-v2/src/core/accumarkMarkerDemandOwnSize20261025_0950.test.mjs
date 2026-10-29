import test from 'node:test'
import assert from 'node:assert/strict'
import {expandAccuMarkMarkerDemand,validateAccuMarkMarkerProduction,buildAccuMarkMarkerOrder} from './accumarkMarkerProduction20261023.js'

const source=()=>({
  grading:{sizes:['S','M'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
  pieces:[{id:'front',name:'front',cutQuantity:1,fabricId:'main',seamAllowance:0,
    points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}]}],
})

test('M01 requires quantities explicitly owned by the order, not inherited defaults',()=>{
  const quantities=Object.create({S:1,M:0})
  assert.throws(()=>expandAccuMarkMarkerDemand(source(),quantities),/INVALID_SIZE_QUANTITIES/)
  const validation=validateAccuMarkMarkerProduction(source(),{quantitiesBySize:quantities,fabricWidthCm:40})
  assert.equal(validation.ok,false)
  assert.equal(validation.cuttingAuthorized,false)
  assert(validation.issues.some(issue=>issue.code==='INVALID_SIZE_QUANTITIES'))
  const order=buildAccuMarkMarkerOrder(source(),{quantitiesBySize:quantities,fabricWidthCm:40})
  assert.equal(order.validation.ok,false)
  assert.equal(order.validation.cuttingAuthorized,false)
})

test('M01 rejects sparse size runs rather than silently omitting missing sizes',()=>{
  const project=source()
  project.grading.sizes=['S',,'M']
  assert.throws(()=>expandAccuMarkMarkerDemand(project,{S:1,M:0}),/INVALID_SIZES/)
})

test('M01 rejects non-string and empty size labels',()=>{
  for(const size of [undefined,null,0,'']){
    const project=source()
    project.grading.sizes=[size]
    assert.throws(()=>expandAccuMarkMarkerDemand(project,{[String(size)]:1}),/INVALID_SIZES/)
  }
})

test('M01 preserves explicit own quantities for ordinary and null-prototype maps',()=>{
  for(const quantities of [{S:2,M:0},Object.assign(Object.create(null),{S:2,M:0})]){
    const demand=expandAccuMarkMarkerDemand(source(),quantities)
    assert.deepEqual(demand.map(x=>[x.size,x.pieceId,x.instance]),[['S','front',0],['S','front',1]])
  }
})

test('M01 requires source-owned piece IDs and cut quantities',()=>{
  for(const piece of [
    Object.assign(Object.create({cutQuantity:1}),{id:'front'}),
    Object.assign(Object.create({id:'front'}),{cutQuantity:1}),
  ]){
    const project=source()
    project.pieces=[piece]
    assert.throws(()=>expandAccuMarkMarkerDemand(project,{S:1,M:0}),/INVALID_PIECE_ID|MISSING_OR_INVALID_CUT_QUANTITY/)
  }
})

test('M01 does not silently reinterpret malformed authored fabric IDs as main',()=>{
  for(const fabricId of ['',7,false,null]){
    const project=source()
    project.pieces[0].fabricId=fabricId
    assert.throws(()=>expandAccuMarkMarkerDemand(project,{S:1,M:0}),/INVALID_PIECE_FABRIC_ID/)
    const validation=validateAccuMarkMarkerProduction(project,{quantitiesBySize:{S:1,M:0},fabricWidthCm:40,
      placements:[{size:'S',pieceId:'front',instance:0,x:0,y:0,rotationDeg:0}]})
    assert.equal(validation.ok,false)
    assert.equal(validation.cuttingAuthorized,false)
    assert(validation.issues.some(issue=>issue.code==='INVALID_PIECE_FABRIC_ID'))
  }
  const project=source()
  delete project.pieces[0].fabricId
  assert.equal(expandAccuMarkMarkerDemand(project,{S:1,M:0})[0].fabricId,'main')
})
