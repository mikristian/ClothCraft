import test from 'node:test'
import assert from 'node:assert/strict'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {inspectIndustrialCadInterchange20261028} from './industrialCadRoundtripGate20261028.mjs'
import {inspectIndustrialReceivingEntityInventory20261028} from './industrialReceivingEntityInventory20261028.mjs'
import {inspectIndustrialReceivingDxfEnvelope20261028 as inspect} from './industrialReceivingDxfEnvelope20261028.mjs'

const source=()=>({id:'disposable-dxf-envelope',grading:{sizes:['S','M'],baseSize:'M',
 widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[
 {id:'front',name:'Front',fabricId:'shell',cutQuantity:2,grainAngleDeg:0,seamAllowance:1,
  notches:[{edgeIndex:0,t:.25,depthCm:.3}],
  points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]},
 {id:'collar',name:'Collar',fabricId:'rib',cutQuantity:1,grainAngleDeg:0,seamAllowance:1,
  points:[{x:0,y:0},{x:7,y:0},{x:7,y:3},{x:0,y:3}]},
]})
const wires=p=>Object.fromEntries(p.grading.sizes.map(size=>[size,
 projectToDxf(gradeProject(p,size),size,{cutlineMode:'manufacturing',requireGradedGeometry:true})]))
const hideCutTable=wire=>wire.replace('0\nSECTION\n2\nENTITIES',
 '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n0\nLAYER\n2\nCUT_FRONT_M\n70\n1\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES')

test('two-size/two-fabric physical DXF envelope passes read-only with no independent receiving or cutter claims',()=>{
 const p=source(),original=structuredClone(p),w=wires(p),before=structuredClone(w)
 const result=inspect(p,w)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.deepEqual(result.rows.map(r=>r.size),['S','M'])
 assert(result.rows.every(r=>r.headerFields>0&&r.entityGroupPairs>0))
 for(const key of ['independentReceiverAuthenticated','receiverCadVerified','aamaCertified','astmCertified','cuttingAuthorized','factoryApproved'])
  assert.equal(result[key],false)
 assert.deepEqual(p,original);assert.deepEqual(w,before)
 const normalized={...w,M:w.M.replace(/\n10\n(-?\d+)\n/,(_,v)=>`\n10\n${v}.0000\n`).replace(/\n/g,'\r\n')}
 assert.equal(inspect(p,normalized).ok,true,'Entity numeric formatting and CRLF must not affect header envelope')
})

test('real hidden CUT layer TABLES injection bypasses existing geometry/entity checks but is refused by envelope gate',()=>{
 const p=source(),w=wires(p),tampered={...w,M:hideCutTable(w.M)}
 assert.notEqual(tampered.M,w.M)
 assert.equal(inspectIndustrialCadInterchange20261028(p,{wireBySize:tampered}).ok,true,
  'Existing CUT-only inspector should demonstrate original blind spot')
 assert.equal(inspectIndustrialReceivingEntityInventory20261028(p,tampered).ok,true,
  'Existing all-entity inspector should demonstrate original blind spot')
 const result=inspect(p,tampered)
 assert.equal(result.ok,false)
 assert(result.issues.some(i=>i.code==='RECEIVER_DXF_ENVELOPE_REFUSED'))
 assert.equal(result.cuttingAuthorized,false)
})

test('altered insertion origin, duplicated header and changed measurement metadata refuse all-size receiving envelope',()=>{
 const p=source(),w=wires(p)
 for(const change of [
  wire=>wire.replace('9\n$INSUNITS\n70\n4','9\n$INSBASE\n10\n200\n20\n0\n9\n$INSUNITS\n70\n4'),
  wire=>wire.replace('9\n$MEASUREMENT\n70\n1','9\n$MEASUREMENT\n70\n0'),
  wire=>wire.replace('9\n$INSUNITS\n70\n4','9\n$INSUNITS\n70\n4\n9\n$INSUNITS\n70\n4'),
  wire=>wire.replace('1\nAC1009','1\nAC1027'),
 ]){
  const mutated=change(w.S)
  assert.notEqual(mutated,w.S)
  const result=inspect(p,{...w,S:mutated})
  assert.equal(result.ok,false,JSON.stringify(result))
  assert.equal(result.receiverCadVerified,false)
  assert.equal(result.factoryApproved,false)
 }
})

test('unexpected BLOCKS section, duplicated EOF, trailing commands and missing sizes fail closed',()=>{
 const p=source(),w=wires(p)
 const variations=[
  wire=>wire.replace('0\nSECTION\n2\nENTITIES','0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES'),
  wire=>wire+'\n0\nEOF',
  wire=>wire+'\n0\nLINE\n8\nCUT_EXTRA',
  wire=>wire.replace('0\nENDSEC\n0\nEOF','0\nEOF'),
 ]
 for(const [index,change] of variations.entries()){
  const changed=change(w.M)
  assert.notEqual(changed,w.M,`variation ${index} must actually alter the DXF`)
  const result=inspect(p,{...w,M:changed})
  assert.equal(result.ok,false,`variation ${index}: ${JSON.stringify(result)}`)
  assert.equal(result.cuttingAuthorized,false)
 }
 assert.equal(inspect(p,{S:w.S}).ok,false)
 assert.equal(inspect(p,{...w,XL:w.M}).ok,false)
})
