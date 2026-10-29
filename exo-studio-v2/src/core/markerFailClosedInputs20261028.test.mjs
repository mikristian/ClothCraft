import test from 'node:test'
import assert from 'node:assert/strict'
import {buildMarker,buildFabricMarkers} from './marker.js'

const piece=(overrides={})=>({id:'front',name:'Front',cutQuantity:2,fabricId:'main',grainAngleDeg:0,seamAllowance:0,points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],...overrides})
const project=(part=piece())=>({pieces:[part],markerSettings:{fabricWidthsCm:{main:40}}})

test('invalid widths and spacing fail before marker placement',()=>{
  const source=project()
  for(const width of [0,-1,Number.NaN,Infinity,-Infinity,1001,'40'])
    assert.throws(()=>buildMarker(source,width,1),/INVALID_FABRIC_WIDTH/)
  for(const gap of [-1,Number.NaN,Infinity,51,'1'])
    assert.throws(()=>buildMarker(source,40,gap),/INVALID_MARKER_SPACING/)
  for(const override of [0,-10,Number.NaN,Infinity,'40']){
    source.markerSettings.fabricWidthsCm.main=override
    assert.throws(()=>buildFabricMarkers(source),/INVALID_FABRIC_WIDTH/)
  }
})

test('missing fractional and overflowing quantities cannot silently change demand',()=>{
  for(const quantity of [undefined,null,0,-1,1.5,100,Infinity,'2',Number.NaN]){
    const source=project(piece({cutQuantity:quantity}))
    assert.throws(()=>buildMarker(source,40,1.5,{strictProductionDemand:true}),/MISSING_OR_INVALID_CUT_QUANTITY/)
  }
  const valid=buildMarker(project(),40,1)
  assert.equal(valid.requestedPieces,2)
  assert.equal(valid.placements.length,2)
  assert.equal(valid.unusedPieces,0)
})

test('bad project source rejects rather than returning a misleading empty marker',()=>{
  assert.throws(()=>buildMarker(null),/INVALID_MARKER_PIECES/)
  assert.throws(()=>buildMarker({pieces:null}),/INVALID_MARKER_PIECES/)
})
