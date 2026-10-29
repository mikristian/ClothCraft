// RUN43 preliminary numerical oracle for the actual compiled Rust 24-size
// persisted catalog. Still NOT independent licensed CAD or factory evidence.
// Fixed reference deltas are separately authored; source templates are never
// loaded from, or written to, the personal garment.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createWorkspace} from './workspace.mjs'
import {planNativeGradeSizeCorrespondence20261028 as plan,
  verifyNativeGradeSizeCorrespondence20261028 as verify}
  from '../../src/core/nativeGradeSizeCorrespondence20261028.js'

const sizes=Array.from({length:24},(_,i)=>String(i+1))
const physicalGoldenDeltaMm=[
  -11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,
   1,2,3,4,5,6,7,8,9,10,11,12,
]
const aliasExpected={Petite:'1',M:'12',Tall:'19',Custom7XL:'24'}
const toleranceMm=.01
export function inspectNative24GoldenRun43(project,panelId,{expected=sizes,aliases=aliasExpected}={}){
  const errors=[],grade=project?.grade_run
  if(grade?.schemaVersion!==2||!Array.isArray(grade?.gradedTemplates)||
    grade.gradedTemplates.length!==24||!Array.isArray(grade.sizes)||
    grade.sizes.length!==24||grade.sizes.some((s,i)=>s!==expected[i])||
    grade.baseSize!=='12')errors.push('Incomplete/reordered Rust canonical 24-size catalog')
  const persistedAliases=grade?.sizeCorrespondence
  if(!persistedAliases||Object.keys(persistedAliases).length!==4||
    Object.keys(aliases).some(key=>persistedAliases[key]!==aliases[key]))
    errors.push('Missing, redirected or extra external size correspondence aliases')
  const source=project?.template?.panels?.find(item=>item.id===panelId)?.polygon
  if(!source?.points||source.points.length!==4)
    errors.push('Missing expected independently identifiable rectangle source')
  // This fixture grades the added rectangle only; every other authored panel
  // must survive all 24 canonical sizes unchanged. Checking just the rectangle
  // would miss a damaged second panel during an otherwise valid alias commit.
  const otherPanels=(project?.template?.panels||[]).filter(panel=>panel.id!==panelId)
  if(otherPanels.length===0)errors.push('No independent companion panels to preserve')
  for(let index=0;index<24;index++){
    const gradedPanels=grade?.gradedTemplates?.[index]?.panels
    if(!Array.isArray(gradedPanels)||gradedPanels.length!==otherPanels.length+1){
      errors.push('Incomplete panel catalog '+sizes[index]);continue
    }
    for(const panel of otherPanels){
      const graded=gradedPanels.find(item=>item.id===panel.id)
      if(!graded||JSON.stringify(graded)!==JSON.stringify(panel))
        errors.push('Companion panel geometry mismatch '+sizes[index]+'/'+panel.id)
    }
  }
  let checked=0
  if(source?.points?.length===4&&grade?.gradedTemplates?.length===24)
    for(let index=0;index<24;index++){
      const size=sizes[index]
      const graded=grade.gradedTemplates[index]?.panels?.find(item=>item.id===panelId)?.polygon
      if(!graded||graded.points?.length!==4){errors.push('Missing graded polygon '+size);continue}
      const delta=physicalGoldenDeltaMm[index]
      for(let point=0;point<4;point++){
        const expectedDx=point===1||point===2?delta:0
        const xMm=(graded.points[point][0]-source.points[point][0])*1000
        const yMm=(graded.points[point][1]-source.points[point][1])*1000
        if(!Number.isFinite(xMm)||!Number.isFinite(yMm)||
          Math.abs(xMm-expectedDx)>toleranceMm||
          Math.abs(yMm)>toleranceMm)
          errors.push('Independent point delta mismatch '+size+'/'+point)
        checked++
      }
      const widthBase=Math.max(...source.points.map(p=>p[0]))-
        Math.min(...source.points.map(p=>p[0]))
      const width=Math.max(...graded.points.map(p=>p[0]))-
        Math.min(...graded.points.map(p=>p[0]))
      if(!Number.isFinite(width)||Math.abs((width-widthBase)*1000-delta)>toleranceMm)
        errors.push('Physical POM width growth mismatch '+size)
    }
  return {pass:errors.length===0,errors,pointsChecked:checked,
    canonicalSizes:sizes.length,aliasesChecked:Object.keys(aliasExpected).length,
    numericToleranceMm:toleranceMm,
    numericShapeVerified:errors.length===0,realRustPersistedCatalog:false,
    independentExternalGradeReference:false,
    g27Passed:false,receivingCadApproved:false,factoryApproved:false}
}

