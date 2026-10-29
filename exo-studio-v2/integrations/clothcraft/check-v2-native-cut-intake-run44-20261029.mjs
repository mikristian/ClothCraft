// Real disposable native Rust CUT → all-size source-bound intake acceptance.
// No Cargo, no installed app, no user project, no machine release.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'
import {inspectNativeVerifiedProductionSourceRun37} from './native-verified-production-order-run37.mjs'
import {buildNativeVerifiedCutroomIntakeRun44 as build,
  inspectNativeVerifiedCutroomIntakeRun44 as inspect}
  from './native-verified-cutroom-intake-run44.mjs'

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-cut-intake-r44-'))
const native=createWorkspace(directory)
let revision
const rpc=async packet=>{
  const answer=await native.request({revision,...packet})
  assert.equal(answer.ok,true,JSON.stringify({operation:packet.op,error:answer.error}))
  if(Number.isSafeInteger(answer.data?.revision))revision=answer.data.revision
  return answer.data
}
try{
  const opened=await rpc({op:'open',preset:'tshirt'})
  for(const panel of opened.template.panels)
    for(const edge of panel.polygon.edges)
      await rpc({op:'edit',command:{
        kind:'SeamAllowance',panel:panel.id,edge,width_m:.012,
      }})
  const snap=await rpc({op:'snapshot'})
  const saved=(await rpc({op:'save'})).project
  const rules=createAccuMarkNativeRuleSet(snap)
  assert.equal(rules.ok,true,rules.reason)
  const catalog=prepareNativeGradeCatalog20261025(snap,saved,rules.ruleSet)
  assert.equal(catalog.ok,true,catalog.reason)
  await rpc({op:'grade-run-commit',gradeRun:catalog.gradeRun})
  const inspected=await inspectNativeVerifiedProductionSourceRun37(native)
  const input={
    expectedRevision:inspected.revision,
    quantitiesBySize:Object.fromEntries(inspected.sizes.map(size=>[
      size,Object.fromEntries(inspected.panels.map(p=>[p.id,1])),
    ])),
    materialsByPanel:Object.fromEntries(inspected.panels.map(p=>[
      p.id,{fabricId:p.sourceFabricId,groupId:'single-fabric'},
    ])),
  }
  const witness=await build(native,input)
  assert.equal(witness.ok,true)
  assert.equal(witness.manifest.sizes.length,6)
  assert.equal(witness.manifest.sizeCuts.length,6)
  assert.equal(witness.manifest.verifiedPhysicalCutInstances,12)
  assert.equal(witness.manifest.coordinateContract.metresToCentimetres,100)
  const validated=await inspect(native,input,{
    manifest:witness.manifest,manifestSha256:witness.manifestSha256,
  })
  assert.equal(validated.ok,true)
  assert.equal(validated.cuttingAuthorized,false)
  assert.equal(validated.factoryApproved,false)
  const forged=structuredClone(witness.manifest)
  forged.sizeCuts[0].panels[0].outlineCm[0].x+=1
  await assert.rejects(inspect(native,input,{
    manifest:forged,manifestSha256:witness.manifestSha256,
  }),/NATIVE_INTAKE_INVALID_PACKET/)
  console.log(JSON.stringify({passed:true,liveNativeRust:true,
    sourceRevision:inspected.revision,
    gradedSizes:witness.manifest.sizes.length,
    uniqueSourcePanels:inspected.panels.length,
    physicalCutInstances:witness.manifest.verifiedPhysicalCutInstances,
    nativeSourceMatched:true,normalizedCutCm:true,
    sourceDependencyBound:true,cuttingAuthorized:false,factoryApproved:false,
    externalCadVerified:false,physicalFactoryVerified:false}))
}finally{
  native.close()
  fs.rmSync(directory,{recursive:true,force:true,maxRetries:8,retryDelay:100})
}
