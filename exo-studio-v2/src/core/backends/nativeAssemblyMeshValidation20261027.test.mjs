import test from 'node:test'
import assert from 'node:assert/strict'
import {validateNativeAssemblyMeshFaces20261027} from './nativeAssemblyMeshValidation20261027.js'
import {assembleNativeSeams} from './seamAssembly.js'

const fixture=()=>({
  particles:[{id:0,pieceId:'front',position:[0,0,0]}, {id:1,pieceId:'front',position:[.1,0,0]}, {id:2,pieceId:'front',position:[0,.1,0]}],
  pieces:[{id:'front',particleIndices:[0,1,2],flatVerticesM:[[0,0,0],[.1,0,0],[0,.1,0]],faces:[[0,1,2]]}],
  constraints:[],
})

test('assembly staging accepts finite nondegenerate material triangles',()=>{
  assert.doesNotThrow(()=>validateNativeAssemblyMeshFaces20261027(fixture()))
})

test('assembly staging rejects invalid and degenerate faces before solving',()=>{
  for(const face of [[0,1],[0,1,1],[0,1,3],[0,1,1.5]]){
    const input=fixture()
    input.pieces[0].faces=[face]
    assert.throws(()=>assembleNativeSeams(input,{iterations:1}),RangeError)
  }
  const collinear=fixture()
  collinear.pieces[0].flatVerticesM[2]=[.2,0,0]
  assert.throws(()=>assembleNativeSeams(collinear,{iterations:1}),RangeError)
  const invalid=fixture()
  invalid.pieces[0].flatVerticesM[1]=[Infinity,0,0]
  assert.throws(()=>assembleNativeSeams(invalid,{iterations:1}),RangeError)
})

test('assembly staging rejects reused or out-of-range panel particle IDs even when faces are valid',()=>{
  const reused=fixture()
  reused.pieces.push({id:'back',particleIndices:[0,1,2],flatVerticesM:[[0,0,0],[.1,0,0],[0,.1,0]],faces:[[0,1,2]]})
  assert.throws(()=>assembleNativeSeams(reused,{iterations:1}),/multiple panel ownership/)

  for(const invalid of [-1,3,0.5]){
    const input=fixture()
    // Vertex index 3 is deliberately unused by the triangle, but is still
    // part of the panel material mapping and must be validated.
    input.pieces[0].particleIndices.push(invalid)
    input.pieces[0].flatVerticesM.push([.2,.2,0])
    assert.throws(()=>assembleNativeSeams(input,{iterations:1}),RangeError)
  }
})

test('staging rejects nonfinite unused material vertices before calculating panel contact hints',()=>{
  for (const coordinate of [NaN,Infinity,-Infinity]) {
    const input=fixture()
    input.pieces[0].particleIndices.push(3)
    input.particles.push({id:3,pieceId:'front',position:[.2,.2,0]})
    input.pieces[0].flatVerticesM.push([.2,coordinate,0])
    assert.throws(()=>assembleNativeSeams(input,{iterations:1}),/Invalid native assembly material vertex/)
    assert.deepEqual(input.particles[3].position,[.2,.2,0])
  }
})
