/** Six genuinely DIFFERENT native sizes, compiled into 2D and 3D.
 * Only an isolated, disposable Rust service is used. User projects are untouched.
 */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from '../src/core/accumarkNativePointRuleSet20261023.js'
import {inspectNativeGradingWorkflow20261025} from '../src/core/nativeGradingWorkflowReadiness20261025.js'
import {createNativeGradingPOM20261025,inspectNativeGradingPOM20261025} from '../src/core/nativeGradingPOM20261025.js'
import {prepareNativeGradeCatalog20261025,verifyNativeGradeCatalog20261025} from '../src/core/nativeGradeCatalogBridge20261025.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-graded-activation-'))
const port=5449,api='http://127.0.0.1:'+port
const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
  cwd:root,detached:true,stdio:'ignore',env:{...process.env,
    EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:output,
    EXO_CLOTHCRAFT_GPU:'0',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')},
})
const query=async request=>{
  const response=await fetch(api+'/workspace',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(request)})
  return response.json()
}
const success=async request=>{
  const result=await query(request)
  assert.equal(result.ok,true,result.error||JSON.stringify(result).slice(0,550))
  return result.data
}
const sizes=['XS','S','M','L','XL','XXL']
const scales={XS:.97,S:.985,M:1,L:1.015,XL:1.03,XXL:1.12}
// The browser proposal uses null-prototype defensive dictionaries; Rust's
// JSON wire decoder yields ordinary objects. Compare exact JSON content.
const sameJson=(actual,expected,message)=>
  assert.deepEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(expected)),message)
