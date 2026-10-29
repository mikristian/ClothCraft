import {proposeAccuMarkNativeGradedTemplateTransaction20261024} from './accumarkNativeGradedTemplateTransaction20261024.js'
import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {inspectAccuMarkNativeRuleSizeQA20261023,auditAccuMarkNativeRuleSizeQA20261023} from './accumarkNativeRuleSizeQA20261023.js'
import {inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'
import {inspectNativeGradeActivationEnvelope20261025} from './nativeGradeActivationEnvelope20261025.js'
import {inspectNativeGradedNotchAllowance20261025} from './nativeGradedNotchAllowance20261025.js'

const ORDER=['XS','S','M','L','XL','XXL']
const fail=reason=>({ok:false,reason,nativeCommitted:false,manufacturingApproved:false})
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const canonical=value=>Array.isArray(value)?value.map(canonical):
  value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
const samePOM=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
const compare=(a,b)=>{
  if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return false
  return a.every((v,i)=>typeof v==='number'&&Number.isFinite(v)&&typeof b[i]==='number'&&
    Number.isFinite(b[i])&&Math.abs(v-b[i])<1e-10)
}
// Browser-only unit fixtures historically omit every Rust Pattern envelope.
// A real native source with even one envelope must account for every panel:
// otherwise a mixed source could bypass the all-size activation preflight.
const nativeEnvelope=(snapshot,ruleSet,{allowNamedSizes=false}={})=>{
  const panels=snapshot?.template?.panels
  if(!Array.isArray(panels)||!panels.length)return fail('Missing native grading panels')
  if(!panels.some(panel=>panel?.pattern))return null
  if(panels.some(panel=>!panel?.pattern))
    return fail('Native size activation bounds: every panel requires an authored pattern envelope')
  const report=inspectNativeGradeActivationEnvelope20261025(snapshot,ruleSet,{allowNamedSizes})
  return report.ok?null:fail('Native size activation bounds: '+(report.issues[0]?.message||report.reason))
}

/** Builds the complete six-size native catalog, without opening or replacing
 * the Rust session. The caller must submit it once under a strict revision CAS.
 */
export function prepareNativeGradeCatalog20261025(snapshot,savedProject,ruleSet,{pomDefinitions=[]}={}){
  try{
    const named=Array.isArray(ruleSet?.sizes)&&(!equal(ruleSet.sizes,ORDER)||
      Object.keys(ruleSet.sizeEvolution?.correspondences||{}).length>0)
    const sizes=named?ruleSet.sizes:ORDER
    const correspondences=ruleSet?.sizeEvolution?.correspondences||{}
    if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0||
      !savedProject?.template||!Array.isArray(ruleSet?.sizes)||
      (named&&(sizes.length<2||sizes.length>24||!sizes.includes(ruleSet.baseSize)||
        new Set(sizes).size!==sizes.length||sizes.some(s=>typeof s!=='string'||!/^[A-Za-z0-9-]{1,24}$/.test(s)))))
      return fail('Expected a complete safe 2–24 named-size run and current saved native garment')
    if(Object.keys(correspondences).length>96||Object.entries(correspondences).some(([alias,target])=>
      !/^[A-Za-z0-9-]{1,24}$/.test(alias)||sizes.includes(alias)||!sizes.includes(target)))
      return fail('Native correspondence aliases must be distinct safe labels with a canonical target')
    // Saved project must describe the EXACT on-screen Rust source. A saved
    // revision is captured separately because FittingProject has no revision.
    if(!equal(savedProject.template,snapshot.template))
      return fail('Native source changed while capturing the graded catalog')
    const qa=named?auditAccuMarkNativeRuleSizeQA20261023(snapshot,ruleSet,{allowNamedSizes:true}):
      inspectAccuMarkNativeRuleSizeQA20261023(snapshot,ruleSet)
    if(!qa.ok)return fail('All-size physical contour QA must pass before a native catalog commit')
    const measured=inspectNativeGradingPOM20261025(snapshot,ruleSet,pomDefinitions,{allowNamedSizes:named})
    if(measured.reason)return fail('Graded POM definitions invalid: '+measured.reason)
    // Rust's qualified persisted POM kernel supports an explicitly ordered
    // clockwise material-boundary path across multiple named edges, in
    // addition to individual cubic sew edges and straight anchor distances.
    // The native six-size numerical acceptance RPC must still independently
    // measure the committed catalog before any industrial handoff.
    if(pomDefinitions.some(definition=>!['anchor-distance','sewline-edge','sewline-path'].includes(definition.kind)))
      return fail('Unsupported native point-of-measure kind')

    // A save is not useful if Rust can never compile the sized fitting scene.
    // Older UI test fixtures without native Pattern envelopes remain editable,
    // but only a real native project can be asserted activation-ready.
    const envelopeError=nativeEnvelope(snapshot,ruleSet,{allowNamedSizes:named})
    if(envelopeError)return envelopeError
    const proposal=proposeAccuMarkNativeGradedTemplateTransaction20261024({
      template:savedProject.template,revision:snapshot.revision,
    },ruleSet,{selectedSize:ruleSet.baseSize,allowNamedSizes:named})
    if(!proposal.ok)return fail(proposal.reason||'Authoritative six-size polygon validation blocked')
    // Source-authored industrial edge annotations must remain physically
    // stationed across every canonical size before the Rust CAS. A project
    // with no authored edge annotations is not represented as CUT-qualified.
    const annotated=snapshot.template.panels.some(p=>
      p.polygon?.seam_allowances!==undefined||p.polygon?.notches!==undefined)
    if(annotated&&named){
      const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet.baseSize})
      if(!compiled.ok)return fail('Native graded annotation compilation rejected: '+compiled.reason)
      const marks=inspectNativeGradedNotchAllowance20261025(snapshot,compiled,
        {namedSizes:sizes})
      if(!marks.ok)return fail('Named-size physical allowance/notch QA rejected: '+
        (marks.issues[0]?.code||'incomplete industrial edge evidence'))
    }
    return {ok:true,sourceRevision:snapshot.revision,
      gradeRun:{schemaVersion:named?2:1,sizes:[...sizes],baseSize:ruleSet.baseSize,
        baseTemplate:proposal.originalNativeTemplate,
        gradedTemplates:sizes.map(size=>proposal.templatesBySize[size]),
        ...(named?{sizeCorrespondence:{...(ruleSet.sizeEvolution?.correspondences||{})}}:{}),
        pomSpecs:pomDefinitions},
      manufacturingApproved:false,nativeCommitted:false}
  }catch(error){return fail(String(error.message||error))}
}

