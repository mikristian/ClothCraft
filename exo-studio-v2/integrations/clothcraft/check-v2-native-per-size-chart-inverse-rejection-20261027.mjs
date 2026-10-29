// Disposable real-Rust six-size chart authored through the SAME pure contract
// used by the browser UI; validates Rust store, formula regeneration and Undo.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {authorNativePerSizeChartEnvelope20261027} from '../../src/core/modarisNativePerSizeChartAuthor20261027.js'
import {verifyNativePerSizeChartStore20261027} from '../../src/core/modarisNativePerSizeChartStoreWitness20261027.js'

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'exo-ui-authored-size-formula-chart-'))
const workspace=createWorkspace(directory)
const sizes=['XS','S','M','L','XL','XXL']
const offsets={XS:-.015,S:-.007,M:0,L:.005,XL:.010,XXL:.014}
const clone=structuredClone
let state,stage='setup'
async function send(payload){
  const result=await workspace.request({revision:state?.revision,...payload})
  assert.equal(result.ok,true,stage+': '+payload.op+': '+result.error)
  if(result.data?.template)state=result.data
  return result.data
}
async function refuse(payload,pattern){
  const before=clone((await send({op:'save'})).project),revision=state.revision
  const result=await workspace.request({revision,...payload})
  assert.equal(result.ok,false,stage+': unsafe request accepted')
  assert.match(result.error,pattern)
  await send({op:'snapshot'})
  assert.equal(state.revision,revision)
  assert.deepEqual((await send({op:'save'})).project,before)
}
const width=(template,id)=>template.panels.find(p=>p.id===id).polygon.points[1][0]*1000
const close=(a,b)=>assert(Math.abs(a-b)<1e-6,String(a)+' != '+String(b))
function assertFormulaCellsNear(actual,expected){
  assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort())
  for(const name of Object.keys(expected)){
    assert.deepEqual(Object.keys(actual[name]).sort(),sizes.slice().sort())
    for(const size of sizes){
      assert.deepEqual(Object.keys(actual[name][size]).sort(),Object.keys(expected[name][size]).sort())
      for(const field of Object.keys(expected[name][size])){
        const a=actual[name][size][field],b=expected[name][size][field]
        assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8,
          `${name}/${size}/${field}: expected ${b}, received ${a}`)
      }
    }
  }
}
try{
  await send({op:'open',preset:'tshirt'})
  for(const seam of [...state.template.seams])
    await send({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const old=new Set(state.template.panels.map(p=>p.id))
  for(let i=0;i<2;i++)await send({op:'edit',command:{kind:'Polygon',
    fabric:state.template.fabrics[0].id,points:[[0,0],[.4,0],[.4,.32],[0,.32]]}})
  const ids=state.template.panels.filter(p=>!old.has(p.id)).map(p=>p.id)
  assert.equal(ids.length,2)
  const project=(await send({op:'save'})).project
  for(const panel of project.template.panels)if(panel.polygon)
    panel.polygon.seam_allowances=Object.fromEntries(panel.polygon.edges.map(e=>[e,.01]))
  project.state=null;project.mesh_signature=null
  await send({op:'open',project})
  await send({op:'bindings-store',nativeBindings:{
    measurements:{halfWidth:{valueMm:200},width:{formula:'halfWidth * halfWidth / 100'}},
    bindings:ids.map((panelId,i)=>({id:'formula_panel_'+i,panelId,pointIndex:1,
      mode:'polar',a:0,b:0,angleDeg:0,distanceFormula:'width',dependsOn:[]})),
  }})
  const base=clone(state.template)
  await send({op:'grade-run-commit',gradeRun:{schemaVersion:1,sizes,baseSize:'M',
    baseTemplate:clone(base),gradedTemplates:sizes.map(size=>{
      const template=clone(base)
      for(const id of ids)template.panels.find(p=>p.id===id).polygon.points[1][0]+=offsets[size]
      return template
    }),pomSpecs:[{id:'width_pom',label:'Physical width',panelId:ids[0],
      kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:50,
      targetsMm:Object.fromEntries(sizes.map(s=>[s,null]))}],
  }})
  const saved=(await send({op:'save'})).project
  const values={halfWidth:{},width:{}},physical={},limits={halfWidth:{},width:{}}
  for(const size of sizes){
    const w=400+offsets[size]*1000,half=Math.sqrt(w*100)
    values.halfWidth[size]={directInputMm:half,valueMm:half}
    values.width[size]={valueMm:w}
    physical[size]={minMm:w-1,maxMm:w+16}
    limits.halfWidth[size]={minMm:half-2,maxMm:half+11}
    limits.width[size]={minMm:w-4,maxMm:w+22}
  }
  const directCells={halfWidth:Object.fromEntries(sizes.map(size=>[size,values.halfWidth[size].directInputMm]))}
  const authored=authorNativePerSizeChartEnvelope20261027({project:saved,sourceRevision:state.revision,
    fabricId:state.template.fabrics[0].id,
    provenance:'Explicit six-size computed QA limits',
    chartProvenance:'Explicit operator direct cells; saved native formulas',
    directCells,bounds:limits,physicalPomBounds:{width_pom:physical},
  })
  assert.equal(authored.ok,true,`UI-authoring preflight: ${authored.reason}`)
  const envelope=authored.envelope
  // Rust/JS formula evaluation may differ by the last floating-point bit;
  // retain exact cell inventory and independently check each physical value.
  assertFormulaCellsNear(envelope.perSizeChart.values,values)
  assert.deepEqual(envelope.perSizeChart.sourceMeasurements,saved.native_point_bindings.measurements)
  assert.deepEqual(envelope.sourceTemplate,saved.template)
  const tampered=clone(saved)
  tampered.native_point_bindings.measurements.halfWidth.valueMm=199
  assert.equal(authorNativePerSizeChartEnvelope20261027({project:tampered,sourceRevision:state.revision,
    fabricId:state.template.fabrics[0].id,provenance:'Explicit six-size computed QA limits',
    chartProvenance:'Explicit operator direct cells; saved native formulas',
    directCells,bounds:limits,physicalPomBounds:{width_pom:physical},
  }).ok,false,'Forged stale graph accepted by UI chart author')
  stage='store and reject forged native chart'
  const storeRevision=state.revision
  await send({op:'fabric-grade-envelope-store',envelope})
  const inspected=await send({op:'fabric-grade-envelope-inspect'})
  assert.equal(inspected.nativeAuthoritative,true,'Rust did not authoritatively inspect the chart')
  assert.equal(inspected.sourceRevision,state.revision)
  assert.deepEqual(inspected.envelope,envelope,'Rust reinspection differs from the authored native chart')
  const before=(await send({op:'save'})).project
  const storeWitness=verifyNativePerSizeChartStore20261027({
    beforeProject:saved,afterProject:before,authoredEnvelope:envelope,inspected,
    beforeRevision:storeRevision,afterRevision:state.revision,
  })
  assert.equal(storeWitness.ok,true,`Independent chart-only Rust save/inspect witness: ${storeWitness.reason}`)
  assert.equal(storeWitness.changedGarmentGeometry,false)
  assertFormulaCellsNear(before.fabric_grade_envelope.perSizeChart.values,values)
  await refuse({op:'fabric-grade-envelope-store',envelope:{...envelope,
    perSizeChart:{...envelope.perSizeChart,values:{...values,
      width:{...values.width,XL:{valueMm:999}}}}}},/size|formula|chart|stale|bound/i)
  stage='actual native computed formula inverse Anchor rejection'
  const revision=state.revision
  const anchor=state.template.panels.find(panel=>panel.id===ids[0]).polygon.points[1]
  const request={op:'edit',command:{kind:'Anchor',panel:ids[0],anchor:1,
    position:[anchor[0]+0.005,anchor[1]]}}
  const refused=await workspace.request({revision,...request})
  assert.equal(refused.ok,false,'Rust incorrectly accepted computed formula Anchor inverse')
  assert.match(refused.error,/Affine inverse requires|Scaled inverse requires a numeric multiplier|Only a direct measurement times a constant is invertible|Computed measurement cannot be inferred from bound target drag|Inverse native edit requires independent polar rule|Ambiguous multiple measurement dependencies/i)
  await send({op:'snapshot'})
  assert.equal(state.revision,revision)
  assert.deepEqual((await send({op:'save'})).project,before)
  console.log(JSON.stringify({passed:true,native:true,realRustInverseAttempt:true,
    rejected:true,reason:refused.error,sizeCount:6,formula:'halfWidth * halfWidth / 100',
    physicalPomPreserved:true,revisionUnchanged:true,
    unsupportedNonlinearFormulaRejected:true,vendorCertified:false}))
}catch(error){
  console.error(JSON.stringify({passed:false,stage,error:error.message,stack:error.stack}))
  process.exitCode=1
}finally{
  workspace.close()
  fs.rmSync(directory,{recursive:true,force:true})
}
