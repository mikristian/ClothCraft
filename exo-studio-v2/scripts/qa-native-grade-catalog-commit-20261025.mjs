/** Isolated native Rust six-size catalog write/read regression.
 * Never opens or alters the user's installed EXO session/project directory.
 */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,readFileSync,readdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createAccuMarkNativeRuleSet} from '../src/core/accumarkNativePointRuleSet20261023.js'
import {createNativeGradingPOM20261025,inspectNativeGradingPOM20261025} from '../src/core/nativeGradingPOM20261025.js'
import {prepareNativeGradeCatalog20261025,verifyNativeGradeCatalog20261025,recoverNativeGradeRules20261025} from '../src/core/nativeGradeCatalogBridge20261025.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-grade-commit-'))
const port=5457,url='http://127.0.0.1:'+port
const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
  cwd:root,detached:true,stdio:'ignore',env:{...process.env,
    EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
    EXO_CLOTHCRAFT_GPU:'0',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
  },
})
const send=async body=>{
  const response=await fetch(url+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)})
  return response.json()
}
const success=async body=>{
  const response=await send(body)
  assert.equal(response.ok,true,response.error||JSON.stringify(response).slice(0,500))
  return response.data
}
try{
  let ready=false
  for(let i=0;i<100;i++){
    try{if((await fetch(url+'/health',{signal:AbortSignal.timeout(600)})).ok){ready=true;break}}catch{}
    await new Promise(done=>setTimeout(done,250))
  }
  assert(ready,'Isolated grading test Rust service not started')
  const opened=await success({op:'open',preset:'tshirt'})
  const saved=await success({op:'save'})
  const generated=createAccuMarkNativeRuleSet(opened)
  assert.equal(generated.ok,true,generated.reason)
  const rules=generated.ruleSet
  const measured=createNativeGradingPOM20261025(opened,rules,{panelId:opened.template.panels[0].id,
    fromPoint:0,toPoint:1,label:'Selected drafting width'})
  assert.equal(measured.ok,true,measured.reason)
  const pom=measured.definition
  const readings=inspectNativeGradingPOM20261025(opened,rules,[pom])
  assert.equal(readings.rows.length,6)
  pom.targetsMm=Object.fromEntries(readings.rows.map(row=>[row.size,Math.round(row.actualMm*100)/100]))
  const prepared=prepareNativeGradeCatalog20261025(opened,saved.project,rules,{pomDefinitions:[pom]})
  assert.equal(prepared.ok,true,prepared.reason)
  assert.equal(prepared.gradeRun.gradedTemplates.length,6)
  const committed=await success({op:'grade-run-commit',
    revision:opened.revision,gradeRun:prepared.gradeRun})
  assert.equal(committed.revision,opened.revision+1)
  assert.equal(committed.gradeCatalogResult.persisted,true)
  const status=await success({op:'grade-run-status',revision:committed.revision})
  assert.equal(status.persistedInProject,true)
  assert.equal(status.catalog.gradedTemplates.length,6)
  assert.equal(status.catalog.pomSpecs?.length,1)
  assert.equal(status.catalog.pomSpecs[0].fromPoint,0)
  const verified=verifyNativeGradeCatalog20261025(committed,rules,status,
    {durablySaved:true,pomDefinitions:[pom]})
  assert.equal(verified.ok,true,verified.reason)
  const persisted=JSON.parse(readFileSync(path.join(output,'workspace','fitting-project.json'),'utf8'))
  assert.equal(persisted.grade_run.gradedTemplates.length,6)
  assert.equal(persisted.grade_run.pomSpecs.length,1)
  assert.equal(persisted.grade_run.baseSize,'M')
  const backups=path.join(output,'workspace','backups')
  const beforeCommit=readdirSync(backups).filter(name=>name.startsWith('before-native-grade-catalog-'))
  assert.equal(beforeCommit.length,1,'Old-serde-compatible garment was not backed up before catalog schema migration')
  const previous=JSON.parse(readFileSync(path.join(backups,beforeCommit[0],'fitting-project.json'),'utf8'))
  assert.equal(previous.grade_run,undefined,'Recovery backup must predate graded catalog field')
  const nativeHistoryBackup=path.join(backups,beforeCommit[0],
    'fitting-project.json.native.undo-v1.json')
  assert.equal(existsSync(nativeHistoryBackup),true,
    'Grade migration recovery archive omitted native durable Undo/Redo history')
  const archivedJournal=JSON.parse(readFileSync(nativeHistoryBackup,'utf8'))
  assert.equal(archivedJournal.schema_version,1,
    'Recovery archive does not contain native cross-restart history v1')
  // The present Rust v1 journal carries full canonical source JSON as its
  // digest, NOT a SHA-256. Validate provenance without printing the user's
  // potentially massive pattern/state JSON into an assertion traceback.
  assert.equal(typeof archivedJournal.project_digest,'string')
  assert(archivedJournal.project_digest.length>64)
  const canonicalJournalSource=JSON.parse(archivedJournal.project_digest)
  assert.equal(canonicalJournalSource.template.panels.length,previous.template.panels.length,
    'Saved journal does not describe the archived garment panels')
  const stale=await send({op:'grade-run-clear',revision:opened.revision})
  assert.equal(stale.ok,false,'Stale revision must not clear the native catalog')
  assert.match(stale.error,/Stale document revision/)
  const afterStale=await success({op:'grade-run-status',revision:committed.revision})
  assert.equal(afterStale.persistedInProject,true)
  const tampered=structuredClone(prepared.gradeRun)
  tampered.gradedTemplates[0].panels[0].id='malicious-panel-id'
  const refused=await send({op:'grade-run-commit',revision:committed.revision,gradeRun:tampered})
  assert.equal(refused.ok,false,'Tampered six-size template must be refused')
  const retained=await success({op:'grade-run-status',revision:committed.revision})
  assert.equal(retained.persistedInProject,true)
  const reopened=await success({op:'open',project:persisted})
  const restoredStatus=await success({op:'grade-run-status',revision:reopened.revision})
  assert.equal(restoredStatus.persistedInProject,true)
  assert.equal(restoredStatus.catalog.gradedTemplates.length,6)
  const recovered=recoverNativeGradeRules20261025(reopened,restoredStatus)
  assert.equal(recovered.ok,true,recovered.reason)
  assert.deepEqual(recovered.pomSpecs,[pom])
  const cleared=await success({op:'grade-run-clear',revision:reopened.revision})
  assert.equal(cleared.gradeCatalogResult.persisted,true)
  const finalStatus=await success({op:'grade-run-status',revision:cleared.revision})
  assert.equal(finalStatus.persistedInProject,false)
  assert.equal(JSON.parse(readFileSync(path.join(output,'workspace','fitting-project.json'),'utf8')).grade_run,undefined)
  console.log(JSON.stringify({pass:true,sizes:6,atomicRevision:true,durableProject:true,
    reopened:true,legacyCompatibleBackup:true,gradeRulesRecoverable:true,pomSpecsRestored:1,
    staleCASRejected:true,tamperedCatalogRejected:true,detach:true,
    nativeHistorySidecarArchived:true,
    manufacturingApproved:false,output}))
}finally{
  try{process.kill(-child.pid,'SIGTERM')}catch{}
}