const polygonMeasurements=template=>Object.fromEntries(template.panels.map(panel=>{
  const points=panel.polygon.points
  return [panel.id,{widthMm:(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0])))*1000,
    heightMm:(Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1])))*1000}]
}))
try{
  let ready=false
  for(let i=0;i<120;i++){
    try{if((await fetch(api+'/health',{signal:AbortSignal.timeout(700)})).ok){ready=true;break}}catch{}
    await new Promise(resolve=>setTimeout(resolve,200))
  }
  assert(ready,'Isolated Rust workspace failed to open')
  // Restore a legacy tight authored envelope from the original source format.
  // Only source Pattern metadata changes; every polygon point and seam stays intact.
  await success({op:'open',preset:'tshirt'})
  const presetSaved=await success({op:'save'})
  const legacy=structuredClone(presetSaved.project)
  for(const panel of legacy.template.panels){
    panel.pattern.width=1.0
    panel.pattern.height=0.66
  }
  legacy.state=null
  legacy.mesh_signature=null
  const initial=await success({op:'open',project:legacy})
  const before=await success({op:'save'})
  sameJson(before.project.template,legacy.template,'Legacy source metadata changed on open')
  assert(initial.template.panels.length>0)
  assert(initial.template.seams.length>0)
  let rules=createAccuMarkNativeRuleSet(initial).ruleSet
  assert(rules)
  for(const panel of initial.template.panels){
    const points=panel.polygon.points
    // Anchor at the lower source coordinate, keeping every grade nonnegative.
    const center=[0,1].map(axis=>Math.min(...points.map(p=>p[axis])))
    for(const size of sizes.filter(size=>size!=='M')){
      const factor=scales[size]
      for(let i=0;i<points.length;i++){
        const dxMm=Number(((points[i][0]-center[0])*(factor-1)*1000).toFixed(6))
        const dyMm=Number(((points[i][1]-center[1])*(factor-1)*1000).toFixed(6))
        const changed=editAccuMarkNativePointRule(initial,rules,
          {panelId:panel.id,pointIndex:i,size,dxMm,dyMm})
        assert(changed.ok,changed.reason)
        rules=changed.ruleSet
      }
    }
  }
  const readiness=inspectNativeGradingWorkflow20261025(initial,rules)
  assert(readiness.previewReady,JSON.stringify(readiness.issues).slice(0,800))
  assert(readiness.sewingReady,JSON.stringify(readiness.issues).slice(0,800))
  const chosen=initial.template.panels[0]
  const created=createNativeGradingPOM20261025(initial,rules,
    {panelId:chosen.id,fromPoint:0,toPoint:1,label:'Two-point measured drafting station'})
  assert(created.ok,created.reason)
  const rows=inspectNativeGradingPOM20261025(initial,rules,[created.definition]).rows
  assert.equal(rows.length,6)
  const distinct=new Set(rows.map(row=>Math.round(row.actualMm*1000)))
  assert(distinct.size>=4,'Grading must physically change POM measurements in different sizes')
  const pom={...created.definition,
    targetsMm:Object.fromEntries(rows.map(row=>[row.size,Math.round(row.actualMm*1000)/1000]))}
  const proposal=prepareNativeGradeCatalog20261025(initial,before.project,rules,{pomDefinitions:[pom]})
  assert(proposal.ok,proposal.reason)
  assert.equal(proposal.gradeRun.gradedTemplates.length,6)
  const committed=await success({op:'grade-run-commit',revision:initial.revision,gradeRun:proposal.gradeRun})
  assert.equal(committed.gradeCatalogResult.persisted,true)
  const status=await success({op:'grade-run-status',revision:committed.revision})
  const verified=verifyNativeGradeCatalog20261025(committed,rules,status,
    {durablySaved:true,pomDefinitions:[pom]})
  assert(verified.ok,verified.reason)
  const originalTemplate=structuredClone(committed.template)
  const metrics=polygonMeasurements(originalTemplate)
  const initialRevision=committed.revision
  let revision=initialRevision
  const checked=[]
  for(const size of sizes){
    const result=await success({op:'grade-run-activate',revision,size})
    revision=result.revision
    assert.equal(result.activeGradedSize,size)
    assert.equal(result.gradedSizePreview,true)
    assert.equal(result.manufacturingApproved,false)
    sameJson(result.template,proposal.gradeRun.gradedTemplates[sizes.indexOf(size)])
    assert(result.positions.length>0&&result.uv.length>0&&result.triangles.length>0,
      'Both displayed polygon and 3D cloth mesh must exist')
    assert.equal(result.canUndo,false)
    const width=polygonMeasurements(result.template)[chosen.id].widthMm
    assert(Math.abs(width-metrics[chosen.id].widthMm*scales[size])<.0003,
      size+' must use size-specific native physical polygon width')
    // A graded fitting scene must not silently rewrite the underlying source.
    const saved=await success({op:'save'})
    sameJson(saved.project.template,originalTemplate,'Size preview mutated authored source')
    for(const panel of saved.project.template.panels){
      assert.equal(panel.pattern.width,1.0,'Legacy authored width must persist')
      assert.equal(panel.pattern.height,0.66,'Legacy authored height must persist')
    }
    sameJson(saved.project.grade_run.gradedTemplates,proposal.gradeRun.gradedTemplates)
    const forbidden=await query({op:'grade-run-clear',revision})
    assert.equal(forbidden.ok,false,'Cannot detach catalog while sized garment is active')
    const next=await success({op:'grade-run-restore',revision})
    revision=next.revision
    assert.equal(next.activeGradedSize,null)
    sameJson(next.template,originalTemplate,'Restore did not recover exact source template')
    checked.push({size,widthMm:Math.round(width*1000)/1000,revision})
  }
  const persisted=JSON.parse(readFileSync(path.join(output,'workspace','fitting-project.json'),'utf8'))
  sameJson(persisted.template,originalTemplate)
  assert.equal(persisted.grade_run.gradedTemplates.length,6)
  const stale=await query({op:'grade-run-activate',revision:initialRevision,size:'XXL'})
  assert.equal(stale.ok,false,'Stale revision must be rejected after size changes')
  console.log(JSON.stringify({pass:true,legacySourceEnvelopeMm:{width:1000,height:660},
    maximumGradeFactor:scales.XXL,verifiedDifferentSizedGarments:checked,
    fullNative2D3DMeshes:true,sourcePreservedAfterEachSave:true,
    restoreExactAfterEveryActivation:true,pomVariesAcrossSizes:true,
    staleRevisionRejected:true,manufacturingApproved:false,output}))
}finally{
  try{process.kill(-child.pid,'SIGTERM')}catch{}
}