/** Only accept a live Rust report if every current polygon for each size
 * still equals the independent point rules. Merely checking source geometry
 * fingerprint would not detect unsaved edits to the grade offsets.
 */
export function verifyNativeGradeCatalog20261025(snapshot,ruleSet,status,{durablySaved=false,pomDefinitions=null}={}){
  try{
    const catalog=status?.catalog
    const sizes=ruleSet?.sizes
    const named=Array.isArray(sizes)&&(!equal(sizes,ORDER)||
      Object.keys(ruleSet.sizeEvolution?.correspondences||{}).length>0)
    if(!durablySaved||status?.persistedInProject!==true||!catalog||
      !Array.isArray(sizes)||!equal(catalog.sizes,sizes)||
      catalog.schemaVersion!==(named?2:1)||
      (named&&!samePOM(catalog.sizeCorrespondence||{},ruleSet.sizeEvolution?.correspondences||{}))||
      status.revision!==snapshot?.revision||catalog.baseSize!==ruleSet.baseSize)
      return fail('Native six-size catalog is not durably committed to the current project')
    const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet.baseSize})
    if(!compiled.ok)return fail(compiled.reason)
    const envelopeError=nativeEnvelope(snapshot,ruleSet,{allowNamedSizes:named})
    if(envelopeError)return envelopeError
    if(!Array.isArray(catalog.gradedTemplates)||catalog.gradedTemplates.length!==sizes.length)return fail('Incomplete native graded templates')
    // A native catalog can be transferred without the browser's editable POM
    // sidecar. Validate the persisted specs themselves before trusting them.
    const persistedPOM=inspectNativeGradingPOM20261025(snapshot,ruleSet,catalog.pomSpecs||[],{allowNamedSizes:named})
    if(persistedPOM.reason)return fail('Saved native POM specifications invalid: '+persistedPOM.reason)
    if(pomDefinitions!==null&&!samePOM(catalog.pomSpecs||[],pomDefinitions))
      return fail('Edited POM specifications have not been saved to the native catalog')
    const sourcePanels=snapshot.template.panels
    if(!equal(catalog.baseTemplate,snapshot.template))return fail('Saved native grade source no longer matches the garment')
    for(let i=0;i<sizes.length;i++){
      const candidate=catalog.gradedTemplates[i]
      if(!Array.isArray(candidate?.panels)||candidate.panels.length!==sourcePanels.length)
        return fail('Incomplete native graded panel inventory')
      for(let j=0;j<sourcePanels.length;j++){
        const panel=candidate.panels[j],original=sourcePanels[j]
        const graded=compiled.byPanel[original.id]?.sizeRun[sizes[i]]?.polygon
        if(!graded||panel?.id!==original.id||!panel.polygon||
          !Array.isArray(panel.polygon.points)||
          panel.polygon.points.length!==graded.points.length||
          !panel.polygon.points.every((p,k)=>compare(p,graded.points[k]))||
          !equal({...panel,polygon:null},{...original,polygon:null})||
          !equal({...candidate,panels:null},{...snapshot.template,panels:null})||
          !equal({...panel.polygon,points:null},{...graded,points:null}))
          return fail(`Native size ${sizes[i]} no longer matches draft grade rules`)
      }
    }
    return {ok:true,persisted:true,sourceRevision:snapshot.revision,
      templateFingerprint:ruleSet.templateFingerprint,sizes:[...sizes],
      // Capture the exact independently compared source, not the editable
      // rule-set object. Fingerprints alone omit point offsets and allow a
      // stale status badge after a per-size grade edit.
      sourceRuleSet:canonical(ruleSet),sourceTemplate:canonical(snapshot.template),
      nativeCommitted:true,sizeActivated:false,
      pomSpecs:catalog.pomSpecs||[],manufacturingApproved:false}
  }catch(error){return fail(String(error.message||error))}
}

