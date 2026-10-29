import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createHash} from 'node:crypto'
import {publishNativeVerifiedMarkerArtifactsRun42,readNativeVerifiedMarkerArtifactRun42,nativeVerifiedMarkerArtifactBasenameRun42} from './native-verified-marker-artifacts-run42.mjs'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'
import {inspectNativeVerifiedProductionSourceRun37} from './native-verified-production-order-run37.mjs'

test('distinct size and fabric identities cannot alias the same marker artifact',()=>{
  assert.equal(`${'A-B'}-${'C'}`,`${'A'}-${'B-C'}`) // Legacy encoding aliases.
  const first=nativeVerifiedMarkerArtifactBasenameRun42('A-B','C')
  const second=nativeVerifiedMarkerArtifactBasenameRun42('A','B-C')
  assert.notEqual(first,second)
  assert.equal(first,'3_A-B-C')
  assert.equal(second,'1_A-B-C')
  assert.throws(()=>nativeVerifiedMarkerArtifactBasenameRun42('A/B','C'),/INVALID_MARKER_ARTIFACT_IDENTITY/)
})

test('legacy artifact links remain manifest-bound and verified after naming update',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-legacy-marker-'))
  try{
    const bytes=Buffer.from('%PDF-1.4\nlegacy receipt')
    const hash=value=>createHash('sha256').update(value).digest('hex')
    const name='A-B-C.pdf'
    const manifest={schema:'exo-native-verified-marker-artifacts.v1',sourceRevision:1,
      sourceFingerprint:'a'.repeat(64),nativeCutlineFingerprint:'b'.repeat(64),
      orderQuantities:{'A-B':{front:1}},cuttingMaterialDeclarations:{front:{fabricId:'C',groupId:'main'}},
      artifacts:[{name,size:'A-B',fabricId:'C',format:'pdf',bytes:bytes.length,
        sha256:hash(bytes),placedPieces:1}],operatorApproved:false,factoryApproved:false,cuttingAuthorized:false}
    const manifestBytes=Buffer.from(JSON.stringify(manifest))
    const id=hash(manifestBytes)
    const folder=path.join(dir,'native-verified-marker-artifacts',id)
    fs.mkdirSync(folder,{recursive:true})
    fs.writeFileSync(path.join(folder,name),bytes)
    fs.writeFileSync(path.join(folder,'manifest.json'),manifestBytes)
    assert.deepEqual(readNativeVerifiedMarkerArtifactRun42(dir,id,name).bytes,bytes)
    assert.throws(()=>readNativeVerifiedMarkerArtifactRun42(dir,id,'A-B-C.svg'),/UNKNOWN_MARKER_ARTIFACT/)
    manifest.artifacts[0].size='A'
    const changed=Buffer.from(JSON.stringify(manifest))
    const changedId=hash(changed)
    const changedFolder=path.join(dir,'native-verified-marker-artifacts',changedId)
    fs.mkdirSync(changedFolder)
    fs.writeFileSync(path.join(changedFolder,'manifest.json'),changed)
    fs.writeFileSync(path.join(changedFolder,name),bytes)
    assert.throws(()=>readNativeVerifiedMarkerArtifactRun42(dir,changedId,name),/MARKER_ARTIFACT_NAME_IDENTITY_MISMATCH/)
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
})

test('native verified six-size marker manifests and PDF/SVG are immutable, exact, revision bound',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-marker-export-'))
  const workspace=createWorkspace(path.join(dir,'workspace'))
  let revision
  const request=async packet=>{
    const result=await workspace.request({revision,...packet})
    assert.equal(result.ok,true,`${packet.op}: ${result.error}`)
    if(Number.isSafeInteger(result.data?.revision))revision=result.data.revision
    return result.data
  }
  try{
    const opened=await request({op:'open',preset:'tshirt'})
    for(const panel of opened.template.panels)for(const edge of panel.polygon.edges)
      await request({op:'edit',command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:0.012}})
    const snapshot=await request({op:'snapshot'})
    const source=(await request({op:'save'})).project
    const rule=createAccuMarkNativeRuleSet(snapshot)
    assert.equal(rule.ok,true,rule.reason)
    const prepared=prepareNativeGradeCatalog20261025(snapshot,source,rule.ruleSet)
    assert.equal(prepared.ok,true,prepared.reason)
    await request({op:'grade-run-commit',gradeRun:prepared.gradeRun})
    const observed=await inspectNativeVerifiedProductionSourceRun37(workspace)
    const panels=observed.panels
    const input={expectedRevision:observed.revision,
      materialsByPanel:Object.fromEntries(panels.map(p=>[p.id,{fabricId:p.sourceFabricId,groupId:'main'}])),
      quantitiesBySize:Object.fromEntries(observed.sizes.map(size=>[
        size,Object.fromEntries(panels.map(p=>[p.id,2]))]))}
    const output=await publishNativeVerifiedMarkerArtifactsRun42(workspace,input,dir)
    assert.equal(output.manifest.factoryApproved,false)
    assert.equal(output.manifest.cuttingAuthorized,false)
    assert.equal(output.manifest.artifacts.length,observed.sizes.length*2)
    for(const artifact of output.manifest.artifacts){
      const content=readNativeVerifiedMarkerArtifactRun42(dir,output.id,artifact.name)
      assert.equal(content.bytes.length,artifact.bytes)
      assert(content.bytes.length>100)
      if(artifact.format==='pdf')assert(content.bytes.subarray(0,8).toString().startsWith('%PDF-1.4'))
      else assert(content.bytes.toString().includes('<svg'))
      assert.equal(artifact.placedPieces,panels.length*2)
    }
    assert.deepEqual((await publishNativeVerifiedMarkerArtifactsRun42(workspace,input,dir)).files,output.files)
    await assert.rejects(()=>publishNativeVerifiedMarkerArtifactsRun42(workspace,
      {...input,quantitiesBySize:{...input.quantitiesBySize,[observed.sizes[0]]:{}}},dir),
      /PRODUCTION_ORDER_SIZE_PANEL_MISMATCH|INVALID_PHYSICAL_CUT_QUANTITY/)
    const file=output.manifest.artifacts[0].name
    const location=path.join(dir,'native-verified-marker-artifacts',output.id,file)
    fs.chmodSync(path.dirname(location),0o700)
    fs.chmodSync(location,0o600)
    fs.appendFileSync(location,'tamper')
    assert.throws(()=>readNativeVerifiedMarkerArtifactRun42(dir,output.id,file),/MARKER_ARTIFACT_TAMPERED/)
    await assert.rejects(()=>publishNativeVerifiedMarkerArtifactsRun42(workspace,input,dir),
      /IMMUTABLE_ARTIFACT_COLLISION/)
    assert.throws(()=>readNativeVerifiedMarkerArtifactRun42(dir,output.id,'../../secret'),
      /INVALID_MARKER_ARTIFACT_REFERENCE/)
    await request({op:'grade-run-clear'})
    await assert.rejects(()=>publishNativeVerifiedMarkerArtifactsRun42(workspace,input,dir),
      /RESTORE_SAVED_NATIVE_GRADE_CATALOG_FIRST|STALE_NATIVE_PRODUCTION_REVISION/)
  }finally{
    workspace.close()
    // Native session shutdown can finish flushing its own disposable files
    // after close(). Preserve that directory if macOS still has writers.
    try{fs.rmSync(dir,{recursive:true,force:true,maxRetries:8,retryDelay:100})}
    catch(error){if(error.code!=='ENOTEMPTY')throw error}
  }
})
