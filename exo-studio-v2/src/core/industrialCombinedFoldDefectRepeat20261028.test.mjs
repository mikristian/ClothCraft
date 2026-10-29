import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectIndustrialConstrainedCutRoom20261028 as inspect} from './industrialConstrainedCutRoom20261028.mjs'

const project=()=>({grading:{sizes:['S','M'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},
 pieces:[{id:'front',name:'Front',cutQuantity:1,grainAngleDeg:0,seamAllowance:0,
  points:[{x:0,y:0},{x:4,y:0},{x:4,y:6},{x:0,y:6}],
  marker:{nap:'one-way',onFold:true,foldEdgeIndex:3,stripe:true,
   repeatAnchorsBySize:{S:{anchorXcm:0,anchorYcm:0,targetYcm:0},M:{anchorXcm:0,anchorYcm:0,targetYcm:0}}}}],
 markerSettings:{repeatRegistrationByFabric:{main:{repeatYcm:7,originYcm:0,toleranceCm:.001}}}})
const args=()=>({quantitiesBySize:{S:1,M:1},fabricWidthCm:20,spacingCm:0,foldEdge:'left',
 defectZones:[{x:0,y:0,width:4,height:5}],maxPlyCount:2,
 rolls:[{rollId:'R1',batchId:'B1',shade:'A',fabricId:'main',nap:true,widthCm:20,usableLengthCm:100,costPerMeter:10}]})

test('simultaneous fold edge, defect exclusion and source-authored stripe phase create cut-room tickets',()=>{
 const p=project(),options=args(),before=structuredClone(p)
 const result=inspect(p,options)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.expectedCuts,2)
 assert.equal(result.observedCuts,2)
 assert(result.rows.every(row=>row.ok&&row.marker.placements[0].x===0))
 assert(result.rows.every(row=>row.marker.placements[0].y>=7))
 assert.equal(result.cuttingAuthorized,false)
 assert.deepEqual(p,before)
})

test('invalid stripe target, missing size anchor and incompatible defect/fold phase cannot authorize cut tickets',()=>{
 for(const edit of [
  p=>{p.pieces[0].marker.repeatAnchorsBySize.M.targetYcm=7},
  p=>{delete p.pieces[0].marker.repeatAnchorsBySize.S},
  p=>{p.markerSettings.repeatRegistrationByFabric.main.repeatYcm=0},
 ]){
  const p=project();edit(p)
  const result=inspect(p,args())
  assert.equal(result.ok,false)
  assert.equal(result.cutTickets.length,0)
  assert.equal(result.cuttingAuthorized,false)
 }
})
