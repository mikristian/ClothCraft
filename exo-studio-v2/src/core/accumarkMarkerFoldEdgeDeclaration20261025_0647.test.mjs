import test from 'node:test'
import assert from 'node:assert/strict'
import {validateAccuMarkMarkerProduction,buildAccuMarkMarkerOrder} from './accumarkMarkerProduction20261023.js'

const source=()=>({
  pieces:[{id:'front',cutQuantity:1,grainAngleDeg:0,fabricId:'main',
    points:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],seamAllowance:0,marker:{}}],
  grading:{sizes:['S'],baseSize:'S',widthPerSizeCm:0,lengthPerSizeCm:0},
})
const options={quantitiesBySize:{S:1},fabricWidthCm:20,spacingCm:0}
const placement={size:'S',pieceId:'front',instance:0,x:3,y:2,rotationDeg:0}
const codes=result=>result.issues.map(issue=>issue.code)

test('marker fold-edge index zero is a declared on-fold constraint, not a falsy free-piece layout',()=>{
  const project=source()
  project.pieces[0].marker.foldEdgeIndex=0
  const original=structuredClone(project)
  const validated=validateAccuMarkMarkerProduction(project,{...options,placements:[placement]})
  assert.equal(validated.ok,false,JSON.stringify(validated.issues))
  assert(codes(validated).includes('FOLD_LAYOUT_UNVERIFIED'),JSON.stringify(validated.issues))
  const order=buildAccuMarkMarkerOrder(project,options)
  assert.deepEqual(order.placements,[])
  assert(codes(order.validation).includes('FOLD_LAYOUT_UNVERIFIED'))
  assert.equal(order.cuttingAuthorized,false)
  assert.deepEqual(project,original)
})

test('project-level authored fold constraints cannot silently pass off-fold production placement',()=>{
  const project=source()
  project.markerSettings={foldConstraints:[{pieceId:'front',edgeIndex:0,required:true}]}
  const validated=validateAccuMarkMarkerProduction(project,{...options,placements:[placement]})
  assert.equal(validated.ok,false,JSON.stringify(validated.issues))
  assert(codes(validated).includes('FOLD_LAYOUT_UNVERIFIED'),JSON.stringify(validated.issues))
  const order=buildAccuMarkMarkerOrder(project,options)
  assert.deepEqual(order.placements,[])
  assert(codes(order.validation).includes('FOLD_LAYOUT_UNVERIFIED'))
})

test('actual authored interfacingForPieceId relationship cannot pass an unfused cutting layout',()=>{
  const project=source()
  project.pieces[0].interfacingForPieceId='shell'
  const validated=validateAccuMarkMarkerProduction(project,{...options,placements:[placement]})
  assert.equal(validated.ok,false,JSON.stringify(validated.issues))
  assert(codes(validated).includes('FUSING_LAYOUT_UNVERIFIED'),JSON.stringify(validated.issues))
  const order=buildAccuMarkMarkerOrder(project,options)
  assert.deepEqual(order.placements,[])
  assert(codes(order.validation).includes('FUSING_LAYOUT_UNVERIFIED'))
})

test('explicit non-fold controls preserve valid free-piece geometry',()=>{
  const project=source()
  project.pieces[0].marker.foldEdgeIndex=null
  project.markerSettings={foldConstraints:false}
  const validated=validateAccuMarkMarkerProduction(project,{...options,placements:[placement]})
  assert.equal(validated.ok,true,JSON.stringify(validated.issues))
  assert.equal(validated.cuttingAuthorized,false)
})
