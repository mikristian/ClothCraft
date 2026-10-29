import test from 'node:test'
import assert from 'node:assert/strict'
import {buildAccuMarkExplorerOrder20261024} from './accumarkExplorerProductionFoundation20261024.js'
import {buildAccuMarkCutRoomPlan} from './accumarkCutRoomPlan20261024.js'
import {parseAccuMarkGradedDxfWire20261023} from './accumarkGradedDxfRoundtripAudit20261023.js'
import {sha256Bytes} from './sha256Bytes.js'
import {buildIndustrialCadOrderHandoff20261028} from './industrialCadOrderHandoff20261028.mjs'
import {inspectIndustrialCadInterchange20261028} from './industrialCadRoundtripGate20261028.mjs'
import {inspectIndustrialCadReceivingReexport20261028 as inspect} from './industrialCadReceivingReexport20261028.mjs'

const sha=s=>sha256Bytes(new TextEncoder().encode(s))
const counts=wire=>{
 const parsed=parseAccuMarkGradedDxfWire20261023(wire)
 assert.equal(parsed.ok,true,JSON.stringify(parsed.issues))
 const result={cut:0,stitch:0,allowance:0,notch:0}
 for(const e of parsed.entities){
  if(e.layer?.startsWith('CUT_'))result.cut++
  if(e.layer?.startsWith('STITCH_'))result.stitch++
  if(e.layer?.startsWith('SA_'))result.allowance++
  if(e.layer?.startsWith('NOTCH_'))result.notch++
 }
 return result
}

function disposableGarment(){
 const project={id:'disposable-receiver-tee',grading:{sizes:['S','M'],baseSize:'M',
  widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[
  {id:'front',name:'Front',fabricId:'shell',cutQuantity:2,grainAngleDeg:0,seamAllowance:1,
   notches:[{edgeIndex:0,t:.25,depthCm:.3}],
   points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}]},
  {id:'collar',name:'Collar',fabricId:'rib',cutQuantity:1,grainAngleDeg:0,seamAllowance:1,
   points:[{x:0,y:0},{x:7,y:0},{x:7,y:3},{x:0,y:3}]},
 ]}
 const qty={S:2,M:1}
 const explorer=buildAccuMarkExplorerOrder20261024(project,
  {styleId:'TEE-RECEIVER',orderId:'ORDER-RECEIVER',quantitiesBySize:qty})
 assert.equal(explorer.ok,true)
 const plans={}
 for(const fabricId of ['shell','rib']){
  plans[fabricId]=buildAccuMarkCutRoomPlan(project,{fabricId,quantitiesBySize:qty,
   fabricWidthCm:30,spacingCm:1,nap:true,maxPlyCount:2,
   rolls:[{rollId:`${fabricId}-ROLL`,batchId:`${fabricId}-BATCH`,fabricId,
    shade:'SHADE-1',nap:true,usableLengthCm:150,costPerMeter:20,widthCm:30}]})
  assert.equal(plans[fabricId].ok,true,JSON.stringify(plans[fabricId].issues))
 }
 const handoff=buildIndustrialCadOrderHandoff20261028(project,explorer,plans)
 assert.equal(handoff.ok,true,JSON.stringify(handoff.issues))
 const packet={manifest:handoff.manifest,manifestSha256:handoff.manifestSha256}
 // Simulated *local* receiving re-export. These bytes are NOT third-party
 // evidence and must never cause receiverCadVerified to become true.
 const reexportWiresBySize={...handoff.wiresBySize}
 const evidence={format:'exo.receiving-CAD-reexport-evidence.v1',
  handoffManifestSha256:handoff.manifestSha256,
  receiverApplication:'MOCK_RECEIVER',receiverVersion:'test-1',
  receiverSessionId:'disposable-session',reexportWiresBySize,
  importRecords:project.grading.sizes.map(size=>({size,imported:true,
   sourceSha256:sha(handoff.wiresBySize[size]),
   reexportSha256:sha(reexportWiresBySize[size]),
   layerCounts:counts(reexportWiresBySize[size])}))}
 return {project,explorer,plans,packet,outboundWires:handoff.wiresBySize,evidence}
}
const base=disposableGarment()
const fixture=()=>structuredClone(base)
const run=v=>inspect(v.project,v.explorer,v.plans,v.packet,v.outboundWires,v.evidence)
const blocked=(mutate,code)=>{
 const v=fixture();mutate(v)
 const result=run(v)
 assert.equal(result.ok,false,`Expected rejection ${code}`)
 assert(result.issues.some(i=>i.code===code),JSON.stringify(result.issues))
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
}
const refresh=v=>{
 for(const row of v.evidence.importRecords){
  row.reexportSha256=sha(v.evidence.reexportWiresBySize[row.size])
  row.layerCounts=counts(v.evidence.reexportWiresBySize[row.size])
 }
}

