import test from 'node:test'
import assert from 'node:assert/strict'
import {qualifyIndustrialCutterStudy20261028 as qualify} from './industrialCutterQualification20261028.mjs'
const profile={profileId:'test-cutter',manufacturer:'Fixture',model:'One',bedWidthMm:500,bedLengthMm:600,supportsNotches:true,supportsDrills:false}
const study={ok:true,format:'exo.machine-neutral-CUT-inspection.v1',fabricWidthMm:400,records:[{pieceId:'front',instance:0,physicalCutPathMm:[{xMm:10,yMm:10},{xMm:200,yMm:10},{xMm:200,yMm:300},{xMm:10,yMm:10}]}]}
const marks={ok:true,placements:[{pieceId:'front',instance:0,notches:[{startCm:{x:1,y:1},endCm:{x:2,y:2}}],drills:[]}]}
const evidence={calibration:{referenceLengthMm:100,measuredLengthMm:100,operatorId:'operator1',measuredAt:'2026-10-28'},receiverAcceptance:{accepted:true,application:'SampleCAD',version:'v1',operatorId:'operator1',evidenceFiles:['receiver-report.txt']}}
test('documented review can pass while physical cutting stays prohibited',()=>{const r=qualify(study,marks,profile,evidence);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.cuttingAuthorized,false);assert.equal(r.machineReady,false);assert.equal(r.cutterProtocolVerified,false)})
test('missing calibration/receiver evidence and notch-incompatible machine refuse',()=>{const r=qualify(study,marks,{...profile,supportsNotches:false});assert.equal(r.ok,false);assert(r.issues.some(i=>i.code==='NOTCH_TOOL_UNSUPPORTED'));assert(r.issues.some(i=>i.code==='CALIBRATION_NOT_VERIFIED'));assert(r.issues.some(i=>i.code==='RECEIVER_ACCEPTANCE_NOT_DOCUMENTED'))})
test('bed envelope and missing placed marks are detected',()=>{const r=qualify(study,marks,{...profile,bedLengthMm:100},evidence);assert(r.issues.some(i=>i.code==='BED_LENGTH_EXCEEDED'));assert.equal(qualify(study,{ok:true,placements:[]},profile,evidence).ok,false)})
test('duplicate or empty receiver evidence files cannot count as documented acceptance',()=>{
 for(const evidenceFiles of [[],[''],['report.txt','report.txt'],[null]]){
  const result=qualify(study,marks,profile,{...evidence,receiverAcceptance:{...evidence.receiverAcceptance,evidenceFiles}})
  assert.equal(result.ok,false)
  assert(result.issues.some(issue=>issue.code==='RECEIVER_ACCEPTANCE_NOT_DOCUMENTED'))
  assert.equal(result.cuttingAuthorized,false)
 }
})
