import test from 'node:test'
import assert from 'node:assert/strict'
import {validateAccuMarkMarkerProduction,buildAccuMarkMarkerOrder} from './accumarkMarkerProduction20261023.js'

const project=()=>({
  pieces:[{id:'front',cutQuantity:1,grainAngleDeg:0,fabricId:'main',
    points:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],seamAllowance:0,marker:{}}],
  grading:{sizes:['S'],baseSize:'S',widthPerSizeCm:0,lengthPerSizeCm:0},
})
const options={quantitiesBySize:{S:1},fabricWidthCm:20,spacingCm:0}
const placement={size:'S',pieceId:'front',instance:0,x:3,y:2,rotationDeg:0}
const validate=(source)=>validateAccuMarkMarkerProduction(source,{...options,placements:[placement]})
const codes=result=>result.issues.map(i=>i.code)

test('on-fold and cut-on-fold metadata refuse an otherwise valid off-fold placement',()=>{
  for(const mark of [
    p=>{p.fold=true},p=>{p.onFold=true},p=>{p.cutOnFold=true},
    p=>{p.marker.fold=true},p=>{p.marker.onFold=true},p=>{p.marker.cutOnFold=true},
    p=>{p.marker.onFold='left-edge'},
  ]){
    const source=project();mark(source.pieces[0])
    const before=structuredClone(source)
    const result=validate(source)
    assert.equal(result.ok,false,JSON.stringify(result.issues))
    assert(codes(result).includes('FOLD_LAYOUT_UNVERIFIED'),JSON.stringify(result.issues))
    assert.equal(result.cuttingAuthorized,false)
    assert.deepEqual(source,before,'preflight must not change authored garment')
  }
})

test('production order builder cannot propose an apparently valid marker for unsupported fold source',()=>{
  const source=project();source.pieces[0].marker.onFold=true
  const result=buildAccuMarkMarkerOrder(source,options)
  assert.deepEqual(result.placements,[])
  assert.equal(result.validation.ok,false)
  assert(codes(result.validation).includes('FOLD_LAYOUT_UNVERIFIED'))
  assert.equal(result.cuttingAuthorized,false)
})

test('ordinary explicitly non-fold pieces retain existing geometry-only validation',()=>{
  const source=project()
  source.pieces[0].fold=false
  source.pieces[0].onFold=false
  source.pieces[0].cutOnFold=false
  source.pieces[0].marker.fold=false
  source.pieces[0].marker.onFold=false
  source.pieces[0].marker.cutOnFold=false
  assert.equal(validate(source).ok,true,JSON.stringify(validate(source).issues))
})

test('source-declared fusing and mirror pairing cannot silently pass free-piece layout',()=>{
  for(const mark of [
    p=>{p.fusing={required:true,materialId:'fusible'}},
    p=>{p.marker.fusing={required:true}},
    p=>{p.fusedToPieceId='lining'},
    p=>{p.marker.pairing={mode:'mirror',required:true}},
    p=>{p.pairing={mode:'mirror',required:true}},
    p=>{p.marker.mirrorPairId='right'},
  ]){
    const source=project();mark(source.pieces[0])
    const result=validate(source)
    assert.equal(result.ok,false,JSON.stringify(result.issues))
    assert(codes(result).some(c=>['FUSING_LAYOUT_UNVERIFIED','PAIR_LAYOUT_UNVERIFIED'].includes(c)),JSON.stringify(result.issues))
    assert.equal(result.cuttingAuthorized,false)
    const order=buildAccuMarkMarkerOrder(source,options)
    assert.deepEqual(order.placements,[])
    assert.equal(order.validation.ok,false)
  }
})

test('project-level mandatory pair/fusing constraints block, explicit false controls remain safe',()=>{
  for(const key of ['pairConstraints','fusingConstraints']){
    const source=project();source.markerSettings={[key]:[{required:true}]}
    assert.equal(validate(source).ok,false)
    assert(codes(validate(source)).includes(key==='pairConstraints'?'PAIR_LAYOUT_UNVERIFIED':'FUSING_LAYOUT_UNVERIFIED'))
  }
  const source=project()
  source.pieces[0].fusing=false
  source.pieces[0].marker.pairing=false
  source.markerSettings={pairConstraints:false,fusingConstraints:false}
  assert.equal(validate(source).ok,true,JSON.stringify(validate(source).issues))
})
