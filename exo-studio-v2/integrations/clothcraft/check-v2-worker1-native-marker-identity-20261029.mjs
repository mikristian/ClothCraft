import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'
import {nestPolygons} from '../../src/core/accumarkPolygonNesting20261024.js'

// Opt-in native handoff. CUT outlines are in metres; polygon nesting uses cm.
// Quantity=1 per native panel here is an EXPLICIT fixture order, not an inferred
// factory cut quantity. All fingerprints bind to persisted Rust source values.
const sizes=['XS','S','M','L','XL','XXL']
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-worker1-native-marker-'))
const workspace=createWorkspace(dir)
let snapshot
const rpc=async packet=>{
  const reply=await workspace.request({revision:snapshot?.revision,...packet})
  assert.equal(reply.ok,true,`${packet.op}: ${reply.error}`)
  if(reply.data?.template)snapshot=reply.data
  return reply.data
}
const reject=async packet=>{
  const prior=(await rpc({op:'save'})).project
  const reply=await workspace.request({revision:snapshot.revision,...packet})
  assert.equal(reply.ok,false,`${packet.op}: unexpectedly accepted`)
  assert.deepEqual((await rpc({op:'save'})).project,prior,'native rejection mutated project')
}
const handoff=(saved,cuts,expectedFingerprint)=>{
  assert(saved?.template?.panels?.length>=2&&saved?.grade_run)
  const fingerprint=digest({sourceTemplate:saved.template,gradeRun:saved.grade_run})
  assert.equal(fingerprint,expectedFingerprint,'STALE_NATIVE_SOURCE: source/catalog changed')
  assert.deepEqual(saved.grade_run.sizes,sizes)
  assert.equal(cuts.format,'exo-native-graded-cutlines.v1')
  assert.deepEqual(cuts.sizes.map(x=>x.size),sizes)
  assert.equal(cuts.cuttingAuthorized,false)
  const panelIds=saved.template.panels.map(p=>p.id).sort()
  const markers=cuts.sizes.map(size=>{
    assert.deepEqual(size.panels.map(p=>p.panel_id).sort(),panelIds,'NATIVE_CUT_PIECE_IDENTITY_DRIFT')
    const pieces=size.panels.map(panel=>{
      assert(panel.cut.points.length>=3&&panel.cut.points.every(p=>p.length===2&&p.every(Number.isFinite)))
      return {id:panel.panel_id,name:panel.panel_id,fabricId:'main',cutQuantity:1,
        seamAllowance:0,grainAngleDeg:0,marker:{nap:'one-way'},
        points:panel.cut.points.map(([x,y])=>({x:x*100,y:y*100}))}
    })
    const marker=nestPolygons({pieces},{fabricWidth:150,gap:1,maxLength:400,maxCandidates:12000})
    assert.equal(marker.ok,true,JSON.stringify(marker.errors||marker.unplaced))
    assert.equal(marker.placements.length,panelIds.length)
    assert.deepEqual(marker.placements.map(p=>p.pieceId).sort(),panelIds)
    assert(marker.placements.every(p=>p.rotationDeg===0&&p.x>=0&&p.y>=0&&p.x+p.width<=150+1e-6))
    return {size:size.size,sourceFingerprint:fingerprint,sourceRevision:snapshot.revision,marker}
  })
  return markers
}
try{
  await rpc({op:'open',preset:'tshirt'})
  for(const panel of [...snapshot.template.panels])for(const edge of panel.polygon.edges)
    await rpc({op:'edit',command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.012}})
  const original=structuredClone(snapshot)
  const made=createAccuMarkNativeRuleSet(original)
  assert.equal(made.ok,true,made.reason)
  for(const panel of original.template.panels)for(let i=0;i<sizes.length;i++){
    const factor=(i-2)*8
    made.ruleSet.panels[panel.id].pointOffsetsMm[sizes[i]]=panel.polygon.points.map(([x,y])=>[x*factor,y*factor])
  }
  const prepared=prepareNativeGradeCatalog20261025(original,{template:structuredClone(original.template)},made.ruleSet)
  assert.equal(prepared.ok,true,prepared.reason)
  await rpc({op:'grade-run-commit',gradeRun:prepared.gradeRun})
  const saved=(await rpc({op:'save'})).project
  const cuts=await rpc({op:'grade-run-cutlines'})
  const fingerprint=digest({sourceTemplate:saved.template,gradeRun:saved.grade_run})
  const markers=handoff(saved,cuts,fingerprint)
  assert.equal(markers.length,6)
  assert(markers.every(m=>m.marker.metrics.requested===saved.template.panels.length))
  assert.throws(()=>handoff({...saved,template:{...saved.template,name:'stale'}},cuts,fingerprint),/STALE_NATIVE_SOURCE/)
  assert.throws(()=>handoff({...saved,grade_run:{...saved.grade_run,baseSize:'XL'}},cuts,fingerprint),/STALE_NATIVE_SOURCE/)
  const corrupted=structuredClone(cuts)
  corrupted.sizes[0].panels[0].panel_id='forged'
  assert.throws(()=>handoff(saved,corrupted,fingerprint),/NATIVE_CUT_PIECE_IDENTITY_DRIFT/)
  await reject({op:'grade-run-commit',gradeRun:{...saved.grade_run,sourceTemplate:{...saved.grade_run.sourceTemplate,panels:[]}}})
  await rpc({op:'undo'})
  const undone=(await rpc({op:'save'})).project
  assert.notDeepEqual(undone.grade_run,saved.grade_run)
  await rpc({op:'redo'})
  const redone=(await rpc({op:'save'})).project
  assert.deepEqual(redone,saved)
  const redoneCuts=await rpc({op:'grade-run-cutlines'})
  assert.deepEqual(handoff(redone,redoneCuts,fingerprint).map(x=>x.marker),markers.map(x=>x.marker))
  await rpc({op:'open',project:saved})
  const reopened=(await rpc({op:'save'})).project
  const reopenedCuts=await rpc({op:'grade-run-cutlines'})
  assert.deepEqual(handoff(reopened,reopenedCuts,fingerprint).map(x=>x.marker),markers.map(x=>x.marker))
  console.log(JSON.stringify({result:'PASS',source:'persisted-native-Rust-project',sizes:6,panelsPerSize:saved.template.panels.length,physicalMarkers:6,cutpieceInstances:markers.reduce((n,x)=>n+x.marker.placements.length,0),fingerprint,staleRejects:2,identityRejects:1,nativeInvalidCommitRejected:true,undoRedo:true,saveReopen:true,cuttingAuthorized:false,quantityAuthority:'explicit-fixture-one-per-panel'}))
}finally{
  workspace.close()
  fs.rmSync(dir,{recursive:true,force:true})
}