let dir,ws
let snapshot
const rpc=async data=>{
  const response=await ws.request({revision:snapshot?.revision,...data})
  assert.equal(response.ok,true,data.op+': '+(response.error||'rejected'))
  if(response.data?.template)snapshot=response.data
  return response.data
}
const save=async()=>(await rpc({op:'save'})).project
async function main(){
  dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-g27-run43-rust-golden-'))
  ws=createWorkspace(dir)
  await rpc({op:'open',preset:'tshirt'})
  const previous=new Set(snapshot.template.panels.map(p=>p.id))
  await rpc({op:'edit',command:{kind:'Polygon',fabric:snapshot.template.fabrics[0].id,
    points:[[.55,.1],[.95,.1],[.95,.4],[.55,.4]]}})
  const added=snapshot.template.panels.find(p=>!previous.has(p.id))
  assert(added?.polygon?.points?.length===4,'New native Rust rectangle absent')
  const source=structuredClone(snapshot.template)
  const gradeRun={schemaVersion:2,sizes,baseSize:'12',
    baseTemplate:structuredClone(source),sizeCorrespondence:{},pomSpecs:[],
    gradedTemplates:sizes.map((size,i)=>{
      const template=structuredClone(source)
      const panel=template.panels.find(p=>p.id===added.id)
      const delta=(Number(size)-12)/1000
      panel.polygon.points[1][0]+=delta
      panel.polygon.points[2][0]+=delta
      return template
    })}
  await rpc({op:'grade-run-commit',gradeRun})
  const before=structuredClone(snapshot)
  const status=await rpc({op:'grade-run-status'})
  const aliasPlan=plan(before,status,aliasExpected)
  assert.equal(aliasPlan.ok,true,aliasPlan.reason)
  await rpc(aliasPlan.request)
  const persisted=await save()
  const currentStatus=await rpc({op:'grade-run-status'})
  const witness=verify(before,aliasPlan,currentStatus,persisted)
  assert.equal(witness.ok,true,witness.reason)
  const proof=inspectNative24GoldenRun43(persisted,added.id)
  assert.equal(proof.pass,true,proof.errors.join('; '))
  for(const [name,size] of Object.entries(aliasExpected)){
    const activated=await rpc({op:'grade-run-activate',size:name})
    assert.equal(activated.activeGradedSize,name)
    assert.deepEqual(activated.template,
      persisted.grade_run.gradedTemplates[sizes.indexOf(size)])
    await rpc({op:'grade-run-restore'})
  }
  const corrupted=structuredClone(persisted)
  const currentPanel=corrupted.grade_run.gradedTemplates[23].panels.find(p=>p.id===added.id)
  currentPanel.polygon.points[1][0]+=.001
  assert.equal(inspectNative24GoldenRun43(corrupted,added.id).pass,false)
  const corruptedCompanion=structuredClone(persisted)
  const companion=corruptedCompanion.grade_run.gradedTemplates[7].panels.find(p=>p.id!==added.id)
  assert(companion?.polygon?.points?.length,'No companion panel in G27 negative fixture')
  companion.polygon.points[0][0]+=.001
  assert.equal(inspectNative24GoldenRun43(corruptedCompanion,added.id).pass,false,
    'G27 numerical witness missed unrelated canonical panel geometry damage')
  const altered=structuredClone(persisted.grade_run)
  altered.sizeCorrespondence.Custom7XL='23'
  const refused=await ws.request({op:'grade-run-commit',revision:snapshot.revision,gradeRun:altered})
  assert.equal(refused.ok,false,'Native Rust accepted alias redirection')
  const removed=structuredClone(persisted.grade_run)
  delete removed.sizeCorrespondence.Petite
  const deleteResponse=await ws.request({op:'grade-run-commit',revision:snapshot.revision,gradeRun:removed})
  assert.equal(deleteResponse.ok,false,'Native Rust accepted alias deletion')
  // RUN45: Alias labels can remain unchanged while a whole graded template is
  // swapped or its manufacturing metrology is mutated. A correspondence-only
  // transaction must never silently replace the canonical geometry underneath
  // an already exported external size identity.
  const swapped=structuredClone(persisted.grade_run)
  ;[swapped.gradedTemplates[0],swapped.gradedTemplates[23]]=
    [swapped.gradedTemplates[23],swapped.gradedTemplates[0]]
  const swappedResponse=await ws.request({op:'grade-run-commit',revision:snapshot.revision,gradeRun:swapped})
  assert.equal(swappedResponse.ok,false,'Native Rust silently swapped existing alias canonical grade geometry')
  const shifted=structuredClone(persisted.grade_run)
  const shiftedPanel=shifted.gradedTemplates[23].panels.find(p=>p.id===added.id)
  shiftedPanel.polygon.points[1][0]+=.002
  shiftedPanel.polygon.points[2][0]+=.002
  shifted.sizeCorrespondence.NewSize='22'
  const shiftedResponse=await ws.request({op:'grade-run-commit',revision:snapshot.revision,gradeRun:shifted})
  assert.equal(shiftedResponse.ok,false,'Native Rust accepted geometry mutation disguised as new size alias')
  assert.deepEqual(await save(),persisted)
  // RUN45 positive control: a genuine alias-only extension is still allowed
  // and its canonical geometry remains byte-for-byte unchanged.
  const extended=structuredClone(persisted.grade_run)
  extended.sizeCorrespondence.NewGuest='21'
  await rpc({op:'grade-run-commit',gradeRun:extended})
  const afterExtension=await save()
  assert.equal(afterExtension.grade_run.sizeCorrespondence.NewGuest,'21')
  assert.deepEqual(afterExtension.grade_run.gradedTemplates,persisted.grade_run.gradedTemplates)
  await rpc({op:'undo'})
  assert.deepEqual(await save(),persisted)
  await rpc({op:'undo'})
  assert.deepEqual((await save()).grade_run.sizeCorrespondence??{}, {})
  await rpc({op:'redo'})
  assert.deepEqual(await save(),persisted)
  await rpc({op:'open',project:persisted})
  assert.equal(inspectNative24GoldenRun43(await save(),added.id).pass,true)
  console.log(JSON.stringify({schema:'exo.g27-native-24-golden-run43.v1',
    passed:true,...proof,realCompiledRust:true,realRustPersistedCatalog:true,
    aliasActivations:4,
    nativeAliasRedirectionRejected:true,nativeAliasDeletionRejected:true,
    nativeAliasGeometrySwapRejected:true,nativeAliasGeometryShiftRejected:true,
    nativeAliasOnlyExtensionAllowed:true,undoRedo:true,
    durableSaveReopen:true,manufacturingApproved:false}))
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{await main()}finally{
    if(ws)ws.close()
    if(dir)fs.rmSync(dir,{recursive:true,force:true})
  }
}
