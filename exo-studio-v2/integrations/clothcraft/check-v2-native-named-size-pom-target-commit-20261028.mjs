// Real compiled Rust CAS: after F7 appends a canonical size, edit ONLY saved
// named-size POM targets in a second independent Rust history revision.
// Never factory/vendor acceptance.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025,recoverNativeGradeRules20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'
import {applyModarisF7SizeEvolution20261028} from '../../src/core/modarisF7SizeEvolution20261028.js'
import {commitNativeGradeCanonicalSizeTransaction20261028} from '../../src/core/nativeGradeCanonicalSizeTransaction20261028.js'
import {commitNativeGradeNamedSizePom20261028} from '../../src/core/nativeGradeNamedSizePomCommit20261028.js'
import {verifyNativeGradePomAuditWitness20261028} from '../../src/core/nativeGradePomAuditWitness20261028.js'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-named-pom-native-'))
const workspace=createWorkspace(root)
let current
const rpc=async packet=>{
 const result=await workspace.request({revision:current?.revision,...packet})
 assert.equal(result.ok,true,`${packet.op}: ${result.error||'native request rejected'}`)
 if(result.data?.template)current=result.data
 return result.data
}
const save=async()=>(await rpc({op:'save'})).project
const assertPom=async(sizes,targets,pathTargets)=>{
 const audit=await rpc({op:'grade-run-pom-audit'})
 assert.equal(audit.format,'exo-native-named-grade-pom-audit.v2')
 assert.equal(audit.sizeCount,sizes.length)
 assert.equal(audit.total,sizes.length*2)
 assert.equal(audit.passed,sizes.length*2)
 assert.equal(audit.factoryApproved,false)
 const project=await save()
 assert.deepEqual(project.grade_run.sizes,sizes)
 assert.deepEqual(project.grade_run.pomSpecs[0].targetsMm,targets)
 assert.deepEqual(project.grade_run.pomSpecs[1].targetsMm,pathTargets)
 const status=await rpc({op:'grade-run-status'})
 const recovered=recoverNativeGradeRules20261025(current,status)
 assert(recovered.ok,recovered.reason)
 const witness=verifyNativeGradePomAuditWitness20261028({
  snapshot:current,ruleSet:recovered.ruleSet,status,audit,
  definitions:project.grade_run.pomSpecs,
 })
 assert(witness.ok,witness.reason)
 assert.equal(witness.nativeNumericalAccepted,true)
 assert.equal(witness.nativeRowsVerified,sizes.length*2)
 assert.equal(witness.factoryApproved,false)
 return audit
}
try{
 await rpc({op:'open',preset:'tshirt'})
 const original=new Set(current.template.panels.map(p=>p.id))
 await rpc({op:'edit',command:{kind:'Polygon',fabric:current.template.fabrics[0].id,
  points:[[.55,.1],[.83,.1],[.83,.34],[.55,.34]]}})
 const third=current.template.panels.find(p=>!original.has(p.id))
 assert(third,'Third independently graded physical POM panel missing')
 const source=await save()
 const oldSizes=['2','4','6','8'],oldDx=[-3,-1,0,4]
 let authored=createAccuMarkNativeRuleSet(current,{sizes:oldSizes,baseSize:'6'})
 assert(authored.ok,authored.reason)
 for(let i=0;i<oldSizes.length;i++)if(oldSizes[i]!=='6')for(const pointIndex of [1,2]){
  const edited=editAccuMarkNativePointRule(current,authored.ruleSet,
   {panelId:third.id,pointIndex,size:oldSizes[i],dxMm:oldDx[i],dyMm:0})
  assert(edited.ok,edited.reason);authored=edited
 }
 const targets=Object.fromEntries(oldSizes.map((size,i)=>[size,280+oldDx[i]]))
 const pathTargets=Object.fromEntries(oldSizes.map((size,i)=>[size,520+oldDx[i]]))
 const definition={id:'third-width',label:'Third panel physical width',panelId:third.id,
  kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:.5,targetsMm:targets}
 const pathDefinition={id:'third-sewn-path',label:'Third panel clockwise sewn boundary',
  panelId:third.id,kind:'sewline-path',fromPoint:3,toPoint:1,toleranceMm:.5,
  targetsMm:pathTargets}
 const prepared=prepareNativeGradeCatalog20261025(current,source,authored.ruleSet,
  {pomDefinitions:[definition,pathDefinition]})
 assert(prepared.ok,prepared.reason)
 await rpc({op:'grade-run-commit',gradeRun:prepared.gradeRun})
 await assertPom(oldSizes,targets,pathTargets)
 const status=await rpc({op:'grade-run-status'})
 const recovered=recoverNativeGradeRules20261025(current,status)
 assert(recovered.ok,recovered.reason)
 const evolved=applyModarisF7SizeEvolution20261028(current,recovered.ruleSet,
  {action:'add-size-to-product',name:'10'})
 assert(evolved.ok,evolved.reason)
 let rules=evolved.ruleSet
 for(const pointIndex of [1,2]){
  const edited=editAccuMarkNativePointRule(current,rules,
   {panelId:third.id,pointIndex,size:'10',dxMm:8,dyMm:0})
  assert(edited.ok,edited.reason);rules=edited.ruleSet
 }
 const expectedRevision=current.revision
 const nextTargets={...targets,'10':288}
 const nextPathTargets={...pathTargets,'10':528}
 const nextPathDefinition={...pathDefinition,targetsMm:nextPathTargets}
 const invalid=await commitNativeGradeCanonicalSizeTransaction20261028({
  snapshot:current,expectedRevision,ruleSet:rules,request:rpc,
  pomDefinitions:[{...definition,targetsMm:{...targets,'10':null}},nextPathDefinition],
 })
 assert.equal(invalid.ok,false,'Unset new physical POM target must fail closed')
 assert.equal(invalid.needsNativeRecovery,false)
 assert.equal(current.revision,expectedRevision)
 const altered=await commitNativeGradeCanonicalSizeTransaction20261028({
  snapshot:current,expectedRevision,ruleSet:rules,request:rpc,
  pomDefinitions:[{...definition,targetsMm:{...nextTargets,'8':285}},nextPathDefinition],
 })
 assert.equal(altered.ok,false,'Changing an old-size POM target must fail closed')
 assert.equal(current.revision,expectedRevision)
 const committed=await commitNativeGradeCanonicalSizeTransaction20261028({
  snapshot:current,expectedRevision,ruleSet:rules,request:rpc,
  pomDefinitions:[{...definition,targetsMm:nextTargets},nextPathDefinition],
 })
 assert(committed.ok,committed.reason)
 assert.equal(committed.revision,expectedRevision+1)
 await assertPom([...oldSizes,'10'],nextTargets,nextPathTargets)
 const pomRevision=current.revision
 const persistedStatus=await rpc({op:'grade-run-status'})
 const persistedRules=recoverNativeGradeRules20261025(current,persistedStatus)
 assert(persistedRules.ok,persistedRules.reason)
 const targetEdited={...nextTargets,'10':288.25}
 const pathEdited={...nextPathTargets,'10':527.75}
 const pomArgs={snapshot:current,expectedRevision:pomRevision,
  ruleSet:persistedRules.ruleSet,request:rpc}
 const missing=await commitNativeGradeNamedSizePom20261028({...pomArgs,
  definitions:[{...definition,targetsMm:{...targetEdited,'10':null}},
   {...pathDefinition,targetsMm:pathEdited}],
 })
 assert.equal(missing.ok,false,'Missing canonical POM target must reject before Rust dispatch')
 assert.equal(missing.needsNativeRecovery,false)
 assert.equal(current.revision,pomRevision)
 const stationTamper=await commitNativeGradeNamedSizePom20261028({...pomArgs,
  definitions:[{...definition,toleranceMm:5,targetsMm:targetEdited},
   {...pathDefinition,targetsMm:pathEdited}],
 })
 assert.equal(stationTamper.ok,false,'Station tolerance changes require separate authoring')
 assert.equal(current.revision,pomRevision)
 const pomCommit=await commitNativeGradeNamedSizePom20261028({...pomArgs,
  definitions:[{...definition,targetsMm:targetEdited},
   {...pathDefinition,targetsMm:pathEdited}],
 })
 assert(pomCommit.ok,pomCommit.reason)
 assert.equal(pomCommit.nativeCommitted,true)
 assert.equal(pomCommit.revision,pomRevision+1)
 assert.equal(pomCommit.nativeNumericalAccepted,true)
 assert.equal(pomCommit.witness.nativeRowsVerified,10)
 assert.equal(pomCommit.factoryApproved,false)
 await assertPom([...oldSizes,'10'],targetEdited,pathEdited)
 const stale=await commitNativeGradeNamedSizePom20261028({...pomArgs,
  definitions:[{...definition,targetsMm:targetEdited},
   {...pathDefinition,targetsMm:pathEdited}],
 })
 assert.equal(stale.ok,false,'Stale native POM source must fail closed')
 assert.equal(stale.needsNativeRecovery,false)
 assert.equal(current.revision,pomRevision+1)
 const durable=await save()
 await rpc({op:'undo'})
 await assertPom([...oldSizes,'10'],nextTargets,nextPathTargets)
 await rpc({op:'redo'})
 await assertPom([...oldSizes,'10'],targetEdited,pathEdited)
 await rpc({op:'open',project:durable})
 await assertPom([...oldSizes,'10'],targetEdited,pathEdited)
 console.log(JSON.stringify({passed:true,realRust:true,sourcePanels:3,
  oldSizes:4,canonicalSizes:5,physicalPomRows:10,wrappedSewnPath:true,
  explicitTargetMm:288.25,invalidTargetRejected:true,oldTargetTamperRejected:true,
  targetOnlyPomRevision:true,stationTamperRejected:true,staleRevisionRejected:true,
  nativeRevisionCAS:true,undoRedoReopen:true,
  licensedCadAccepted:false,physicalSamplesSigned:false,factoryApproved:false}))
}finally{
 workspace.close()
 fs.rmSync(root,{recursive:true,force:true})
}