test('all-size raw re-exported R12 CUT/STITCH/notch geometry crosschecks without falsely approving receiving CAD',()=>{
 const v=fixture(),before=structuredClone(v),result=run(v)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.sizeCount,2)
 assert.equal(result.artifacts.length,2)
 assert(result.artifacts.every(x=>x.layerCounts.cut===2&&x.layerCounts.stitch===2&&x.layerCounts.notch===1))
 assert.equal(result.receivingGeometryCrosschecked,true)
 assert.equal(result.receivingEnvelopeVerified,true)
 assert.equal(result.independentReceiverAuthenticated,false)
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.aamaCertified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
 assert.deepEqual(v,before)
})

test('missing/extra raw size, duplicate import records and metadata-only receipts fail closed',()=>{
 blocked(v=>{delete v.evidence.reexportWiresBySize.M},'INCOMPLETE_RECEIVER_SIZE_SET')
 blocked(v=>{v.evidence.reexportWiresBySize.XL=v.evidence.reexportWiresBySize.M},'INCOMPLETE_RECEIVER_SIZE_SET')
 blocked(v=>{v.evidence.importRecords[1].size='S'},'INCOMPLETE_RECEIVER_SIZE_SET')
 blocked(v=>{v.evidence.reexportWiresBySize.S=''},'RECEIVER_IMPORT_RECORD_DRIFT')
 blocked(v=>{v.evidence.importRecords[0].imported=false},'RECEIVER_IMPORT_RECORD_DRIFT')
})

test('receiver evidence must bind actual source and re-export hashes and physical layer counts',()=>{
 blocked(v=>{v.evidence.importRecords[0].sourceSha256='0'.repeat(64)},'RECEIVER_IMPORT_RECORD_DRIFT')
 blocked(v=>{v.evidence.importRecords[1].reexportSha256='0'.repeat(64)},'RECEIVER_IMPORT_RECORD_DRIFT')
 blocked(v=>{v.evidence.importRecords[0].layerCounts.notch=0},'RECEIVER_LAYER_INVENTORY_DRIFT')
 blocked(v=>{v.evidence.handoffManifestSha256='0'.repeat(64)},'INVALID_OR_UNTRUSTED_RECEIVER_CLAIM')
})

test('even rehashed receiver files reject swapped sizes, missing notches, stitch layers, physical CUT edits and changed units',()=>{
 blocked(v=>{
  const w=v.evidence.reexportWiresBySize
  ;[w.S,w.M]=[w.M,w.S];refresh(v)
 },'RECEIVER_REEXPORT_GEOMETRY_DRIFT')
 blocked(v=>{
  v.evidence.reexportWiresBySize.M=v.evidence.reexportWiresBySize.M.replace('NOTCH_FRONT','NOTCH_BROKEN')
  refresh(v)
 },'RECEIVER_REEXPORT_GEOMETRY_DRIFT')
 blocked(v=>{
  v.evidence.reexportWiresBySize.S=v.evidence.reexportWiresBySize.S.replace('STITCH_FRONT','STITCH_BROKEN')
  refresh(v)
 },'RECEIVER_REEXPORT_GEOMETRY_DRIFT')
 blocked(v=>{
  const wire=v.evidence.reexportWiresBySize.M
  const start=wire.indexOf('8\nCUT_FRONT_M\n')
  assert(start>=0,'Expected real CUT layer in disposable fixture')
  const after=wire.slice(start),match=/\n10\n(-?[\d.]+)/.exec(after)
  assert(match,'Expected real CUT X vertex')
  const changed=after.replace(match[0],`\n10\n${Number(match[1])+2}`)
  v.evidence.reexportWiresBySize.M=wire.slice(0,start)+changed
  refresh(v)
 },'RECEIVER_REEXPORT_GEOMETRY_DRIFT')
 blocked(v=>{
  v.evidence.reexportWiresBySize.M=v.evidence.reexportWiresBySize.M.replace('9\n$INSUNITS\n70\n4','9\n$INSUNITS\n70\n1')
  v.evidence.importRecords.find(r=>r.size==='M').reexportSha256=sha(v.evidence.reexportWiresBySize.M)
 },'INVALID_RECEIVER_DXF')
})

