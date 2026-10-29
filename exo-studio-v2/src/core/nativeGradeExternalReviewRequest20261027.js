import {inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'
import {sha256Bytes} from './sha256Bytes.js'

const SIZES=['XS','S','M','L','XL','XXL']
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?
  Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
const stringify=value=>JSON.stringify(canonical(value))
const hash=value=>sha256Bytes(new TextEncoder().encode(stringify(value)))
const same=(a,b)=>stringify(a)===stringify(b)
const fail=reason=>({ok:false,reason,externalApprovalVerified:false,
  manufacturerReady:false,manufacturingApproved:false,cuttingAuthorized:false})

/**
 * Creates a read-only, reproducible evidence REQUEST for an independent
 * physical cutter witness, receiving-CAD reviewer and sample measurement lab.
 * It is not a factory cutting export or independently signed approval.
 * No synthetic observations or reviewer credentials are generated.
 */
export function buildNativeGradeExternalReviewRequest20261027(snapshot,ruleSet,pomDefinitions=[],cutResponse,cutAudit){
  try{
    if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0||
      !Array.isArray(snapshot?.template?.panels)||!snapshot.template.panels.length||
      !same(ruleSet?.sizes,SIZES)||!ruleSet?.templateFingerprint)
      return fail('Current six-size native source and exact editable grading rules required')
    if(!cutAudit?.ok||cutAudit?.sourceRevision!==snapshot.revision||
      !same(cutAudit.sourceTemplate,snapshot.template)||!same(cutAudit.sourceRuleSet,ruleSet)||
      !same(cutAudit.verifiedSizes,SIZES)||cutAudit.authoritativeRust!==false||
      cutAudit.independentlyVerified!==false||cutAudit.cuttingAuthorized!==false)
      return fail('Current full-rule-pinned native engineering CUT inspection required')
    if(cutResponse?.format!=='exo-native-graded-cutlines.v1'||
      cutResponse.sourceRevision!==snapshot.revision||
      cutResponse.revision!==snapshot.revision||
      cutResponse.manufacturerReady!==false||cutResponse.cuttingAuthorized!==false||
      !Array.isArray(cutResponse.sizes)||cutResponse.sizes.length!==6||
      !SIZES.every((size,index)=>cutResponse.sizes[index]?.size===size))
      return fail('Rust returned stale, incomplete or unapproved-source-ambiguous CUT data')
    const measurements=inspectNativeGradingPOM20261025(snapshot,ruleSet,pomDefinitions)
    if(!pomDefinitions.length||!measurements.verified||measurements.rows.length!==6*pomDefinitions.length)
      return fail('Verified physical POM targets for every size required before requesting sample measurements')
    const identities=new Set(snapshot.template.panels.map(panel=>panel.id))
    if(identities.size!==snapshot.template.panels.length||!Array.from(identities).every(Boolean)||
      cutResponse.sizes.some(size=>!Array.isArray(size.panels)||size.panels.length!==identities.size||
        size.panels.some(panel=>!identities.has(panel.panel_id))))
      return fail('Physical CUT panel identities incomplete or inconsistent with source')
    // Bound the factory handoff size to avoid sending large, potentially
    // forged binary/base64 or a full simulation snapshot as a grading proof.
    const cutBytes=new TextEncoder().encode(stringify(cutResponse))
    if(cutBytes.length>8_000_000)return fail('Native CUT review JSON exceeds 8 MB limit')
    const manifest={schema:'exo.native-grade-external-review-request.v1',
      sourceRevision:snapshot.revision,templateFingerprint:ruleSet.templateFingerprint,
      sizes:[...SIZES],panelIds:[...identities],pomCount:pomDefinitions.length,
      sourceTemplateSha256:hash(snapshot.template),
      sourceRuleSetSha256:hash(ruleSet),
      fullRuleSetSha256:hash(ruleSet),
      pomDefinitionsSha256:hash(pomDefinitions),
      pomSha256:hash(pomDefinitions),
      nativeCutSha256:sha256Bytes(cutBytes),
      requiredIndependentEvidence:[
        'Actual full-scale CUT/STITCH outlines, allowances and physical notch stations for each size',
        'Returned licensed receiving-CAD artifacts and independently measured scale calibration',
        'Separate real sewn specimen per size, calibrated POM measurements and signed physical report',
        'Independent reviewer identities and verifiable signatures for source-pinned returned evidence',
      ],
      independentReviewCompleted:false,physicalCutApproved:false,
      receivingCadApproved:false,physicalSampleApproved:false,
      manufacturerReady:false,manufacturingApproved:false,cuttingAuthorized:false}
    const packet={manifest,sourceTemplate:canonical(snapshot.template),
      sourceRuleSet:canonical(ruleSet),pomDefinitions:canonical(pomDefinitions),
      nativeCutStudy:canonical(cutResponse)}
    const json=JSON.stringify(packet,null,2)+'\n'
    if(new TextEncoder().encode(json).length>10_000_000)return fail('Factory evidence request exceeds safe size limit')
    return {ok:true,manifest,packet,json,
      filename:`exo-native-grade-independent-review-r${snapshot.revision}-NOT-APPROVED.json`,
      externalApprovalVerified:false,manufacturerReady:false,
      manufacturingApproved:false,cuttingAuthorized:false,
      note:'This bundle requests independently returned, measured and signed artifacts; its hashes only detect drift and cannot prove physical factory work.'}
  }catch(error){return fail(`Unable to prepare independent grade review request: ${String(error?.message||error)}`)}
}