/** UI badge contract: only a status returned from an exact saved native
 * geometry comparison can describe the currently edited draft as persisted.
 * This intentionally does not represent factory/CUT approval. */
export function isVerifiedNativeGradeStatusCurrent20261026(status,snapshot,ruleSet,pomDefinitions=[]){
  return Boolean(status?.ok===true&&status?.persisted===true&&
    status?.nativeCommitted===true&&status.sourceRevision===snapshot?.revision&&
    ruleSet?.templateFingerprint&&status.templateFingerprint===ruleSet.templateFingerprint&&
    equal(status.sizes,ruleSet.sizes)&&
    status.sourceRuleSet!=null&&samePOM(status.sourceRuleSet,ruleSet)&&
    status.sourceTemplate!=null&&samePOM(status.sourceTemplate,snapshot?.template)&&
    samePOM(status.pomSpecs,pomDefinitions))
}

/** Reconstruct editable per-point grading rules from a SAVED Rust catalog.
 * This makes named-size grading survive app storage resets or project transfer
 * instead of relying on browser localStorage as its only source of truth.
 */
export function recoverNativeGradeRules20261025(snapshot,status){
  try{
    const catalog=status?.catalog
    if(status?.persistedInProject!==true||status.revision!==snapshot?.revision||
      !catalog||!Array.isArray(catalog.sizes)||!Array.isArray(catalog.gradedTemplates)||
      catalog.gradedTemplates.length!==catalog.sizes.length||
      !equal(catalog.baseTemplate,snapshot.template))
      return fail('No matching saved native six-size catalog')
    const created=createAccuMarkNativeRuleSet(snapshot,{sizes:catalog.sizes,baseSize:catalog.baseSize})
    if(!created.ok)return fail(created.reason)
    const rules=created.ruleSet
    for(let i=0;i<catalog.sizes.length;i++){
      const size=catalog.sizes[i],template=catalog.gradedTemplates[i]
      for(const panel of snapshot.template.panels){
        const graded=template?.panels?.find(p=>p.id===panel.id)
        const points=graded?.polygon?.points,base=panel?.polygon?.points
        if(!Array.isArray(points)||!Array.isArray(base)||points.length!==base.length)
          return fail('Native saved grade has missing source point references')
        rules.panels[panel.id].pointOffsetsMm[size]=points.map((point,j)=>{
          if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))
            throw Error('Native saved grade has invalid points')
          return point.map((value,k)=>(value-base[j][k])*1000)
        })
      }
    }
    if(catalog.schemaVersion===2)rules.sizeEvolution={schema:'exo.size-evolution.v1',
      correspondences:{...(catalog.sizeCorrespondence||{})},groups:{}}
    const checked=verifyNativeGradeCatalog20261025(snapshot,rules,status,{durablySaved:true})
    if(!checked.ok)return fail(checked.reason)
    return {ok:true,ruleSet:rules,pomSpecs:catalog.pomSpecs||[],
      catalog:checked,manufacturingApproved:false}
  }catch(error){return fail(String(error.message||error))}
}