test('claimed receiver certification or cutting release never overrides unsigned evidence',()=>{
 blocked(v=>{v.evidence.receiverCadVerified=true},'INVALID_OR_UNTRUSTED_RECEIVER_CLAIM')
 blocked(v=>{v.evidence.cuttingAuthorized=true},'INVALID_OR_UNTRUSTED_RECEIVER_CLAIM')
 blocked(v=>{v.evidence.factoryApproved=true},'INVALID_OR_UNTRUSTED_RECEIVER_CLAIM')
 blocked(v=>{v.evidence.aamaCertified=true},'INVALID_OR_UNTRUSTED_RECEIVER_CLAIM')
 blocked(v=>{v.evidence.receiverApplication=''},'INVALID_OR_UNTRUSTED_RECEIVER_CLAIM')
})

test('source order and handoff mutation invalidate even unchanged receiver geometry',()=>{
 blocked(v=>{v.explorer.order.quantitiesBySize.S=3},'SOURCE_HANDOFF_UNVERIFIED')
 blocked(v=>{v.project.pieces[0].seamAllowance=1.8},'SOURCE_HANDOFF_UNVERIFIED')
 blocked(v=>{v.packet.manifestSha256='0'.repeat(64)},'SOURCE_HANDOFF_UNVERIFIED')
})

test('receiver re-export rejects rehashed grainline, label and hidden cutter entities missed by CUT-only geometry',()=>{
 const variants=[
  wire=>wire.replace(/(8\nGRAIN_FRONT\n10\n)(-?[\d.]+)/,
   (_,prefix,x)=>`${prefix}${Number(x)+2}`),
  wire=>wire.replace('1\nFront / M','1\nFront / XL'),
  wire=>wire.replace('0\nENDSEC\n0\nEOF',
   '0\nLINE\n8\nCUTTER_EXTRA\n10\n0\n20\n0\n11\n100\n21\n100\n0\nENDSEC\n0\nEOF'),
 ]
 for(const mutate of variants){
  const v=fixture(),original=v.evidence.reexportWiresBySize.M
  v.evidence.reexportWiresBySize.M=mutate(original)
  assert.notEqual(v.evidence.reexportWiresBySize.M,original)
  refresh(v) // Rehash and recompute claimed layers: the threat is not a stale receipt.
  const cutOnly=inspectIndustrialCadInterchange20261028(v.project,
   {wireBySize:v.evidence.reexportWiresBySize})
  assert.equal(cutOnly.ok,true,`Fixture must prove the old CUT-only blind spot: ${JSON.stringify(cutOnly.issues)}`)
  const result=run(v)
  assert.equal(result.ok,false,JSON.stringify(result))
  assert(result.issues.some(i=>i.code==='RECEIVER_AUXILIARY_ENTITY_DRIFT'),
   JSON.stringify(result.issues))
  assert.equal(result.receiverCadVerified,false)
  assert.equal(result.cuttingAuthorized,false)
  assert.equal(result.factoryApproved,false)
 }
})

test('receiving integration rejects a rehashed hidden CUT-layer table even when all entity geometry still matches',()=>{
 const v=fixture(),original=v.evidence.reexportWiresBySize.M
 v.evidence.reexportWiresBySize.M=original.replace('0\nSECTION\n2\nENTITIES',
  '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n0\nLAYER\n2\nCUT_FRONT_M\n70\n1\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES')
 assert.notEqual(v.evidence.reexportWiresBySize.M,original)
 refresh(v)
 assert.equal(inspectIndustrialCadInterchange20261028(v.project,
  {wireBySize:v.evidence.reexportWiresBySize}).ok,true)
 const result=run(v)
 assert.equal(result.ok,false,JSON.stringify(result))
 assert(result.issues.some(i=>i.code==='RECEIVER_DXF_ENVELOPE_DRIFT'))
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
})

test('receiving integration blocks rehashed duplicate DXF handles that pass physical geometry checks',()=>{
 const v=fixture(),original=v.evidence.reexportWiresBySize.M
 let changed=original.replace('0\nPOLYLINE\n8\nCUT_FRONT_M',
  '0\nPOLYLINE\n5\nAB\n8\nCUT_FRONT_M')
 changed=changed.replace('0\nPOLYLINE\n8\nCUT_COLLAR_M',
  '0\nPOLYLINE\n5\n00ab\n8\nCUT_COLLAR_M')
 assert.notEqual(changed,original)
 v.evidence.reexportWiresBySize.M=changed
 refresh(v)
 assert.equal(inspectIndustrialCadInterchange20261028(v.project,
  {wireBySize:v.evidence.reexportWiresBySize}).ok,true,
  'CUT-only audit must demonstrably miss the duplicate-handle defect')
 const result=run(v)
 assert.equal(result.ok,false,JSON.stringify(result))
 assert(result.issues.some(i=>i.code==='RECEIVER_ENTITY_HANDLE_DRIFT'),
  JSON.stringify(result.issues))
 assert.equal(result.receiverCadVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.factoryApproved,false)
})
