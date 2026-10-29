// Disposable real Rust proof: XS-XXL industrial notch stations and physical
// allowance normals are measured from saved native material polygons.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-industrial-sizes-'))
const workspace=createWorkspace(temp)
const sizes=['XS','S','M','L','XL','XXL']
let source
const send=async command=>{
  const answer=await workspace.request({revision:source?.revision,...command})
  assert.equal(answer.ok,true,`${command.op}: ${answer.error}`)
  if(answer.data?.template)source=answer.data
  return answer.data
}
const fail=async command=>{
  const before=structuredClone(source)
  const response=await workspace.request({revision:source.revision,...command})
  assert.equal(response.ok,false,`Unsafe ${command.op} unexpectedly succeeded`)
  await send({op:'snapshot'})
  assert.equal(source.revision,before.revision)
  assert.deepEqual(source.template,before.template)
}
try{
  await send({op:'open',preset:'tshirt'})
  for(const seam of [...source.template.seams])await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const previous=new Set(source.template.panels.map(p=>p.id))
  await send({op:'edit',command:{kind:'Polygon',fabric:source.template.fabrics[0].id,
    points:[[0,0],[.4,0],[.4,.3],[0,.3]]}})
  const panel=source.template.panels.find(p=>!previous.has(p.id))
  assert(panel)
  const edge=panel.polygon.edges[0]
  await send({op:'edit',command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.012}})
  await send({op:'edit',command:{kind:'Notch',panel:panel.id,edge,t:.25,depth_m:.004}})
  const base=structuredClone(source.template)
  const run={schemaVersion:1,sizes,baseSize:'M',baseTemplate:base,
    gradedTemplates:sizes.map((size,i)=>{
      const template=structuredClone(base)
      const poly=template.panels.find(p=>p.id===panel.id).polygon
      if(i!==2)poly.points[1][0]+=(i-2)*.005
      return template
    }),pomSpecs:[]}
  await send({op:'grade-run-commit',gradeRun:run})
  assert.equal(source.gradeRunPersisted,true)
  const before=structuredClone(source)
  await fail({op:'grade-run-industrial-audit',panel:'invalid-panel'})
  const result=await send({op:'grade-run-industrial-audit',panel:panel.id})
  assert.equal(result.format,'exo-native-linked-industrial-six-size-proof.v1')
  assert.equal(result.sourceRevision,before.revision)
  assert.equal(result.sourcePanelId,panel.id)
  assert.equal(result.factoryApproved,false)
  assert.equal(result.manufacturerApproved,false)
  assert.equal(result.pairedSewingVerified,false)
  assert.deepEqual(result.sizes.map(row=>row.size),sizes)
  for(const row of result.sizes){
    const measured=row.edges.find(item=>item.edgeId===edge)
    assert(measured)
    assert.equal(measured.notches.length,1)
    assert(Math.abs(measured.notches[0].fraction-.25)<1e-9)
    assert(Math.abs(measured.notches[0].seamArclengthM-measured.physicalSeamArclengthM*.25)<1e-8)
    assert(Math.abs(measured.allowanceM-.012)<1e-9)
    assert(measured.minAllowanceNormalAlignment>.999999)
  }
  assert.equal(source.revision,before.revision)
  assert.deepEqual(source.template,before.template)
  const saved=await send({op:'save'})
  await send({op:'open',project:saved.project})
  const restored=await send({op:'grade-run-industrial-audit',panel:panel.id})
  assert.deepEqual(restored.sizes,result.sizes)
  console.log(JSON.stringify({passed:true,native:true,sourcePanel:panel.id,
    gradedSizes:sizes,measuredNotchStations:6,measuredAllowanceEdges:6,
    saveReopenVerified:true,factoryApproved:false,vendorEquivalent:false}))
}finally{
  workspace.close()
  fs.rmSync(temp,{recursive:true,force:true})
}
