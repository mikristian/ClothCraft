import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkNativeCutProofAama20261024 as build} from './accumarkNativeCutProofAama20261024.mjs'
import {parseSeamlyAamaManufacturingSemantics as read} from './seamlyAamaManufacturingSemantics20261023.mjs'

const fixture=()=>({
 revision:21,
 template:{name:'source-CUT',seams:[],panels:[
  {id:'front',name:'front',fabric:'main',grain_degrees:0,
   polygon:{points:[[0,0],[.2,0],[.2,.1],[0,.1]],edges:['a','b','c','d'],holes:[],seam_allowances:{a:.01,b:.01,c:.01,d:.01}}},
  {id:'back',name:'back',fabric:'main',grain_degrees:0,
   polygon:{points:[[.3,0],[.5,0],[.5,.12],[.3,.12]],edges:['a','b','c','d'],holes:[],seam_allowances:{a:0,b:0,c:0,d:0}}}
 ]},
})
const proof=()=>({format:'exo-native-cutline-proof.v1',revision:21,units:'mm',
 factoryApproved:false,blockedCount:0,generatedCount:2,panels:[
  {panelId:'front',ok:true,pointsMm:[[-10,-10],[210,-10],[210,110],[-10,110]]},
  {panelId:'back',ok:true,pointsMm:[[300,0],[500,0],[500,120],[300,120]]},
 ]})
test('verified Rust source CUT proof -> independent R12 AAMA geometric wire -> parsed 2 panels',()=>{
 const source=fixture(),nativeProof=proof(),preserved=structuredClone([source,nativeProof])
 const result=build(source,nativeProof,{size:'M'})
 assert.equal(result.ok,true,JSON.stringify(result))
 assert.equal(result.independentLocalDxfRoundtrip,true)
 assert.equal(result.units,'mm')
 assert.equal(result.pieceCount,2)
 const readBack=read(result.dxf,{unit:'mm'})
 assert.deepEqual(readBack.pieces.map(p=>p.name),['EXO_front','EXO_back'])
 assert.deepEqual(readBack.pieces[0].cutOutlineMm.points[0],{x:-10,y:-10})
 assert.deepEqual(readBack.pieces[0].cutOutlineMm.points[2],{x:210,y:110})
 assert.equal(result.manufacturingApproved,false)
 assert.equal(result.realReceivingCadVerified,false)
 assert.equal(result.gradeRulesTransferred,false)
 assert.deepEqual([source,nativeProof],preserved)
})
test('source CUT polygon differs from native STITCH polygon when source has allowances',()=>{
 const source=fixture(),out=build(source,proof())
 assert.equal(out.ok,true)
 const data=read(out.dxf,{unit:'mm'})
 assert.notEqual(data.pieces[0].cutOutlineMm.points[0].x,
   source.template.panels[0].polygon.points[0][0]*1000)
})
test('reject stale Rust proof revision and missing/blocked physical CUT panels',()=>{
 const source=fixture()
 const stale=proof();stale.revision++
 assert.equal(build(source,stale).ok,false)
 const missing=proof();missing.panels.pop()
 assert.equal(build(source,missing).ok,false)
 const blocked=proof();blocked.blockedCount=1
 assert.equal(build(source,blocked).ok,false)
})
test('nonlinear edges, marks and assembled sewing relations cannot be lost as fake CUT interchange',()=>{
 for(const change of [
  s=>{s.template.seams=[{id:'shoulder'}]},
  s=>{s.template.panels[0].polygon.curves={a:[[.03,-.04],[.1,-.04]]}},
  s=>{s.template.panels[0].polygon.free_curve_points={a:[{t:.5,position:[.1,-.03]}]}},
  s=>{s.template.panels[0].polygon.holes=[{points:[[.02,.02],[.03,.02],[.02,.03]]}]},
  s=>{s.template.panels[0].polygon.lines=[{a:[0,0],b:[.01,.01]}]},
  s=>{s.template.panels[0].polygon.notches=[{id:'N',edge:'a'}]},
  s=>{s.template.panels[0].grain_degrees=90},
 ]){
  const source=fixture();change(source)
  assert.equal(build(source,proof()).ok,false)
 }
})
test('reject missing native grain metadata and malformed or excessive cut polygon',()=>{
 const source=fixture();source.template.panels[1].id='front'
 assert.equal(build(source,proof()).ok,false)
 const noCut=proof();noCut.panels[0].pointsMm=[[0,0],[1,1],[2,2]]
 assert.equal(build(fixture(),noCut).ok,false)
 const unsafe=proof();unsafe.panels[0].pointsMm=[[0,0],[1,0],[NaN,1]]
 assert.equal(build(fixture(),unsafe).ok,false)
})
test('same-revision forged CUT polygons cannot masquerade as independently proven Rust source geometry',()=>{
 const bad=proof()
 bad.panels[0].pointsMm=[[0,0],[1,0],[1,1],[0,1]]
 const out=build(fixture(),bad)
 assert.equal(out.ok,false)
 assert.match(out.detail,/RUST_PROOF_SOURCE_CUT_GEOMETRY_MISMATCH/)
 const shifted=proof()
 shifted.panels[0].pointsMm=[[-11,-10],[210,-10],[210,110],[-11,110]]
 assert.equal(build(fixture(),shifted).ok,false)
})
test('Rust object-map native notch station and untransferred physical proof notch count refuse AAMA export',()=>{
 const source=fixture()
 source.template.panels[0].polygon.notches={a:[{id:'notch1',t:.5,depth:.005}]}
 assert.equal(build(source,proof()).ok,false)
 const marked=proof();marked.panels[0].notchMarkCount=1
 marked.panels[0].notchMarksMm=[{pointMm:[5,-10]}]
 assert.equal(build(fixture(),marked).ok,false)
})
test('no source getter can execute through snapshot/physical CUT proof input',()=>{
 const source=fixture();let calls=0
 Object.defineProperty(source.template.panels[0],'name',{get(){calls++;throw Error('EXECUTED')},enumerable:true})
 assert.equal(build(source,proof()).ok,false)
 assert.equal(calls,0)
 const cyclic=proof();cyclic.cycle=cyclic
 assert.equal(build(fixture(),cyclic).ok,false)
})
test('unsafe source/target size labels and unexpected manufacturing output always fail closed',()=>{
 assert.equal(build(fixture(),proof(),{size:'../M'}).ok,false)
 const approval=proof();approval.factoryApproved=true
 assert.equal(build(fixture(),approval).ok,false)
})
