// Compiled-Rust 24-size cubic sewline/CUT inspection and fail-closed topology.
// Internal engineering evidence only: no licensed receiving CAD or factory release.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-24size-curves-'))
const workspace=createWorkspace(temp)
const sizes=Array.from({length:24},(_,i)=>String(i+1))
const clone=structuredClone
let snapshot
const rpc=async packet=>{
  const reply=await workspace.request({revision:snapshot?.revision,...packet})
  assert.equal(reply.ok,true,`${packet.op}: ${reply.error||'native Rust rejection'}`)
  if(reply.data?.template)snapshot=reply.data
  return reply.data
}
const save=async()=>(await rpc({op:'save'})).project
const panelOf=(template,id)=>{
  const panel=template.panels.find(item=>item.id===id)
  assert(panel?.polygon,`Missing graded panel ${id}`)
  return panel.polygon
}
const near=(actual,expected,label,tolerance=1e-8)=>
  assert(Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance,
    `${label}: ${actual} differs from ${expected}`)
const rejectAtomic=async packet=>{
  const before=await save(),revision=snapshot.revision
  const response=await workspace.request({revision,...packet})
  assert.equal(response.ok,false,`${packet.op} accepted invalid geometry or stale revision`)
  await rpc({op:'snapshot'})
  assert.equal(snapshot.revision,revision,`${packet.op} changed Rust revision on rejection`)
  assert.deepEqual(await save(),before,`${packet.op} mutated durable garment on rejection`)
  return response.error
}
const inspect=async(panelId,edgeId,project)=>{
  const cut=await rpc({op:'grade-run-cutlines'})
  const industrial=await rpc({op:'grade-run-industrial-audit',panel:panelId})
  assert.equal(cut.format,'exo-native-graded-cutlines.v1')
  assert.equal(industrial.format,'exo-native-linked-industrial-named-sizes-proof.v2')
  assert.deepEqual(cut.sizes.map(item=>item.size),sizes)
  assert.deepEqual(industrial.sizes.map(item=>item.size),sizes)
  assert.equal(cut.cuttingAuthorized,false)
  assert.equal(cut.manufacturerReady,false)
  assert.equal(industrial.factoryApproved,false)
  let verified=0
  for(let i=0;i<sizes.length;i++){
    const poly=panelOf(project.grade_run.gradedTemplates[i],panelId)
    const edge=industrial.sizes[i].edges.find(item=>item.edgeId===edgeId)
    assert(edge,`Missing Rust industrial curved edge for size ${sizes[i]}`)
    assert.deepEqual(edge.cubicControlPointsM,poly.curves[edgeId])
    near(edge.allowanceM,.012,`size ${sizes[i]} allowance`)
    assert.equal(edge.notches.length,1)
    near(edge.notches[0].fraction,.43,`size ${sizes[i]} notch station`)
    near(edge.notches[0].depthM,.004,`size ${sizes[i]} notch depth`)
    near(edge.notches[0].seamArclengthM,edge.physicalSeamArclengthM*.43,
      `size ${sizes[i]} curved arclength notch`)
    const chord=Math.hypot(poly.points[1][0]-poly.points[0][0],
      poly.points[1][1]-poly.points[0][1])
    assert(edge.physicalSeamArclengthM>chord+1e-5,
      `size ${sizes[i]} cubic sewline collapsed to straight chord`)
    const row=cut.sizes[i].panels.find(item=>item.panel_id===panelId)
    assert(row?.cut,`Missing actual Rust CUT for size ${sizes[i]}`)
    assert(row.cut.area_m2>0&&row.cut.perimeter_m>0)
    assert.equal(row.cut.notches.length,1)
    near(row.cut.notches[0].depth_m,.004,`size ${sizes[i]} physical CUT notch`)
    near(row.sewline_edge_lengths_m[edgeId],edge.physicalSeamArclengthM,
      `size ${sizes[i]} CUT/industrial sewline agreement`,2e-6)
    verified++
  }
  return verified
}

