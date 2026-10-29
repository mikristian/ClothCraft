import test from 'node:test'
import assert from 'node:assert/strict'
import {validateAccuMarkMarkerProduction,buildAccuMarkMarkerOrder} from './accumarkMarkerProduction20261023.js'

const project=()=>({
  grading:{sizes:['S'],baseSize:'S',widthPerSizeCm:0,lengthPerSizeCm:0},
  pieces:[{id:'front',cutQuantity:1,fabricId:'shell',seamAllowance:0,
    points:[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}]}],
})
const settings={quantitiesBySize:{S:1},fabricWidthCm:40}

test('M01 rejects an unknown fabric rather than reporting an empty successful cut order',()=>{
  for(const fabricId of ['main','missing']){
    const validated=validateAccuMarkMarkerProduction(project(),{...settings,fabricId,placements:[]})
    assert.equal(validated.ok,false,fabricId)
    assert.equal(validated.cuttingAuthorized,false)
    assert(validated.issues.some(i=>i.code==='NO_REQUIRED_PIECES_FOR_FABRIC'),fabricId)
    const order=buildAccuMarkMarkerOrder(project(),{...settings,fabricId})
    assert.equal(order.validation.ok,false,fabricId)
    assert.equal(order.cuttingAuthorized,false)
    assert(order.validation.issues.some(i=>i.code==='NO_REQUIRED_PIECES_FOR_FABRIC'),fabricId)
    assert.deepEqual(order.placements,[])
  }
})

test('M01 rejects whitespace-only fabric selection',()=>{
  for(const fabricId of [' ','\t','\n']){
    const result=validateAccuMarkMarkerProduction(project(),{...settings,fabricId})
    assert.equal(result.ok,false)
    assert(result.issues.some(i=>i.code==='INVALID_FABRIC_ID'))
    const order=buildAccuMarkMarkerOrder(project(),{...settings,fabricId})
    assert.equal(order.validation.ok,false)
    assert(order.validation.issues.some(i=>i.code==='INVALID_FABRIC_ID'))
  }
})

test('M01 preserves valid fabric-specific cutting demand and never authorizes cutting',()=>{
  const validated=validateAccuMarkMarkerProduction(project(),{...settings,fabricId:'shell',
    placements:[{size:'S',pieceId:'front',instance:0,x:0,y:0,rotationDeg:0}]})
  assert.equal(validated.ok,true)
  assert.equal(validated.required,1)
  assert.equal(validated.cuttingAuthorized,false)
  const order=buildAccuMarkMarkerOrder(project(),{...settings,fabricId:'shell'})
  assert.equal(order.validation.ok,true)
  assert.equal(order.validation.required,1)
  assert.equal(order.placements.length,1)
  assert.equal(order.cuttingAuthorized,false)
})
