import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {unzipSync,strFromU8} from 'fflate'
import {auditAccuMarkCadInterchangeReceiving20261024 as audit} from './accumarkCadInterchangeReceivingQA20261024.mjs'

// Independent Seamly2D-generated source fixture. The 'receiver' wires below are
// deliberately disposable caller-provided copies, NOT licensed CAD exports.
const packet=readFileSync(new URL('../../research/oss/pattern-cad/runtime/verified-exports/seamly-48-52-cad-receiver-evaluation-NOT-APPROVED.zip',import.meta.url))
const files=unzipSync(packet)
const wires=()=>({48:strFromU8(files['graded-aama/seamly-size-48.dxf']),52:strFromU8(files['graded-aama/seamly-size-52.dxf'])})
const neverApproved=report=>{
  assert.equal(report.scope,'local-source-and-geometry-only')
  for(const flag of ['receivingCadVerified','receivingCadApproved','manufacturingApproved','factoryApproved','cuttingAuthorized'])assert.equal(report[flag],false,flag)
}

test('original two-size Seamly2D packet passes source inspection but no receiving-CAD acceptance',async()=>{
  const report=await audit(packet)
  assert.equal(report.ok,true,JSON.stringify(report.issues))
  assert.deepEqual(report.sizes.map(x=>[x.sizeCm,x.cutPieces]),[[48,5],[52,5]])
  assert.equal(report.receiverGeometryCompared,false)
  neverApproved(report)
})

test('copied source DXFs are only local geometry comparisons, never independent receiving proof',async()=>{
  const report=await audit(packet,{receiverDxfs:wires()})
  assert.equal(report.ok,true,JSON.stringify(report.issues))
  assert.equal(report.receiverGeometryCompared,true)
  assert(report.sizes.every(x=>x.receiverCompared))
  neverApproved(report)
})

test('self-attested licensed receiver metadata cannot upgrade a local comparison',async()=>{
  const report=await audit(packet,{receiverDxfs:wires(),independentReceiver:true,
    independentlyVerified:true,receivingCadVerified:true,licensedCadApplication:'Gerber AccuMark',
    physicalSampleApproved:true,cuttingAuthorized:true})
  assert.equal(report.receiverGeometryCompared,true)
  neverApproved(report)
})

test('one altered size is rejected and cannot claim complete all-size comparison',async()=>{
  const modified=wires()
  modified[52]=modified[52].replace(/\n\s*10\s*\n\s*(-?\d+\.\d+)/,(_,n)=>'\n 10\n'+String(Number(n)+8))
  assert.notEqual(modified[52],wires()[52])
  const report=await audit(packet,{receiverDxfs:modified})
  assert.equal(report.ok,false)
  assert.equal(report.receiverGeometryCompared,false)
  assert(report.issues.some(x=>x.code==='GEOMETRY_LOSS'))
  neverApproved(report)
})

test('missing receiving size fails closed without any factory or CAD acceptance',async()=>{
  const report=await audit(packet,{receiverDxfs:{48:wires()[48]}})
  assert.equal(report.ok,false)
  assert.equal(report.receiverGeometryCompared,false)
  assert(report.issues.some(x=>x.code==='RECEIVER_MISSING'))
  neverApproved(report)
})