try{
  await rpc({op:'open',preset:'tshirt'})
  const original=new Set(snapshot.template.panels.map(panel=>panel.id))
  await rpc({op:'edit',command:{kind:'Polygon',fabric:snapshot.template.fabrics[0].id,
    points:[[.55,.1],[.95,.1],[.95,.4],[.55,.4]]}})
  const newPanel=snapshot.template.panels.find(panel=>!original.has(panel.id))
  assert(newPanel,'Rust failed to author the curved source panel')
  const panelId=newPanel.id,edgeId=newPanel.polygon.edges[0]
  for(const panel of [...snapshot.template.panels])for(const edge of panel.polygon.edges)
    await rpc({op:'edit',command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.012}})
  const source=await save()
  const sourcePoly=panelOf(source.template,panelId)
  // Rust Polygon normalizes a newly authored panel into local material space.
  // Derive cubic handles from the persisted endpoints, never board coordinates.
  const a=sourcePoly.points[0],b=sourcePoly.points[1]
  sourcePoly.curves={[edgeId]:[
    [a[0]+(b[0]-a[0])*.3,a[1]+(b[1]-a[1])*.3+.03],
    [a[0]+(b[0]-a[0])*.7,a[1]+(b[1]-a[1])*.7+.03]]}
  sourcePoly.notches={[edgeId]:[{t:.43,depth_m:.004}]}
  source.state=null
  source.mesh_signature=null
  await rpc({op:'open',project:source})
  const base=clone(snapshot.template)
  const gradeRun={schemaVersion:2,sizes,baseSize:'12',baseTemplate:clone(base),
    sizeCorrespondence:{},pomSpecs:[],gradedTemplates:sizes.map(size=>{
      const template=clone(base),poly=panelOf(template,panelId)
      const delta=(Number(size)-12)*.001
      poly.points[1][0]+=delta
      poly.curves[edgeId][0][0]+=delta/3
      poly.curves[edgeId][1][0]+=delta*2/3
      return template
    })}
  await rpc({op:'grade-run-commit',gradeRun})
  const committed=await save()
  assert.deepEqual(committed.grade_run.sizes,sizes)
  assert.equal(await inspect(panelId,edgeId,committed),24)
  const corrupted=clone(committed.grade_run)
  panelOf(corrupted.gradedTemplates[23],panelId).curves[edgeId][0][0]+=.08
  const corruptCurveError=await rejectAtomic({op:'grade-run-commit',gradeRun:corrupted})
  const forgedHole=clone(committed.grade_run)
  panelOf(forgedHole.gradedTemplates[23],panelId).holes=[{
    points:[[.65,.2],[.65,.25],[.7,.25],[.7,.2]],
    edges:['test-hole-a','test-hole-b','test-hole-c','test-hole-d']}]
  const forgedHoleError=await rejectAtomic({op:'grade-run-commit',gradeRun:forgedHole})
  const staleError=await rejectAtomic({op:'grade-run-commit',
    revision:snapshot.revision+1,gradeRun:committed.grade_run})
  await rpc({op:'undo'})
  assert.equal(Boolean((await save()).grade_run),false,
    'Undo did not remove the native grade catalog')
  await rpc({op:'redo'})
  assert.deepEqual(await save(),committed,'Redo changed the 24-size curved catalog')
  await rpc({op:'open',project:committed})
  assert.equal(await inspect(panelId,edgeId,await save()),24)
  console.log(JSON.stringify({passed:true,realCompiledRust:true,canonicalSizes:24,
    gradedCurvedSewlines:24,physicalCutNotches:24,cutlineSizesInspected:24,
    forgedCurveRejected:true,forgedHoleRejected:true,staleRevisionRejected:true,
    corruptCurveError,forgedHoleError,staleError,nativeUndoRedo:true,durableSaveReopen:true,
    licensedReceivingCad:false,cuttingAuthorized:false,factoryApproved:false}))
}finally{
  workspace.close()
  fs.rmSync(temp,{recursive:true,force:true})
}
